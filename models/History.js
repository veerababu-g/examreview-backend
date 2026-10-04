const mongoose = require("mongoose");

// A snapshot of a student's mock/exam performance at the time the course was archived.
const archivedStudentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    score: { type: Number, default: null },
    totalQuestions: { type: Number, default: 0 },
    submitted: { type: Boolean, default: false },
    submittedAt: { type: Date, default: null },
  },
  { _id: false }
);

// Created automatically whenever an admin deletes a course/project.
// Keeps the project's details, every student's mock result, and the relevant dates,
// even though the live Course/Question/Result documents are removed.
const historySchema = new mongoose.Schema(
  {
    courseTitle: { type: String, required: true },
    courseDescription: { type: String, default: "" },
    trainingHours: { type: Number, required: true },
    totalQuestions: { type: Number, default: 0 },
    courseCreatedAt: { type: Date, required: true }, // when the project was originally created
    deletedAt: { type: Date, default: Date.now }, // when the project was deleted/archived
    students: { type: [archivedStudentSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("History", historySchema);
