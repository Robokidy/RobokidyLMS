const { Schema, model } = require("mongoose");

const paymentSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, default: Date.now },
    method: { type: String, enum: ["cash", "check", "bank-transfer", "online", "other"], default: "cash" },
    reference: { type: String, default: "" },
    receiptNo: { type: String, default: "" },
    remarks: { type: String, default: "" }
  },
  { _id: true }
);

const feeAccountSchema = new Schema(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    classSectionId: { type: Schema.Types.ObjectId, ref: "ClassSection" },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Fee Structure
    feeType: { 
      type: String, 
      enum: ["monthly", "quarterly", "yearly", "course-based", "custom"],
      default: "monthly"
    },
    totalFees: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR", trim: true },
    customOverride: { type: Boolean, default: false },
    // Calculated field: pendingAmount = totalFees - paidAmount
    dueDate: { type: Date },
    payments: [paymentSchema],
    // Status: auto-calculated based on amounts and dueDate
    status: { 
      type: String, 
      enum: ["paid", "partially-paid", "pending", "overdue", "waived", "scholarship"], 
      default: "pending" 
    },
    lastPaymentDate: { type: Date },
    notes: { type: String, default: "" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" } // Admin/Teacher who last updated
  },
  { timestamps: true }
);

feeAccountSchema.index({ schoolId: 1, studentId: 1 }, { unique: true });
feeAccountSchema.index({ schoolId: 1, classSectionId: 1, status: 1, dueDate: 1 });
feeAccountSchema.index({ studentId: 1, status: 1 });
feeAccountSchema.index({ dueDate: 1, status: 1 });

// Virtual for pending amount
feeAccountSchema.virtual("pendingAmount").get(function() {
  return Math.max(0, this.totalFees - this.paidAmount);
});

// Helper method to calculate status
feeAccountSchema.methods.calculateStatus = function() {
  const pending = this.totalFees - this.paidAmount;
  
  if (["waived", "scholarship"].includes(this.status)) return this.status;
  if (pending === 0) return "paid";
  if (this.paidAmount > 0 && pending > 0) return "partially-paid";
  if (this.dueDate && new Date() > this.dueDate && pending > 0) return "overdue";
  return "pending";
};

feeAccountSchema.pre("save", function preSave(next) {
  this.status = this.calculateStatus();
  next();
});

module.exports = model("FeeAccount", feeAccountSchema);
