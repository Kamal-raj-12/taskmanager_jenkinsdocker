import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Server } from "socket.io";
import User from "./models/User.js";
import Project from "./models/Project.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taskmanager";
const JWT_SECRET = process.env.JWT_SECRET || "secretkey";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

const corsOptions = CORS_ORIGIN === "*" ? { origin: true } : { origin: CORS_ORIGIN };

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

// --- MongoDB Connection ---
mongoose.connect(MONGO_URI);
mongoose.connection.once("open", () => console.log("✅ MongoDB connected"));

// --- Middleware to verify JWT ---
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// --- Auth Routes ---
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

    const colors = [
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-pink-600',
      'from-green-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-yellow-500 to-orange-600',
      'from-pink-500 to-rose-600'
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const user = await User.create({ 
      name, 
      email, 
      password: hashed, 
      initials,
      role: role || 'employee',
      color
    });
    
    res.json({ message: "Signup successful", user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      initials: user.initials,
      color: user.color
    }});
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "24h" });
    res.json({
      message: "Login successful",
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        initials: user.initials,
        color: user.color
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --- Get all users (for admin) ---
app.get("/api/users", verifyToken, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ data: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Get all employees for workload calculation (admin) ---
app.get("/api/all-employee-tasks", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    // Get ALL projects with tasks (not filtered by admin)
    const allProjects = await Project.find().populate('tasks.assignedTo', 'name email initials color role').populate('createdBy', 'name email');
    res.json({ data: allProjects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Project Routes ---
app.get("/api/projects", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    let projects;
    
    if (user.role === 'admin') {
      // Admin only sees their own created projects
      projects = await Project.find({ createdBy: req.userId }).populate('tasks.assignedTo', 'name email initials color role').populate('createdBy', 'name email');
    } else {
      // Employee sees all projects where they're assigned to at least one task
      projects = await Project.find({
        'tasks.assignedTo': req.userId
      }).populate('tasks.assignedTo', 'name email initials color role').populate('createdBy', 'name email');
    }
    
    res.json({ data: projects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/projects", verifyToken, async (req, res) => {
  try {
    const projectData = {
      ...req.body,
      createdBy: req.userId
    };
    const project = await Project.create(projectData);
    const populated = await Project.findById(project._id).populate('tasks.assignedTo', 'name email initials color role').populate('createdBy', 'name email');
    
    res.json({ data: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/projects/:id", verifyToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    ).populate('tasks.assignedTo', 'name email initials color role').populate('createdBy', 'name email');
    
    res.json({ data: project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/projects/:id", verifyToken, async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Task Routes ---
app.post("/api/projects/:id/tasks", verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    project.tasks.push(req.body);
    await project.save();
    
    const populated = await Project.findById(project._id).populate('tasks.assignedTo', 'name email initials color role').populate('createdBy', 'name email');
    
    res.json({ data: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/projects/:projectId/tasks/:taskId", verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    const task = project.tasks.id(req.params.taskId);
    
    Object.assign(task, req.body);
    await project.save();
    
    const populated = await Project.findById(project._id).populate('tasks.assignedTo', 'name email initials color role').populate('createdBy', 'name email');
    
    res.json({ data: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/projects/:projectId/tasks/:taskId", verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    project.tasks.pull(req.params.taskId);
    await project.save();
    
    const populated = await Project.findById(project._id).populate('tasks.assignedTo', 'name email initials color role').populate('createdBy', 'name email');
    
    res.json({ data: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Task Messages ---
app.post("/api/projects/:projectId/tasks/:taskId/messages", verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    const task = project.tasks.id(req.params.taskId);
    
    task.messages.push(req.body);
    await project.save();
    
    const populated = await Project.findById(project._id).populate('tasks.assignedTo', 'name email initials color role').populate('createdBy', 'name email');
    
    res.json({ data: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Task Files ---
app.post("/api/projects/:projectId/tasks/:taskId/files", verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    const task = project.tasks.id(req.params.taskId);
    
    task.files.push(...req.body.files);
    await project.save();
    
    const populated = await Project.findById(project._id).populate('tasks.assignedTo', 'name email initials color role').populate('createdBy', 'name email');
    
    res.json({ data: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Socket.IO Realtime Setup ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// --- Start Server ---
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));