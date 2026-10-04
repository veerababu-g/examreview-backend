const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Student = require("../models/Student");

const router = express.Router();

function signToken(id, role) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "8h" });
}

// ---------- ADMIN LOGIN (only one admin ever exists, created via seedAdmin.js) ----------
router.post("/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(admin._id, "admin");
    res.json({ token, admin: { id: admin._id, username: admin.username } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ---------- STUDENT REGISTER (free signup) ----------
router.post("/student/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    const existing = await Student.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "An account with this email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const student = await Student.create({ name, email: email.toLowerCase(), password: hashed });

    const token = signToken(student._id, "student");
    res.status(201).json({ token, student: { id: student._id, name: student.name, email: student.email } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ---------- STUDENT LOGIN ----------
router.post("/student/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const student = await Student.findOne({ email: email.toLowerCase() });
    if (!student) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, student.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(student._id, "student");
    res.json({ token, student: { id: student._id, name: student.name, email: student.email } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
