import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'in-progress', 'completed'] },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sequenceOrder: { type: Number, default: 1 },
  dueDate: { type: Date },
  completedAt: { type: Date },
  messages: [{
    userId: String,
    userName: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
  }],
  files: [{
    name: String,
    size: Number,
    type: String,
    uploadedBy: String,
    uploadedByName: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tasks: [taskSchema]
}, { timestamps: true });

export default mongoose.model('Project', projectSchema);