const mongoose = require("mongoose");

// One document per (student, course) attempt.
const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    selectedOptionIndex: { type: Number, required: true },
    // Once an answer is written here it is considered LOCKED - the update
    // route refuses to overwrite an existing answer for the same question.
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    answers: { type: [answerSchema], default: [] },
    submitted: { type: Boolean, default: false }, // result is declared only once this is true
    score: { type: Number, default: null },
    totalQuestions: { type: Number, default: 0 },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// A student can only have ONE attempt per course
resultSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model("Result", resultSchema);
