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
    // Fee Management Fields
    feeType: { 
      type: String, 
      enum: ["monthly", "quarterly", "yearly", "course-based", "none"],
      default: "monthly"
    },
    feeAmount: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: "INR" },
    feeDueDay: { type: Number, min: 1, max: 31, default: 5 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

classSectionSchema.index({ schoolId: 1, grade: 1, section: 1 }, { unique: true });
classSectionSchema.index({ schoolId: 1, teacherIds: 1, active: 1 });
classSectionSchema.index({ schoolId: 1, subjects: 1, grade: 1 });

module.exports = model("ClassSection", classSectionSchema);
