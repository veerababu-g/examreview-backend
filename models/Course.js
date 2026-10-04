const mongoose = require("mongoose");

// A "Course" represents the training program the exam belongs to,
// e.g. "Full Stack Web Development" with a set training duration.
const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    trainingHours: { type: Number, required: true, min: 1 }, // which training hour / total duration of the course
    isActive: { type: Boolean, default: true }, // admin can open/close exam for this course
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
