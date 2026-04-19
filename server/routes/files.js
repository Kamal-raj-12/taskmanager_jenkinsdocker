import express from "express";
import multer from "multer";
import Project from "../models/Project.js";

const router = express.Router();

// Storage Settings
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const name = Date.now() + "-" + file.originalname;
    cb(null, name);
  },
});

const upload = multer({ storage });

// Upload File
router.post("/:projectId/tasks/:taskId/upload", upload.single("file"), async (req, res) => {
  try {
    const { projectId, taskId } = req.params;

    const project = await Project.findOne({ id: Number(projectId) });

    if (!project) return res.status(404).json({ message: "Project not found" });

    const task = project.tasks.find((t) => t.id === Number(taskId));
    if (!task) return res.status(404).json({ message: "Task not found" });

    const file = {
      id: Date.now(),
      name: req.file.filename,
      size: req.file.size,
      type: req.file.mimetype,
      uploadedBy: req.body.userId,
      uploadedByName: req.body.userName,
      timestamp: new Date().toISOString(),
    };

    task.files.push(file);
    await project.save();

    res.json({ message: "File uploaded", file });
  } catch (error) {
    res.status(500).json(error);
  }
});

export default router;
