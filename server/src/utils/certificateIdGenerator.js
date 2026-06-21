const Certificate = require("../models/Certificate");

function normalizeSchoolCode(schoolCode = "RKI") {
  return String(schoolCode || "RKI").trim().replace(/[^a-z0-9]/gi, "").toUpperCase() || "RKI";
}

function parseGradeNumber(value) {
  const match = String(value || "").match(/\d+/);
  const grade = match ? Number(match[0]) : Number(value);
  return Number.isFinite(grade) && grade >= 1 && grade <= 12 ? grade : 1;
}

async function generateCertificateId(schoolCode, grade, academicYear, runningNumber) {
  const gradeFormatted = String(parseGradeNumber(grade)).padStart(2, "0");
  const runningFormatted = String(runningNumber).padStart(3, "0");
  return `RK-${normalizeSchoolCode(schoolCode)}-G${gradeFormatted}-${academicYear}-${runningFormatted}`;
}

async function getNextRunningNumber(batchId) {
  const count = await Certificate.countDocuments({ batchId });
  return count + 1;
}

module.exports = { generateCertificateId, getNextRunningNumber, normalizeSchoolCode, parseGradeNumber };
