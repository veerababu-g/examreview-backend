require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const reviewRoutes = require("./routes/reviewRoutes");


const app = express();
const dns = require("dns")


dns.setServers(['8.8.8.8','1.1.1.1'])


connectDB();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://examportal-ashy.vercel.app",
  ...(process.env.REVIEW_ORIGIN
    ? process.env.REVIEW_ORIGIN
        .split(",")
        .map((origin) => origin.trim())
    : []),
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests such as server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/review", reviewRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;