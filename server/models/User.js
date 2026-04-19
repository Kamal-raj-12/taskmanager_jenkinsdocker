import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  initials: { type: String, required: true },
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
  color: { type: String, default: 'from-blue-500 to-indigo-600' }
}, {
  timestamps: true
});

export default mongoose.model("User", userSchema);