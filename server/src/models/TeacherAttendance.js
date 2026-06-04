const { Schema, model } = require("mongoose");

const teacherAttendanceSchema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["present", "absent", "half-day", "leave", "holiday", "work-from-home"],
      required: true
    },
    checkInTime: { type: String, trim: true, default: "" },
    checkOutTime: { type: String, trim: true, default: "" },
    totalHours: { type: Number, min: 0, default: 0 },
    remarks: { type: String, trim: true, default: "" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    source: { type: String, enum: ["manual", "holiday"], default: "manual" }
  },
  { timestamps: true }
);

teacherAttendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });
teacherAttendanceSchema.index({ schoolId: 1, status: 1, date: -1 });

module.exports = model("TeacherAttendance", teacherAttendanceSchema);
