const express = require("express");
const { auth, requireRole } = require("../middleware/auth");
const FeeAccount = require("../models/FeeAccount");
const User = require("../models/User");
const ClassSection = require("../models/ClassSection");
const School = require("../models/School");
const {
  backfillClassFeeAccounts,
  calculateFeeStatus: calculateCentralFeeStatus,
  recordPayment,
  serializeFeeAccount,
  syncStudentFeeFields
} = require("../utils/feeManager");

const router = express.Router();
router.use(auth);

// Helper: Calculate fee status
function calculateFeeStatus(totalFees, paidAmount, dueDate) {
  return calculateCentralFeeStatus(totalFees, paidAmount, dueDate);
}

// Helper: Get user scope for fee visibility
async function getUserScope(userId, userRole) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const schoolIds = userRole === "admin" ? null : (user.schoolIds || [user.schoolId]);
  const classSectionIds = user.classSectionIds || [];

  return { schoolIds, classSectionIds };
}

/**
 * GET /api/fees/student/:studentId
 * Get fee account for a student
 * Access: Admin, Teacher (same class), Student (own fees)
 */
router.get("/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Permission check
    if (userRole === "student" && userId.toString() !== studentId) {
      return res.status(403).json({ error: "Cannot view other student's fees" });
    }

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    // For teachers: verify they teach this student
    if (userRole === "teacher") {
      const classIds = student.classSectionIds || [];
      const teacherClasses = await ClassSection.find({ _id: { $in: classIds }, teacherIds: userId });
      if (teacherClasses.length === 0) {
        return res.status(403).json({ error: "You don't teach this student's class" });
      }
    }

    const feeAccount = await FeeAccount.findOne({ studentId })
      .populate("classSectionId")
      .populate("schoolId")
      .lean();

    if (!feeAccount) {
      return res.status(404).json({ error: "Fee account not found" });
    }

    res.json(serializeFeeAccount(feeAccount));
  } catch (error) {
    console.error("GET /fees/student error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/fees/class/:classId
 * Get all fees for a class
 * Access: Admin, Class Teacher
 */
router.get("/class/:classId", requireRole("admin", "teacher"), async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Get class to verify access
    const classSection = await ClassSection.findById(classId);
    if (!classSection) return res.status(404).json({ error: "Class not found" });

    if (userRole === "teacher") {
      const isTeacher = classSection.teacherIds.includes(userId) || 
                       classSection.classTeacherId?.toString() === userId.toString();
      if (!isTeacher) {
        return res.status(403).json({ error: "You don't teach this class" });
      }
    }

    await backfillClassFeeAccounts(classId, req.user._id);

    // Get all students in class
    const students = await User.find({ classSectionIds: classId, role: "student" });
    const studentIds = students.map(s => s._id);

    // Get fees for all students
    const fees = await FeeAccount.find({ studentId: { $in: studentIds } })
      .populate("studentId", "fullName rollNumber studentId")
      .sort({ status: 1, dueDate: 1 })
      .lean();

    // Add calculated fields
    const enrichedFees = fees.map(serializeFeeAccount);

    // Calculate class summary
    const summary = {
      totalStudents: studentIds.length,
      feeStructure: {
        feeType: classSection.feeType,
        feeAmount: classSection.feeAmount,
        currency: classSection.currency || "INR",
        feeDueDay: classSection.feeDueDay
      },
      totalExpected: enrichedFees.reduce((sum, f) => sum + f.totalFees, 0),
      totalCollected: enrichedFees.reduce((sum, f) => sum + f.paidAmount, 0),
      totalPending: enrichedFees.reduce((sum, f) => sum + (f.totalFees - f.paidAmount), 0),
      paidCount: enrichedFees.filter(f => f.status === "paid").length,
      partialCount: enrichedFees.filter(f => f.status === "partially-paid").length,
      pendingCount: enrichedFees.filter(f => f.status === "pending").length,
      overdueCount: enrichedFees.filter(f => f.status === "overdue").length
    };

    summary.collectionPercentage = summary.totalExpected > 0 
      ? ((summary.totalCollected / summary.totalExpected) * 100).toFixed(2)
      : 0;

    res.json({ fees: enrichedFees, summary });
  } catch (error) {
    console.error("GET /fees/class error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/fees/payment
 * Record a payment for a student
 * Access: Admin, Teacher
 */
router.post("/payment", requireRole("admin", "teacher"), async (req, res) => {
  try {
    const { studentId, amount, method, reference, receiptNo, remarks, paymentDate } = req.body;

    if (!studentId || !amount) {
      return res.status(400).json({ error: "studentId and amount are required" });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Payment amount must be positive" });
    }

    // Get or create fee account
    let feeAccount = await FeeAccount.findOne({ studentId });
    if (!feeAccount) {
      const student = await User.findById(studentId);
      if (!student || student.role !== "student") {
        return res.status(404).json({ error: "Student not found" });
      }
      return res.status(400).json({ error: "Fee account doesn't exist for this student" });
    }

    feeAccount = await recordPayment({
      studentId,
      amount,
      method,
      reference,
      receiptNo,
      remarks,
      paymentDate,
      updatedBy: req.user._id
    });

    res.json({
      message: "Payment recorded successfully",
      feeAccount: serializeFeeAccount(feeAccount)
    });
  } catch (error) {
    console.error("POST /fees/payment error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/fees/:feeAccountId
 * Update fee details (amount, due date, status)
 * Access: Admin only
 */
router.put("/:feeAccountId", requireRole("admin"), async (req, res) => {
  try {
    const { feeAccountId } = req.params;
    const { totalFees, dueDate, feeType, status, notes } = req.body;

    const feeAccount = await FeeAccount.findById(feeAccountId);
    if (!feeAccount) return res.status(404).json({ error: "Fee account not found" });

    if (totalFees !== undefined && totalFees >= 0) {
      feeAccount.totalFees = Number(totalFees);
    }
    if (dueDate !== undefined) {
      feeAccount.dueDate = dueDate ? new Date(dueDate) : null;
    }
    if (feeType !== undefined) {
      feeAccount.feeType = feeType;
    }
    if (status !== undefined) {
      const validStatuses = ["paid", "partially-paid", "pending", "overdue", "waived", "scholarship"];
      if (validStatuses.includes(status)) {
        feeAccount.status = status;
      }
    }
    if (notes !== undefined) {
      feeAccount.notes = notes;
    }

    feeAccount.updatedBy = req.user._id;
    await feeAccount.save();
    await syncStudentFeeFields(feeAccount.studentId, feeAccount);

    res.json({
      message: "Fee account updated",
      feeAccount: serializeFeeAccount(feeAccount)
    });
  } catch (error) {
    console.error("PUT /fees error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/fees/analytics/school
 * Fee analytics for admin dashboard
 * Access: Admin
 */
router.get("/analytics/school", requireRole("admin"), async (req, res) => {
  try {
    const { schoolId } = req.query;

    const query = schoolId ? { schoolId } : {};
    const fees = await FeeAccount.find(query).lean();

    if (fees.length === 0) {
      return res.json({
        totalExpected: 0,
        totalCollected: 0,
        totalPending: 0,
        totalOverdue: 0,
        collectionPercentage: 0,
        statuses: {}
      });
    }

    const summary = {
      totalExpected: 0,
      totalCollected: 0,
      totalPending: 0,
      totalOverdue: 0,
      statuses: {
        paid: 0,
        "partially-paid": 0,
        pending: 0,
        overdue: 0,
        waived: 0,
        scholarship: 0
      }
    };

    fees.forEach(fee => {
      summary.totalExpected += fee.totalFees;
      summary.totalCollected += fee.paidAmount;
      const pending = fee.totalFees - fee.paidAmount;
      if (pending > 0) summary.totalPending += pending;
      
      const status = calculateFeeStatus(fee.totalFees, fee.paidAmount, fee.dueDate);
      if (status === "overdue") summary.totalOverdue += pending;
      
      summary.statuses[status] = (summary.statuses[status] || 0) + 1;
    });

    summary.collectionPercentage = summary.totalExpected > 0 
      ? ((summary.totalCollected / summary.totalExpected) * 100).toFixed(2)
      : 0;

    res.json(summary);
  } catch (error) {
    console.error("GET /fees/analytics error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/fees/report/class-wise
 * Class-wise fee collection report
 * Access: Admin
 */
router.get("/report/class-wise", requireRole("admin"), async (req, res) => {
  try {
    const classes = await ClassSection.find().populate("schoolId").lean();
    
    const report = await Promise.all(
      classes.map(async (cls) => {
        const students = await User.find({ classSectionIds: cls._id, role: "student" });
        const fees = await FeeAccount.find({ classSectionId: cls._id }).lean();

        const totalExpected = fees.reduce((sum, f) => sum + f.totalFees, 0);
        const totalCollected = fees.reduce((sum, f) => sum + f.paidAmount, 0);
        const totalPending = totalExpected - totalCollected;

        return {
          className: `${cls.grade} - ${cls.section}`,
          school: cls.schoolId?.name || "N/A",
          totalStudents: students.length,
          feesConfigured: fees.length,
          totalExpected,
          totalCollected,
          totalPending,
          collectionPercentage: totalExpected > 0 
            ? ((totalCollected / totalExpected) * 100).toFixed(2)
            : 0
        };
      })
    );

    res.json(report);
  } catch (error) {
    console.error("GET /fees/report/class-wise error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
