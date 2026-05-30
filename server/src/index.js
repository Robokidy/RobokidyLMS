require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/db");

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

const app = express();
app.use(cors());
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
app.use("/api/content", contentRoutes);
app.use("/api/assessments", assessmentRoutes);
if (examRoutes) app.use("/api/exams", examRoutes);
if (testRoutes) app.use("/api/tests", testRoutes);
if (teacherReportsRoutes) app.use("/api/tests", teacherReportsRoutes);
if (adminAnalyticsRoutes) app.use("/api/tests", adminAnalyticsRoutes);
if (codingSubmissionRoutes) app.use("/api/tests", codingSubmissionRoutes);
if (reportRoutes) app.use("/api/reports", reportRoutes);

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
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
