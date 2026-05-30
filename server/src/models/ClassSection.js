const { Schema, model } = require("mongoose");

const classSectionSchema = new Schema(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    name: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    section: { type: String, default: "A", trim: true },
    teacherIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    classTeacherId: { type: Schema.Types.ObjectId, ref: "User" },
    courseIds: [{ type: Schema.Types.ObjectId, ref: "Course" }],
    courseTrackIds: [{ type: Schema.Types.ObjectId, ref: "CourseTrack" }],
    subjects: [{ type: String, trim: true }],
    schedule: { type: String, default: "" },
    codingTracks: [{ type: String, trim: true }],
    capacity: { type: Number, min: 1, default: 30 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

classSectionSchema.index({ schoolId: 1, grade: 1, section: 1 }, { unique: true });
classSectionSchema.index({ schoolId: 1, teacherIds: 1, active: 1 });
classSectionSchema.index({ schoolId: 1, subjects: 1, grade: 1 });

module.exports = model("ClassSection", classSectionSchema);
