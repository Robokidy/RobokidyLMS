const FeeAccount = require("../models/FeeAccount");
const ClassSection = require("../models/ClassSection");
const User = require("../models/User");

const FEE_STATUSES = ["paid", "partially-paid", "pending", "overdue", "waived", "scholarship"];
const MANUAL_STATUSES = ["waived", "scholarship"];

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeFeeStatus(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
  if (normalized === "partial") return "partially-paid";
  if (normalized === "partially-paid") return "partially-paid";
  return FEE_STATUSES.includes(normalized) ? normalized : "";
}

function calculatePending(totalFees, paidAmount) {
  return Math.max(0, toNumber(totalFees) - toNumber(paidAmount));
}

function calculateFeeStatus(totalFees, paidAmount, dueDate, currentStatus) {
  const manualStatus = normalizeFeeStatus(currentStatus);
  if (MANUAL_STATUSES.includes(manualStatus)) return manualStatus;

  const pending = calculatePending(totalFees, paidAmount);
  if (pending <= 0) return "paid";
  if (toNumber(paidAmount) > 0) return "partially-paid";
  if (dueDate && new Date(dueDate) < new Date()) return "overdue";
  return "pending";
}

function nextDueDateFromDay(day) {
  const dueDay = Math.max(1, Math.min(31, toNumber(day, 5)));
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, lastDay), 23, 59, 59, 999);
}

function serializeFeeAccount(fee) {
  if (!fee) return null;
  const row = typeof fee.toObject === "function" ? fee.toObject() : fee;
  const paidAmount = toNumber(row.paidAmount);
  const totalFees = toNumber(row.totalFees);
  const pendingAmount = calculatePending(totalFees, paidAmount);
  const status = calculateFeeStatus(totalFees, paidAmount, row.dueDate, row.status);
  return {
    ...row,
    totalFees,
    paidAmount,
    pendingAmount,
    status,
    paymentHistory: row.payments || []
  };
}

async function syncStudentFeeFields(studentId, fee) {
  const data = serializeFeeAccount(fee);
  if (!data) return;
  await User.updateOne(
    { _id: studentId, role: "student" },
    {
      $set: {
        feeAmount: data.totalFees,
        paidAmount: data.paidAmount,
        pendingAmount: data.pendingAmount,
        feeStatus: data.status,
        lastPaymentDate: data.lastPaymentDate || null
      }
    }
  );
}

async function ensureStudentFeeAccount({ student, classSection, customFeeAmount, updatedBy } = {}) {
  if (!student?._id) return null;

  const klass = classSection?._id
    ? classSection
    : (student.classSectionIds?.length ? await ClassSection.findById(student.classSectionIds[0]) : null);

  if (!klass?._id) return null;

  const hasOverride = customFeeAmount !== undefined && customFeeAmount !== null && customFeeAmount !== "";
  const totalFees = hasOverride ? toNumber(customFeeAmount) : toNumber(klass.feeAmount);
  const dueDate = nextDueDateFromDay(klass.feeDueDay);

  let fee = await FeeAccount.findOne({ studentId: student._id });
  if (!fee) {
    fee = new FeeAccount({
      schoolId: klass.schoolId,
      classSectionId: klass._id,
      studentId: student._id,
      feeType: hasOverride ? "custom" : (klass.feeType || "monthly"),
      totalFees,
      paidAmount: 0,
      currency: klass.currency || "INR",
      dueDate,
      customOverride: hasOverride,
      updatedBy
    });
  } else {
    fee.schoolId = klass.schoolId;
    fee.classSectionId = klass._id;
    fee.feeType = hasOverride ? "custom" : (fee.customOverride ? fee.feeType : (klass.feeType || fee.feeType || "monthly"));
    if (hasOverride || !fee.customOverride) fee.totalFees = totalFees;
    fee.currency = klass.currency || fee.currency || "INR";
    fee.dueDate = fee.dueDate || dueDate;
    fee.customOverride = hasOverride || fee.customOverride;
    fee.updatedBy = updatedBy || fee.updatedBy;
  }

  fee.status = calculateFeeStatus(fee.totalFees, fee.paidAmount, fee.dueDate, fee.status);
  await fee.save();
  await syncStudentFeeFields(student._id, fee);
  return fee;
}

async function ensureFeeForStudentId(studentId, customFeeAmount, updatedBy) {
  const student = await User.findById(studentId);
  if (!student || student.role !== "student") return null;
  return ensureStudentFeeAccount({ student, customFeeAmount, updatedBy });
}

async function backfillClassFeeAccounts(classSectionId, updatedBy) {
  const classSection = await ClassSection.findById(classSectionId);
  if (!classSection) return [];
  const students = await User.find({ role: "student", classSectionIds: classSection._id });
  const rows = [];
  for (const student of students) {
    rows.push(await ensureStudentFeeAccount({ student, classSection, updatedBy }));
  }
  return rows.filter(Boolean);
}

async function recordPayment({ studentId, feeAccountId, amount, method, reference, receiptNo, remarks, paymentDate, updatedBy }) {
  const fee = feeAccountId ? await FeeAccount.findById(feeAccountId) : await FeeAccount.findOne({ studentId });
  if (!fee) throw new Error("Fee account not found");

  const paymentAmount = toNumber(amount);
  if (paymentAmount <= 0) throw new Error("Payment amount must be greater than zero");
  if (paymentAmount > calculatePending(fee.totalFees, fee.paidAmount)) throw new Error("Payment amount cannot exceed pending amount");

  const paidAt = paymentDate ? new Date(paymentDate) : new Date();
  fee.payments.push({
    amount: paymentAmount,
    paidAt,
    method: method || "cash",
    reference: reference || "",
    receiptNo: receiptNo || "",
    remarks: remarks || ""
  });
  fee.paidAmount = toNumber(fee.paidAmount) + paymentAmount;
  fee.lastPaymentDate = paidAt;
  fee.status = calculateFeeStatus(fee.totalFees, fee.paidAmount, fee.dueDate, fee.status);
  fee.updatedBy = updatedBy || fee.updatedBy;
  await fee.save();
  await syncStudentFeeFields(fee.studentId, fee);
  return fee;
}

module.exports = {
  FEE_STATUSES,
  backfillClassFeeAccounts,
  calculateFeeStatus,
  calculatePending,
  ensureFeeForStudentId,
  ensureStudentFeeAccount,
  nextDueDateFromDay,
  normalizeFeeStatus,
  recordPayment,
  serializeFeeAccount,
  syncStudentFeeFields
};
