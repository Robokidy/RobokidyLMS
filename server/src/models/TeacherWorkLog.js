const { Schema, model } = require("mongoose");

const teacherWorkLogSchema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    classSectionId: { type: Schema.Types.ObjectId, ref: "ClassSection", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson" },
    materialIds: [{ type: Schema.Types.ObjectId, ref: "Material" }],
    assessmentId: { type: Schema.Types.ObjectId, ref: "Test" },
    date: { type: Date, required: true },
    grade: { type: String, trim: true, default: "" },
    subject: { type: String, trim: true, default: "" },
    lessonConducted: { type: String, trim: true, default: "" },
    topicCovered: { type: String, trim: true, default: "" },
    materialsUsed: { type: String, trim: true, default: "" },
    assessmentConducted: { type: Boolean, default: false },
    assessmentSummary: { type: String, trim: true, default: "" },
    homeworkGiven: { type: String, trim: true, default: "" },
    durationMinutes: { type: Number, min: 0, default: 45 },
    status: { type: String, enum: ["submitted", "reviewed", "pending"], default: "submitted" },
    remarks: { type: String, trim: true, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

teacherWorkLogSchema.index({ teacherId: 1, date: -1 });
teacherWorkLogSchema.index({ schoolId: 1, classSectionId: 1, lessonId: 1, date: -1 });

module.exports = model("TeacherWorkLog", teacherWorkLogSchema);
