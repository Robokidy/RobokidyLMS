const User = require("../models/User");
const StudentProgress = require("../models/StudentProgress");
const ClassSection = require("../models/ClassSection");
const { DEFAULT_FIRST_PASSWORD } = require("./password");
const { ensureStudentFeeAccount } = require("./feeManager");

function safeText(value) {
  return String(value || "").trim();
}

function usernameBase(value, fallback = "user") {
  const raw = safeText(value).toLowerCase().split("@")[0];
  const cleaned = raw.replace(/[^a-z0-9]/g, "");
  return cleaned || fallback;
}

async function generateUniqueUsername(seed, reserved = new Set()) {
  const base = `${usernameBase(seed)}@robokidy`;
  let username = base;
  let index = 1;
  while (reserved.has(username) || await User.exists({ username })) {
    username = `${base.replace("@robokidy", "")}${index}@robokidy`;
    index += 1;
  }
  reserved.add(username);
  return username;
}

async function ensureUsernameAvailable(username) {
  const normalized = safeText(username).toLowerCase();
  if (!normalized) return { available: false, username: normalized, message: "Username is required" };
  const exists = await User.exists({ username: normalized });
  return {
    available: !exists,
    username: normalized,
    message: exists ? "Username already available, please choose another username" : "Username is available"
  };
}

async function createBulkStudents({ students, schoolId, classSectionId, grade, courseIds, trackIds, createdBy }) {
  const reserved = new Set();
  const rows = Array.isArray(students) ? students : [];
  const classSection = classSectionId ? await ClassSection.findById(classSectionId) : null;
  const created = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] || {};
    const fullName = safeText(row.fullName || row.name || `Student ${index + 1}`);
    const explicitUsername = safeText(row.username).toLowerCase();
    const username = explicitUsername || await generateUniqueUsername(fullName || row.email || row.studentId, reserved);
    if (explicitUsername) {
      const availability = await ensureUsernameAvailable(explicitUsername);
      if (!availability.available || reserved.has(explicitUsername)) {
        throw new Error(`Duplicate username in student row ${index + 1}`);
      }
      reserved.add(explicitUsername);
    }
    const student = await User.create({
      username,
      password: safeText(row.password) || DEFAULT_FIRST_PASSWORD,
      role: "student",
      firstLogin: true,
      assignedCourses: Array.isArray(row.assignedCourses) && row.assignedCourses.length ? row.assignedCourses : courseIds,
      assignedTrackIds: Array.isArray(row.assignedTrackIds) && row.assignedTrackIds.length ? row.assignedTrackIds : trackIds,
      fullName,
      email: safeText(row.email),
      phone: safeText(row.phone),
      studentId: safeText(row.studentId),
      rollNumber: safeText(row.rollNumber) || String(index + 1).padStart(2, "0"),
      parentName: safeText(row.parentName),
      parentContact: safeText(row.parentContact || row.parentPhone),
      grade: safeText(row.grade || grade),
      feeStructure: safeText(row.feeStructure),
      profilePhotoUrl: safeText(row.profilePhotoUrl),
      schoolId,
      classSectionIds: [classSectionId],
      active: row.active !== false
    });
    await StudentProgress.create({ userId: student._id, completedLessons: [], quizAttempts: [], codeRunCount: 0 });
    await ensureStudentFeeAccount({
      student,
      classSection,
      customFeeAmount: row.customFeeAmount,
      updatedBy: createdBy
    });
    created.push({ id: student._id, username: student.username, tempPassword: DEFAULT_FIRST_PASSWORD, createdBy });
  }
  return created;
}

module.exports = {
  DEFAULT_FIRST_PASSWORD,
  createBulkStudents,
  ensureUsernameAvailable,
  generateUniqueUsername,
  usernameBase
};
