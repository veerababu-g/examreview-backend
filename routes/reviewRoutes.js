const express = require("express");
const Question = require("../models/Question");
const Result = require("../models/Result");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(verifyToken, requireRole("student"));

// Set SHOW_CORRECT_ANSWERS=false in .env to show ONLY what the student chose.
const SHOW_CORRECT = process.env.SHOW_CORRECT_ANSWERS !== "false";

// List every exam this student has submitted
router.get("/exams", async (req, res) => {
  try {
    const results = await Result.find({ student: req.user.id, submitted: true })
      .populate("course", "title description trainingHours")
      .sort({ submittedAt: -1 });

    res.json(
      results
        .filter((r) => r.course) // skip if the course no longer exists
        .map((r) => ({
          courseId: r.course._id,
          title: r.course.title,
          description: r.course.description,
          trainingHours: r.course.trainingHours,
          score: r.score,
          totalQuestions: r.totalQuestions,
          submittedAt: r.submittedAt,
        }))
    );
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// One exam: every question + what THIS student answered
router.get("/exams/:courseId", async (req, res) => {
  try {
    const result = await Result.findOne({
      student: req.user.id,
      course: req.params.courseId,
      submitted: true,
    }).populate("course", "title trainingHours");

    if (!result || !result.course) {
      return res.status(404).json({ message: "No submitted exam found" });
    }

    const questions = await Question.find({ course: req.params.courseId }).sort({ _id: 1 });

    const answerMap = {};
    result.answers.forEach((a) => {
      answerMap[a.question.toString()] = a.selectedOptionIndex;
    });

    res.json({
      course: {
        id: result.course._id,
        title: result.course.title,
        trainingHours: result.course.trainingHours,
      },
      score: result.score,
      totalQuestions: result.totalQuestions,
      submittedAt: result.submittedAt,
      showCorrect: SHOW_CORRECT,
      questions: questions.map((q) => {
        const selected = answerMap[q._id.toString()];
        const answered = selected !== undefined;
        const item = {
          id: q._id,
          questionText: q.questionText,
          options: q.options,
          selectedOptionIndex: answered ? selected : null,
        };
        if (SHOW_CORRECT) {
          item.correctOptionIndex = q.correctOptionIndex;
          item.isCorrect = answered && selected === q.correctOptionIndex;
        }
        return item;
      }),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
