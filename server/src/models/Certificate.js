const { Schema, model } = require("mongoose");

const certificateSchema = new Schema(
  {
    certificateId: { type: String, unique: true, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentName: { type: String, required: true, trim: true },
    rollNumber: { type: String, default: "N/A", trim: true },
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    schoolName: { type: String, required: true, trim: true },
    schoolCode: { type: String, required: true, trim: true, uppercase: true },
    schoolLogoUrl: { type: String, default: "" },
    grade: { type: Number, required: true, min: 1, max: 12 },
    classId: { type: Schema.Types.ObjectId, ref: "ClassSection" },
    className: { type: String, default: "" },
    courseName: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    issueDate: { type: Date, required: true },
    certificatePdfUrl: { type: String, default: "" },
    qrCodeUrl: { type: String, default: "" },
    verificationUrl: { type: String, required: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    generatedByName: { type: String, default: "" },
    generatedByRole: { type: String, enum: ["admin", "cto", "teacher", "CEO", "CTO", "Teacher"], required: true },
    batchId: { type: String },
    batchRunningNumber: { type: Number, default: 1 },
    uploadStatus: { type: String, enum: ["uploaded", "pending_upload", "failed"], default: "uploaded" },
    status: { type: String, enum: ["active", "revoked", "expired", "pending_upload"], default: "active", index: true },
    verificationCount: { type: Number, default: 0 },
    lastVerifiedAt: { type: Date },
    revokedAt: { type: Date },
    revokedBy: { type: Schema.Types.ObjectId, ref: "User" },
    revokeReason: { type: String, default: "" }
  },
  { timestamps: true }
);

certificateSchema.index({ schoolCode: 1, grade: 1, academicYear: 1 });
certificateSchema.index({ studentId: 1 });
certificateSchema.index({ batchId: 1 });
certificateSchema.index({ studentId: 1, courseName: 1, academicYear: 1 }, { unique: true });

module.exports = model("Certificate", certificateSchema);
