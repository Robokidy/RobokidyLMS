require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const connectDB = require("./config/db");
const User = require("./models/User");

const requiredEnv = ["MONGODB_URI", "JWT_SECRET"];
const recommendedEnv = ["ADMIN_USERNAME", "ADMIN_PASSWORD", "NODE_ENV", "JUDGE0_API_KEY", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
for (const name of requiredEnv) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}
for (const name of recommendedEnv) {
  if (!process.env[name]) console.warn(`Missing recommended environment variable: ${name}`);
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason?.message || reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error.stack || error.message);
  if (!["MongoNetworkError", "MongoServerSelectionError"].includes(error.name)) {
    process.exit(1);
  }
});

const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const codeRoutes = require("./routes/codeRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const courseTrackRoutes = require("./routes/courseTrackRoutes");
const contentRoutes = require("./routes/contentRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const materialRoutes = require("./routes/materialRoutes");
const academicReportRoutes = require("./routes/academicReportRoutes");

function optionalRoute(path) {
  try {
    return require(path);
  } catch (error) {
    console.warn(`Skipping optional route ${path}: ${error.message}`);
    return null;
  }
}

const testRoutes = optionalRoute("./routes/testRoutes");
const examRoutes = optionalRoute("./routes/examRoutes");
const reportRoutes = optionalRoute("./routes/reportRoutes");
const teacherReportsRoutes = optionalRoute("./routes/teacherReportsRoutes");
const adminAnalyticsRoutes = optionalRoute("./routes/adminAnalyticsRoutes");
const codingSubmissionRoutes = optionalRoute("./routes/codingSubmissionRoutes");
const feeRoutes = optionalRoute("./routes/feeRoutes");

const app = express();
const configuredOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  ...configuredOrigins,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
]);

app.use(cors({
  origin(origin, callback) {
    let hostname = "";
    try {
      hostname = origin ? new URL(origin).hostname : "";
    } catch {
      return callback(new Error("CORS origin not allowed"));
    }
    if (!origin || allowedOrigins.has(origin) || /\.vercel\.app$/.test(hostname)) {
      return callback(null, true);
    }
    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true
}));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/course-tracks", courseTrackRoutes);
app.use("/api/code", codeRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/reports", academicReportRoutes);
if (feeRoutes) app.use("/api/fees", feeRoutes);
if (examRoutes) app.use("/api/exams", examRoutes);
if (testRoutes) app.use("/api/tests", testRoutes);
if (teacherReportsRoutes) app.use("/api/tests", teacherReportsRoutes);
if (adminAnalyticsRoutes) app.use("/api/tests", adminAnalyticsRoutes);
if (codingSubmissionRoutes) app.use("/api/tests", codingSubmissionRoutes);
if (reportRoutes) app.use("/api/reports", reportRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found", path: req.originalUrl });
});

app.use((error, _req, res, _next) => {
  console.error(error.stack || error.message);
  res.status(error.message === "CORS origin not allowed" ? 403 : 500).json({
    message: error.message === "CORS origin not allowed" ? "CORS origin not allowed" : "Server unavailable"
  });
});

const PORT = process.env.PORT || 5000;

async function ensureDefaultCtoAccount() {
  const existing = await User.findOne({ $or: [{ role: "cto" }, { username: "cto" }, { email: "cto@robokidy.com" }] });
  if (existing) return;
  await User.create({
    username: "cto",
    email: "cto@robokidy.com",
    password: "CtoRobokidy",
    role: "cto",
    fullName: "Chief Technology Officer",
    active: true,
    firstLogin: true
  });
  console.log("Default CTO account created");
}

connectDB()
  .then(async () => {
    await ensureDefaultCtoAccount();
    const server = app.listen(PORT, () => console.log(`API running on ${PORT}`));
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Stop the existing API process or set PORT to another value.`);
        process.exit(1);
      }
      throw error;
    });
  })
  .catch((error) => {
    console.error("Failed to start API:", error.message);
    process.exit(1);
  });
