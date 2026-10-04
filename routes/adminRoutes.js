const express = require("express");
const Course = require("../models/Course");
const Question = require("../models/Question");
const Result = require("../models/Result");
const Student = require("../models/Student");
const History = require("../models/History");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(verifyToken, requireRole("admin"));

// ---------- COURSES (trainings) ----------
router.post("/courses", async (req, res) => {
  try {
    const { title, description, trainingHours } = req.body;
    if (!title || !trainingHours) {
      return res.status(400).json({ message: "Title and trainingHours are required" });
    }
    const course = await Course.create({
      title,
      description,
      trainingHours,
      createdBy: req.user.id,
    });
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/courses", async (req, res) => {
  const courses = await Course.find().sort({ createdAt: -1 });
  res.json(courses);
});

router.patch("/courses/:id", async (req, res) => {
  try {
    const { title, description, trainingHours, isActive } = req.body;
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { title, description, trainingHours, isActive },
      { new: true, runValidators: true }
    );
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/courses/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const [questionCount, results] = await Promise.all([
      Question.countDocuments({ course: course._id }),
      Result.find({ course: course._id }).populate("student", "name email"),
    ]);

    // Snapshot everything before deleting so the record survives in History.
    await History.create({
      courseTitle: course.title,
      courseDescription: course.description,
      trainingHours: course.trainingHours,
      totalQuestions: questionCount,
      courseCreatedAt: course.createdAt,
      deletedAt: new Date(),
      students: results.map((r) => ({
        name: r.student?.name || "Unknown",
        email: r.student?.email || "Unknown",
        score: r.score,
        totalQuestions: r.totalQuestions,
        submitted: r.submitted,
        submittedAt: r.submittedAt,
      })),
    });

    await Promise.all([
      Question.deleteMany({ course: course._id }),
      Result.deleteMany({ course: course._id }),
      Course.findByIdAndDelete(course._id),
    ]);

    res.json({ message: "Project deleted. Full history preserved in the History tab." });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ---------- QUESTIONS ----------
router.post("/questions", async (req, res) => {
  try {
    const { course, questionText, options, correctOptionIndex } = req.body;
    if (!course || !questionText || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: "course, questionText and at least 2 options are required" });
    }
    if (
      correctOptionIndex === undefined ||
      correctOptionIndex < 0 ||
      correctOptionIndex >= options.length
    ) {
      return res.status(400).json({ message: "correctOptionIndex must point to a valid option" });
    }
    const question = await Question.create({ course, questionText, options, correctOptionIndex });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/questions/:courseId", async (req, res) => {
  const questions = await Question.find({ course: req.params.courseId }).sort({ createdAt: 1 });
  res.json(questions); // admin view includes correctOptionIndex
});

router.put("/questions/:id", async (req, res) => {
  try {
    const { questionText, options, correctOptionIndex } = req.body;
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { questionText, options, correctOptionIndex },
      { new: true, runValidators: true }
    );
    if (!question) return res.status(404).json({ message: "Question not found" });
    res.json(question);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/questions/:id", async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
  res.json({ message: "Question deleted" });
});

// ---------- RESULTS ----------
router.get("/results/:courseId", async (req, res) => {
  const results = await Result.find({ course: req.params.courseId, submitted: true })
    .populate("student", "name email")
    .sort({ submittedAt: -1 });
  res.json(results);
});

router.get("/students", async (req, res) => {
  const students = await Student.find().select("-password").sort({ createdAt: -1 });
  res.json(students);
});

// ---------- HISTORY (archived/deleted projects, kept with full data + dates) ----------
router.get("/history", async (req, res) => {
  const history = await History.find().sort({ deletedAt: -1 });
  res.json(history);
});

router.get("/history/:id", async (req, res) => {
  const record = await History.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "History record not found" });
  res.json(record);
});

module.exports = router;
