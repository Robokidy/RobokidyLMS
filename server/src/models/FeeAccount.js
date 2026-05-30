const { Schema, model } = require("mongoose");

const paymentSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, default: Date.now },
    method: { type: String, default: "cash" },
    reference: { type: String, default: "" },
    receiptNo: { type: String, default: "" }
  },
  { _id: true }
);

const feeAccountSchema = new Schema(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    classSectionId: { type: Schema.Types.ObjectId, ref: "ClassSection" },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    totalFees: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date },
    payments: [paymentSchema],
    status: { type: String, enum: ["paid", "pending", "partial", "overdue"], default: "pending" },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

feeAccountSchema.index({ schoolId: 1, studentId: 1 }, { unique: true });
feeAccountSchema.index({ schoolId: 1, classSectionId: 1, status: 1, dueDate: 1 });

module.exports = model("FeeAccount", feeAccountSchema);
