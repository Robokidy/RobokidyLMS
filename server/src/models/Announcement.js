const { Schema, model } = require("mongoose");

const announcementSchema = new Schema(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School" },
    classSectionId: { type: Schema.Types.ObjectId, ref: "ClassSection" },
    audience: { type: String, enum: ["all", "teachers", "students", "parents", "class"], default: "all" },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

announcementSchema.index({ schoolId: 1, classSectionId: 1, createdAt: -1 });

module.exports = model("Announcement", announcementSchema);
