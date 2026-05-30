const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { auth, requireRole } = require("../middleware/auth");
const User = require("../models/User");
const Course = require("../models/Course");
const StudentProgress = require("../models/StudentProgress");
const ActivityLog = require("../models/ActivityLog");

const router = express.Router();
router.use(auth, requireRole("student"));

const blockedPatterns = [/\bimport\s+os\b/, /\bimport\s+subprocess\b/, /\bopen\s*\(/, /\beval\s*\(/, /\bexec\s*\(/];

async function studentHasPythonCourse(userId) {
  const pythonCourse = await Course.findOne({ slug: "python", active: true }).select("_id").lean();
  if (!pythonCourse) return false;
  const user = await User.findById(userId).select("assignedCourses").lean();
  return Boolean((user?.assignedCourses || []).map((id) => String(id)).includes(String(pythonCourse._id)));
}

router.post("/run", async (req, res) => {
  if (!(await studentHasPythonCourse(req.user.id))) {
    return res.status(403).json({ message: "Code Lab is only available for Python course students." });
  }

  const { code = "" } = req.body;
  if (blockedPatterns.some((pattern) => pattern.test(code))) {
    return res.status(400).json({ message: "Code contains blocked operations" });
  }

  const file = path.join(os.tmpdir(), `learnpy-${Date.now()}.py`);
  fs.writeFileSync(file, code, "utf-8");

  const child = spawn("python", [file], { timeout: 4000 });
  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (data) => (stdout += data.toString()));
  child.stderr.on("data", (data) => (stderr += data.toString()));

  child.on("close", async () => {
    fs.unlink(file, () => {});

    await StudentProgress.findOneAndUpdate(
      { userId: req.user.id },
      { $inc: { codeRunCount: 1 }, $setOnInsert: { userId: req.user.id } },
      { upsert: true }
    );
    await ActivityLog.create({ userId: req.user.id, action: "code_run" });

    if (stderr) return res.status(400).json({ output: stderr });
    res.json({ output: stdout || "Code executed successfully." });
  });
});

module.exports = router;
