const { Schema, model } = require("mongoose");

const attendanceSchema = new Schema(
  {
    recordType: { type: String, enum: ["legacy-student", "class-day"], default: "legacy-student" },
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    classSectionId: { type: Schema.Types.ObjectId, ref: "ClassSection", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, required: true },
    status: { type: String, enum: ["present", "absent", "late", "leave", "excused"] },
    markedBy: { type: Schema.Types.ObjectId, ref: "User" },
    teacherId: { type: Schema.Types.ObjectId, ref: "User" },
    markedAt: { type: Date },
    remarks: { type: String, default: "" },
    students: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        status: { type: String, enum: ["present", "absent", "late", "excused"], required: true, default: "present" },
        note: { type: String, default: "" }
      }
    ]
  },
  { timestamps: true }
);

attendanceSchema.index({ classSectionId: 1, studentId: 1, date: 1 }, { unique: true, partialFilterExpression: { recordType: "legacy-student", studentId: { $exists: true } } });
attendanceSchema.index({ classSectionId: 1, date: 1 }, { unique: true, partialFilterExpression: { recordType: "class-day" } });
attendanceSchema.index({ schoolId: 1, classSectionId: 1, status: 1, date: -1 });
attendanceSchema.index({ schoolId: 1, classSectionId: 1, recordType: 1, date: -1 });
attendanceSchema.index({ "students.studentId": 1, date: -1 });

module.exports = model("Attendance", attendanceSchema);
