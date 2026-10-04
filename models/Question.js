const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    questionText: { type: String, required: true, trim: true },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 2,
        message: "A question needs at least 2 options",
      },
    },
    correctOptionIndex: { type: Number, required: true }, // NEVER exposed to student routes
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);
