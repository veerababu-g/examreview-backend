const express = require("express");
const Course = require("../models/Course");
const Question = require("../models/Question");
const Result = require("../models/Result");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(verifyToken, requireRole("student"));

// List active courses/trainings available for exam
router.get("/courses", async (req, res) => {
  const courses = await Course.find({ isActive: true }).sort({ createdAt: -1 });
  res.json(courses);
});

// Get exam questions for a course - correct answer is NEVER sent to the student
router.get("/exam/:courseId", async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course || !course.isActive) {
      return res.status(404).json({ message: "Exam not available" });
    }

    let result = await Result.findOne({ student: req.user.id, course: course._id });
    if (result && result.submitted) {
      return res.status(403).json({ message: "You have already submitted this exam" });
    }
    if (!result) {
      result = await Result.create({ student: req.user.id, course: course._id, answers: [] });
    }

    const questions = await Question.find({ course: course._id }).select(
      "-correctOptionIndex"
    );

    // Merge in any already-locked answers so a refresh doesn't lose selections
    const lockedMap = {};
    result.answers.forEach((a) => {
      lockedMap[a.question.toString()] = a.selectedOptionIndex;
    });

    res.json({
      course: { id: course._id, title: course.title, trainingHours: course.trainingHours },
      questions: questions.map((q) => ({
        id: q._id,
        questionText: q.questionText,
        options: q.options,
        lockedAnswer: lockedMap[q._id.toString()] ?? null,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Lock in an answer for a single question. Once saved it CANNOT be changed.
router.post("/exam/:courseId/answer", async (req, res) => {
  try {
    const { questionId, selectedOptionIndex } = req.body;
    if (!questionId || selectedOptionIndex === undefined) {
      return res.status(400).json({ message: "questionId and selectedOptionIndex are required" });
    }

    const result = await Result.findOne({ student: req.user.id, course: req.params.courseId });
    if (!result) return res.status(404).json({ message: "Exam attempt not found. Load the exam first." });
    if (result.submitted) return res.status(403).json({ message: "Exam already submitted" });

    const alreadyAnswered = result.answers.find((a) => a.question.toString() === questionId);
    if (alreadyAnswered) {
      return res.status(409).json({
        message: "This question is already locked and cannot be changed",
        selectedOptionIndex: alreadyAnswered.selectedOptionIndex,
      });
    }

    const question = await Question.findById(questionId);
    if (!question || question.course.toString() !== req.params.courseId) {
      return res.status(404).json({ message: "Question not found for this exam" });
    }
    if (selectedOptionIndex < 0 || selectedOptionIndex >= question.options.length) {
      return res.status(400).json({ message: "Invalid option index" });
    }

    result.answers.push({ question: questionId, selectedOptionIndex });
    await result.save();

    res.json({ message: "Answer locked", questionId, selectedOptionIndex });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Final submission - calculates score and DECLARES the result
router.post("/exam/:courseId/submit", async (req, res) => {
  try {
    const result = await Result.findOne({ student: req.user.id, course: req.params.courseId });
    if (!result) return res.status(404).json({ message: "Exam attempt not found" });
    if (result.submitted) return res.status(403).json({ message: "Exam already submitted" });

    const questions = await Question.find({ course: req.params.courseId });
    const correctMap = {};
    questions.forEach((q) => (correctMap[q._id.toString()] = q.correctOptionIndex));

    let score = 0;
    result.answers.forEach((a) => {
      if (correctMap[a.question.toString()] === a.selectedOptionIndex) score += 1;
    });

    result.submitted = true;
    result.score = score;
    result.totalQuestions = questions.length;
    result.submittedAt = new Date();
    await result.save();

    res.json({
      message: "Exam submitted. Result declared.",
      score,
      totalQuestions: questions.length,
      answeredQuestions: result.answers.length,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// View own declared result
router.get("/result/:courseId", async (req, res) => {
  const result = await Result.findOne({ student: req.user.id, course: req.params.courseId }).populate(
    "course",
    "title trainingHours"
  );
  if (!result || !result.submitted) {
    return res.status(404).json({ message: "Result not declared yet" });
  }
  res.json(result);
});

module.exports = router;
