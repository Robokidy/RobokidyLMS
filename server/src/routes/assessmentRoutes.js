const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { auth, loadUser } = require("../middleware/auth");
const Question = require("../models/Question");
const Test = require("../models/Test");
const TestAttempt = require("../models/TestAttempt");
const CheatingViolation = require("../models/CheatingViolation");
const Course = require("../models/Course");
const ClassSection = require("../models/ClassSection");
const School = require("../models/School");
const Lesson = require("../models/Lesson");

const router = express.Router();
router.use(auth, loadUser);

const blockedCodePatterns = [/\bimport\s+os\b/, /\bimport\s+subprocess\b/, /\bopen\s*\(/, /\beval\s*\(/, /\bexec\s*\(/];

function userId(req) {
  return req.authUser?._id || req.user?.id;
}

function scope(req) {
  const user = req.authUser || {};
  return {
    id: userId(req),
    role: user.role,
    schoolId: user.schoolId,
    schoolIds: (user.schoolIds || []).map(String),
    grade: user.grade,
    classSectionIds: (user.classSectionIds || []).map(String)
  };
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function ensureStaff(req, res) {
  const { role } = scope(req);
  if (["admin", "cto"].includes(role) || role === "teacher") return true;
  res.status(403).json({ message: "Only admins and teachers can modify assessments" });
  return false;
}

function questionValidationErrors(data) {
  const errors = [];
  const type = data.type || "mcq";
  const marks = Number(data.marks || 1);
  const text = String(data.questionText || data.title || "").trim();
  if (!text) errors.push("Question text is required");
  if (!Number.isFinite(marks) || marks <= 0) errors.push("Marks must be greater than 0");
  if (["mcq", "multi-select", "true-false"].includes(type)) {
    const options = Array.isArray(data.options) ? data.options.filter((option) => String(option.text || "").trim()) : [];
    const correctCount = options.filter((option) => option.isCorrect).length;
    if (options.length < 2) errors.push("Objective questions need at least two options");
    if (correctCount < 1) errors.push("Select at least one correct option");
    if (type !== "multi-select" && correctCount > 1) errors.push("Single-answer questions can only have one correct option");
  }
  if (type === "coding") {
    const testCases = data.codingConfig?.testCases || [];
    if (!testCases.some((testCase) => String(testCase.expectedOutput || "").trim())) errors.push("Coding questions need at least one expected output");
  }
  if (type === "fill-blank" && !(data.blanks || []).length) errors.push("Fill-blank questions need at least one blank answer");
  if (type === "match-following" && !(data.matchingPairs || []).length) errors.push("Match questions need at least one pair");
  return errors;
}

async function testValidationErrors(data) {
  const errors = [];
  const title = String(data.title || "").trim();
  const questionIds = toArray(data.questionIds || data.questions);
  if (!title) errors.push("Test title is required");
  if (Number(data.duration || data.timeLimit || 30) < 1) errors.push("Duration must be at least 1 minute");
  if ((data.status || "draft") === "published" && questionIds.length === 0) errors.push("Published tests must contain at least one question");
  if (questionIds.length) {
    const selectedQuestions = await Question.find({ _id: { $in: questionIds } }).select("type codingConfig marks").lean();
    if (selectedQuestions.length !== questionIds.length) errors.push("One or more selected questions could not be found");
    if (selectedQuestions.some((question) => question.type === "coding" && !(question.codingConfig?.testCases || []).length)) {
      errors.push("Coding tests cannot include coding questions without test cases");
    }
  }
  return errors;
}

function runPython(code, input = "") {
  return new Promise((resolve) => {
    if (blockedCodePatterns.some((pattern) => pattern.test(code))) {
      resolve({ output: "", error: "Code contains blocked operations" });
      return;
    }
    const file = path.join(os.tmpdir(), `learnpy-assessment-${Date.now()}-${Math.random().toString(16).slice(2)}.py`);
    fs.writeFileSync(file, code, "utf-8");
    const child = spawn("python", [file], { timeout: 4000 });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => (stdout += data.toString()));
    child.stderr.on("data", (data) => (stderr += data.toString()));
    child.on("close", () => {
      fs.unlink(file, () => {});
      resolve({ output: stdout.trim(), error: stderr.trim() });
    });
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

function testAccessFilter(req) {
  const current = scope(req);
  const filter = {};
  if (current.role === "teacher") {
    return filter;
  }
  if (current.role === "student") {
    filter.status = "published";
    const studentSchoolIds = [current.schoolId, ...current.schoolIds].filter(Boolean).map(String);
    filter.$or = [
      { classSectionIds: { $in: current.classSectionIds } },
      { "assignedTo.classes": { $in: current.classSectionIds } },
      { "assignedTo.students": current.id },
      { "assignedTo.schools": { $in: studentSchoolIds } }
    ];
    if (current.grade) {
      filter.$or.push({ grade: current.grade }, { "assignedTo.grades": current.grade });
    }
  }
  return filter;
}

router.get("/meta", async (req, res) => {
  const current = scope(req);
  const classFilter = ["admin", "cto"].includes(current.role) ? {} : { _id: { $in: current.classSectionIds } };
  const schoolFilter = ["admin", "cto"].includes(current.role) ? { active: { $ne: false } } : { _id: { $in: [current.schoolId, ...current.schoolIds].filter(Boolean) } };
  const [courses, classes, schools, lessons] = await Promise.all([
    Course.find({ active: true }).select("name slug active").sort({ name: 1 }).lean(),
    ClassSection.find(classFilter).select("name grade section schoolId courseIds").sort({ grade: 1, section: 1 }).lean(),
    School.find(schoolFilter).select("name code active").sort({ name: 1 }).lean(),
    Lesson.find({ active: true }).select("title courseId module chapter status").sort({ title: 1 }).limit(500).lean()
  ]);
  res.json({ courses, classes, schools, lessons });
});

router.get("/summary", async (req, res) => {
  const testFilter = testAccessFilter(req);
  const questionFilter = ["admin", "cto"].includes(scope(req).role) ? {} : { $or: [{ createdBy: scope(req).id }, { schoolId: scope(req).schoolId }, { schoolId: null }] };
  const [questions, tests, attempts, violations] = await Promise.all([
    Question.countDocuments(questionFilter),
    Test.countDocuments(testFilter),
    TestAttempt.countDocuments({}),
    CheatingViolation.countDocuments({})
  ]);
  res.json({ questions, tests, attempts, violations });
});

router.get("/questions", async (req, res) => {
  const current = scope(req);
  const filter = { active: { $ne: false } };
  if (current.role === "student") {
    filter.$or = [{ createdBy: current.id }, { schoolId: current.schoolId }, { schoolId: null }];
  }
  if (req.query.type) filter.type = req.query.type;
  if (req.query.difficulty) filter.difficulty = req.query.difficulty;
  if (req.query.courseId) filter.courseId = req.query.courseId;
  if (req.query.lessonId) filter.lessonId = req.query.lessonId;
  if (req.query.search) filter.questionText = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  res.json(await Question.find(filter).populate("courseId", "name slug").sort({ createdAt: -1 }).limit(300).lean());
});

router.post("/questions", async (req, res) => {
  if (!ensureStaff(req, res)) return;
  const current = scope(req);
  const validationErrors = questionValidationErrors(req.body);
  if (validationErrors.length) return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
  const question = await Question.create({
    questionText: req.body.questionText || req.body.title,
    description: req.body.description || "",
    type: req.body.type || "mcq",
    marks: Number(req.body.marks || 1),
    negativeMarks: Number(req.body.negativeMarks || 0),
    options: req.body.options || [],
    matchingPairs: req.body.matchingPairs || [],
    blanks: req.body.blanks || [],
    codingConfig: req.body.codingConfig || undefined,
    imageData: req.body.imageData || undefined,
    difficulty: req.body.difficulty || "medium",
    tags: toArray(req.body.tags),
    topic: req.body.topic || "",
    category: req.body.category || "",
    courseId: req.body.courseId || undefined,
    lessonId: req.body.lessonId || undefined,
    schoolId: current.schoolId,
    classSectionIds: toArray(req.body.classSectionIds),
    createdBy: current.id
  });
  res.status(201).json(question);
});

router.put("/questions/:id", async (req, res) => {
  if (!ensureStaff(req, res)) return;
  const current = scope(req);
  const question = await Question.findById(req.params.id);
  if (!question) return res.status(404).json({ message: "Question not found" });
  const patch = { ...req.body };
  if (patch.tags !== undefined) patch.tags = toArray(patch.tags);
  Object.assign(question, patch, { updatedBy: current.id });
  await question.save();
  res.json(question);
});

router.delete("/questions/:id", async (req, res) => {
  if (!ensureStaff(req, res)) return;
  const current = scope(req);
  const question = await Question.findById(req.params.id);
  if (!question) return res.status(404).json({ message: "Question not found" });
  question.active = false;
  await question.save();
  await Test.updateMany({ questions: question._id }, { $pull: { questions: question._id } });
  res.json({ message: "Question deleted" });
});

router.get("/tests", async (req, res) => {
  const filter = testAccessFilter(req);
  if (req.query.testType) filter.testType = req.query.testType;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.courseId) filter.courseId = req.query.courseId;
  if (req.query.classSectionId) filter.classSectionIds = req.query.classSectionId;
  if (req.query.grade) filter.grade = req.query.grade;
  res.json(await Test.find(filter)
    .populate("courseId", "name slug")
    .populate("classSectionIds", "name grade section")
    .populate("questions", "questionText type marks difficulty tags topic")
    .sort({ createdAt: -1 })
    .limit(300)
    .lean());
});

router.post("/tests", async (req, res) => {
  if (!ensureStaff(req, res)) return;
  const current = scope(req);
  const validationErrors = await testValidationErrors(req.body);
  if (validationErrors.length) return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
  const questionIds = toArray(req.body.questionIds);
  const classSectionIds = toArray(req.body.classSectionIds);
  const questions = questionIds.length ? await Question.find({ _id: { $in: questionIds } }).select("marks").lean() : [];
  const totalMarks = Number(req.body.totalMarks || questions.reduce((sum, question) => sum + (question.marks || 0), 0) || 1);
  const test = await Test.create({
    title: req.body.title,
    description: req.body.description || "",
    instructions: req.body.instructions || "",
    subject: req.body.subject || req.body.courseName || "General",
    testType: req.body.testType || "quiz",
    courseId: req.body.courseId || undefined,
    schoolId: ["admin", "cto"].includes(current.role) ? (req.body.schoolId || current.schoolId) : current.schoolId,
    classSectionIds,
    grade: req.body.grade || "",
    totalMarks,
    passingMarks: Number(req.body.passingMarks || req.body.passMarks || Math.ceil(totalMarks * 0.6)),
    timeLimit: Number(req.body.duration || req.body.timeLimit || 30),
    startDateTime: req.body.startDate || req.body.startDateTime || undefined,
    endDateTime: req.body.endDate || req.body.endDateTime || undefined,
    status: req.body.status || "draft",
    questions: questionIds,
    assignedTo: { classes: classSectionIds, students: toArray(req.body.studentIds), schools: toArray(req.body.schoolIds), grades: toArray(req.body.grades) },
    antiCheating: {
      enabled: true,
      fullscreenMode: true,
      tabSwitchDetection: true,
      windowBlurDetection: true,
      copyPasteDetection: true,
      rightClickDisabled: true,
      textSelectionDisabled: false,
      webcamMonitoring: { enabled: false },
      violationThresholds: { warningAt: 1, autoSubmitAt: 3 }
    },
    createdBy: current.id
  });
  res.status(201).json(test);
});

router.put("/tests/:id", async (req, res) => {
  if (!ensureStaff(req, res)) return;
  const current = scope(req);
  const test = await Test.findById(req.params.id);
  if (!test) return res.status(404).json({ message: "Test not found" });
  const validationErrors = await testValidationErrors({ ...test.toObject(), ...req.body });
  if (validationErrors.length) return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
  Object.assign(test, req.body);
  if (req.body.questionIds) test.questions = toArray(req.body.questionIds);
  if (req.body.classSectionIds) test.classSectionIds = toArray(req.body.classSectionIds);
  await test.save();
  res.json(test);
});

router.delete("/tests/:id", async (req, res) => {
  if (!ensureStaff(req, res)) return;
  const current = scope(req);
  const test = await Test.findById(req.params.id);
  if (!test) return res.status(404).json({ message: "Assessment not found" });
  await Test.deleteOne({ _id: test._id });
  await TestAttempt.deleteMany({ testId: test._id });
  await CheatingViolation.deleteMany({ testId: test._id });
  res.json({ message: "Assessment deleted" });
});

router.post("/tests/:id/publish", async (req, res) => {
  if (!ensureStaff(req, res)) return;
  const current = scope(req);
  const test = await Test.findById(req.params.id);
  if (!test) return res.status(404).json({ message: "Assessment not found" });
  if (!(test.questions || []).length) return res.status(400).json({ message: "Add questions before publishing" });
  test.status = "published";
  await test.save();
  res.json(test);
});

router.post("/tests/:id/assign", async (req, res) => {
  if (!ensureStaff(req, res)) return;
  const current = scope(req);
  const test = await Test.findById(req.params.id);
  if (!test) return res.status(404).json({ message: "Assessment not found" });
  const classSectionIds = toArray(req.body.classSectionIds || req.body.classes);
  test.classSectionIds = classSectionIds;
  test.assignedTo = {
    schools: toArray(req.body.schoolIds || req.body.schools),
    classes: classSectionIds,
    grades: toArray(req.body.grades),
    students: toArray(req.body.studentIds || req.body.students),
    courseTracks: toArray(req.body.courseTrackIds)
  };
  if (req.body.availableFrom) test.startDateTime = req.body.availableFrom;
  if (req.body.availableTo) test.endDateTime = req.body.availableTo;
  await test.save();
  res.json(test);
});

function reportAccessMatch(req) {
  const current = scope(req);
  const match = {};
  if (current.role === "student") match.studentId = current.id;
  if (current.role === "teacher") match.classId = { $in: current.classSectionIds };
  return match;
}

function summarizeReportRows(rows) {
  return {
    attempts: rows.length,
    averageScore: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.percentage, 0) / rows.length) : 0,
    passed: rows.filter((row) => row.passed).length,
    failed: rows.filter((row) => row.status === "submitted" && !row.passed).length,
    violations: rows.reduce((sum, row) => sum + row.violations, 0)
  };
}

function reportRowsFromAttempts(attempts) {
  return attempts.map((attempt) => ({
    _id: attempt._id,
    studentId: attempt.studentId?._id,
    student: attempt.studentId?.fullName || attempt.studentId?.username || "Student",
    rollNumber: attempt.studentId?.rollNumber || "",
    classId: attempt.classId?._id || attempt.classId,
    className: attempt.classId?.name || attempt.classId?.grade || "Class",
    testId: attempt.testId?._id,
    test: attempt.testId?.title || "Assessment",
    type: attempt.testId?.testType || "test",
    score: attempt.totalMarksObtained || 0,
    total: attempt.totalMarks || 0,
    percentage: Math.round(attempt.percentage || 0),
    status: attempt.status,
    passed: attempt.passed,
    violations: attempt.violationCount || 0,
    submittedAt: attempt.endTime || attempt.updatedAt,
    answers: attempt.answers || []
  }));
}

router.get("/reports", async (req, res) => {
  const match = reportAccessMatch(req);
  if (req.query.dateFrom || req.query.dateTo) {
    match.createdAt = {};
    if (req.query.dateFrom) match.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) match.createdAt.$lte = new Date(req.query.dateTo);
  }
  if (req.query.testId) match.testId = req.query.testId;
  if (req.query.studentId) match.studentId = req.query.studentId;
  if (req.query.classId) match.classId = req.query.classId;
  const attempts = await TestAttempt.find(match)
    .populate("testId", "title testType courseId grade")
    .populate("studentId", "username fullName rollNumber schoolId classSectionIds")
    .populate("classId", "name grade section")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  const rows = reportRowsFromAttempts(attempts);
  const classSummary = Object.values(rows.reduce((acc, row) => {
    const key = String(row.classId || "unassigned");
    acc[key] = acc[key] || { classId: row.classId, className: row.className, attempts: 0, averageScore: 0, passed: 0 };
    acc[key].attempts += 1;
    acc[key].averageScore += row.percentage;
    if (row.passed) acc[key].passed += 1;
    return acc;
  }, {})).map((row) => ({ ...row, averageScore: row.attempts ? Math.round(row.averageScore / row.attempts) : 0 }));
  const studentSummary = Object.values(rows.reduce((acc, row) => {
    const key = String(row.studentId || row.student);
    acc[key] = acc[key] || { studentId: row.studentId, student: row.student, rollNumber: row.rollNumber, attempts: 0, averageScore: 0, passed: 0 };
    acc[key].attempts += 1;
    acc[key].averageScore += row.percentage;
    if (row.passed) acc[key].passed += 1;
    return acc;
  }, {})).map((row) => ({ ...row, averageScore: row.attempts ? Math.round(row.averageScore / row.attempts) : 0 }));
  res.json({
    rows,
    summary: summarizeReportRows(rows),
    classSummary,
    studentSummary
  });
});

router.get("/tests/:id/report", async (req, res) => {
  const match = { ...reportAccessMatch(req), testId: req.params.id };
  if (req.query.studentId) match.studentId = req.query.studentId;
  if (req.query.classId) match.classId = req.query.classId;
  const [test, attempts] = await Promise.all([
    Test.findById(req.params.id).populate("courseId", "name slug").populate("classSectionIds", "name grade section").populate("questions", "questionText type marks difficulty").lean(),
    TestAttempt.find(match)
      .populate("studentId", "username fullName rollNumber")
      .populate("classId", "name grade section")
      .sort({ percentage: -1, createdAt: -1 })
      .lean()
  ]);
  if (!test) return res.status(404).json({ message: "Assessment not found" });
  const rows = reportRowsFromAttempts(attempts);
  res.json({
    test,
    rows,
    summary: summarizeReportRows(rows),
    classSummary: Object.values(rows.reduce((acc, row) => {
      const key = String(row.classId || "unassigned");
      acc[key] = acc[key] || { classId: row.classId, className: row.className, attempts: 0, averageScore: 0, passed: 0 };
      acc[key].attempts += 1;
      acc[key].averageScore += row.percentage;
      if (row.passed) acc[key].passed += 1;
      return acc;
    }, {})).map((row) => ({ ...row, averageScore: row.attempts ? Math.round(row.averageScore / row.attempts) : 0 }))
  });
});

router.post("/tests/:id/start", async (req, res) => {
  const current = scope(req);
  if (current.role !== "student") return res.status(403).json({ message: "Only students can start tests" });
  const test = await Test.findOne({ _id: req.params.id, ...testAccessFilter(req) }).populate("questions").lean();
  if (!test) return res.status(404).json({ message: "Test not found or not assigned" });
  const attempt = await TestAttempt.create({
    testId: test._id,
    studentId: current.id,
    schoolId: current.schoolId,
    classId: current.classSectionIds[0],
    totalMarks: test.totalMarks,
    status: "in-progress",
    startTime: new Date(),
    lastActivityTime: new Date(),
    deviceInfo: { userAgent: req.headers["user-agent"], ipAddress: req.ip }
  });
  const questions = (test.questions || []).map((question) => {
    const row = { ...question };
    if (row.options) row.options = row.options.map(({ isCorrect, ...option }) => option);
    if (row.codingConfig?.testCases) row.codingConfig.testCases = row.codingConfig.testCases.filter((testCase) => !testCase.isHidden);
    return row;
  });
  res.status(201).json({ attempt, test, questions });
});

router.post("/attempts/:id/save", async (req, res) => {
  const current = scope(req);
  const attempt = await TestAttempt.findById(req.params.id);
  if (!attempt) return res.status(404).json({ message: "Attempt not found" });
  if (String(attempt.studentId) !== String(current.id)) return res.status(403).json({ message: "Cannot update this attempt" });
  const { questionId, questionType, answer, timeSpent } = req.body;
  const existing = attempt.answers.find((row) => String(row.questionId) === String(questionId));
  if (existing) {
    existing.answer = answer;
    existing.timeSpent = Number(timeSpent || existing.timeSpent || 0);
  } else {
    attempt.answers.push({ questionId, questionType, answer, timeSpent: Number(timeSpent || 0) });
  }
  attempt.lastActivityTime = new Date();
  await attempt.save();
  res.json({ message: "Saved" });
});

router.post("/attempts/:id/violations", async (req, res) => {
  const current = scope(req);
  const attempt = await TestAttempt.findById(req.params.id);
  if (!attempt) return res.status(404).json({ message: "Attempt not found" });
  if (String(attempt.studentId) !== String(current.id)) return res.status(403).json({ message: "Cannot update this attempt" });
  const nextCount = attempt.violationCount + 1;
  const violation = await CheatingViolation.create({
    testAttemptId: attempt._id,
    testId: attempt.testId,
    studentId: attempt.studentId,
    violationType: req.body.violationType || "suspicious-activity",
    violationCount: nextCount,
    severity: nextCount >= 3 ? "critical" : "warning",
    action: nextCount >= 3 ? "auto-submit" : "warning",
    description: req.body.description || "",
    elapsedTimeFromStart: attempt.startTime ? Math.floor((new Date() - attempt.startTime) / 1000) : 0,
    deviceInfo: { userAgent: req.headers["user-agent"], ipAddress: req.ip }
  });
  attempt.violations.push(violation._id);
  attempt.violationCount = nextCount;
  if (nextCount >= 3) {
    attempt.status = "submitted";
    attempt.isAutoSubmitted = true;
    attempt.submissionMethod = "auto-violation-threshold";
    attempt.endTime = new Date();
  }
  await attempt.save();
  res.status(201).json({ violation, violationCount: nextCount, autoSubmitted: nextCount >= 3 });
});

router.post("/attempts/:id/submit", async (req, res) => {
  const current = scope(req);
  const attempt = await TestAttempt.findById(req.params.id);
  if (!attempt) return res.status(404).json({ message: "Attempt not found" });
  if (String(attempt.studentId) !== String(current.id)) return res.status(403).json({ message: "Cannot submit this attempt" });
  const test = await Test.findById(attempt.testId).populate("questions");
  let obtained = 0;
  let total = 0;
  for (const answer of attempt.answers) {
    const question = test.questions.find((row) => String(row._id) === String(answer.questionId));
    if (!question) continue;
    total += question.marks || 0;
    if (["mcq", "true-false"].includes(question.type)) {
      const selected = question.options.find((option) => option.optionId === answer.answer || option.text === answer.answer);
      answer.isCorrect = Boolean(selected?.isCorrect);
      answer.marksObtained = answer.isCorrect ? question.marks : 0;
      obtained += answer.marksObtained;
    } else if (question.type === "multi-select") {
      const selectedValues = new Set(toArray(answer.answer));
      const correctValues = new Set((question.options || []).filter((option) => option.isCorrect).map((option) => option.optionId || option.text));
      answer.isCorrect = selectedValues.size === correctValues.size && [...correctValues].every((value) => selectedValues.has(String(value)));
      answer.marksObtained = answer.isCorrect ? question.marks : 0;
      obtained += answer.marksObtained;
    } else if (question.type === "fill-blank") {
      const expected = (question.blanks || [])[0];
      const submitted = String(answer.answer || "");
      const candidates = [expected?.correctAnswer, ...(expected?.acceptableVariations || [])].filter(Boolean).map((value) => expected?.caseSensitive ? String(value) : String(value).toLowerCase());
      answer.isCorrect = candidates.includes(expected?.caseSensitive ? submitted.trim() : submitted.trim().toLowerCase());
      answer.marksObtained = answer.isCorrect ? question.marks : 0;
      obtained += answer.marksObtained;
    } else if (question.type === "coding") {
      const testCases = question.codingConfig?.testCases || [];
      let passedCases = 0;
      for (const testCase of testCases) {
        const result = await runPython(String(answer.answer || ""), testCase.input || "");
        if (!result.error && result.output === String(testCase.expectedOutput || "").trim()) passedCases += 1;
      }
      const ratio = testCases.length ? passedCases / testCases.length : 0;
      answer.isCorrect = ratio === 1;
      answer.marksObtained = Math.round((question.marks || 0) * ratio * 100) / 100;
      obtained += answer.marksObtained;
    }
  }
  attempt.status = "submitted";
  attempt.endTime = new Date();
  attempt.actualTimeSpent = attempt.startTime ? Math.floor((attempt.endTime - attempt.startTime) / 1000) : 0;
  attempt.totalMarks = total || attempt.totalMarks;
  attempt.totalMarksObtained = obtained;
  attempt.percentage = attempt.totalMarks ? Math.round((obtained / attempt.totalMarks) * 100) : 0;
  attempt.passed = obtained >= test.passingMarks;
  attempt.evaluationStatus = "auto-evaluated";
  attempt.evaluatedAt = new Date();
  attempt.submissionMethod = req.body.submissionMethod || attempt.submissionMethod || "manual";
  await attempt.save();
  await Test.updateOne({ _id: test._id }, { $inc: { totalAttempts: 1 } });
  res.json({ message: "Submitted", attempt });
});

module.exports = router;


