const { Schema, model } = require("mongoose");

const attendanceSchema = new Schema(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    classSectionId: { type: Schema.Types.ObjectId, ref: "ClassSection", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ["present", "absent", "late", "leave", "excused"], required: true },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    remarks: { type: String, default: "" }
  },
  { timestamps: true }
);

attendanceSchema.index({ classSectionId: 1, studentId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ schoolId: 1, classSectionId: 1, status: 1, date: -1 });

module.exports = model("Attendance", attendanceSchema);
