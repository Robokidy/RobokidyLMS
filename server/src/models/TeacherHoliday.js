const { Schema, model } = require("mongoose");

const teacherHolidaySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["national", "school", "festival", "special", "emergency"],
      default: "school"
    },
    date: { type: Date, required: true },
    description: { type: String, trim: true, default: "" },
    schoolIds: [{ type: Schema.Types.ObjectId, ref: "School" }],
    teacherIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    classSectionIds: [{ type: Schema.Types.ObjectId, ref: "ClassSection" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

teacherHolidaySchema.index({ date: 1, active: 1 });
teacherHolidaySchema.index({ schoolIds: 1, teacherIds: 1, classSectionIds: 1 });

module.exports = model("TeacherHoliday", teacherHolidaySchema);
