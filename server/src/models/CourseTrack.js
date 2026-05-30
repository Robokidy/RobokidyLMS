const { Schema, model } = require("mongoose");

const courseTrackSchema = new Schema(
  {
    trackName: { type: String, required: true, trim: true },
    trackCode: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, default: "" },
    category: { type: String, default: "general", trim: true },
    grade: { type: String, default: "", trim: true },
    icon: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    materials: [{ type: Schema.Types.ObjectId, ref: "Material" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

courseTrackSchema.index({ trackName: 1 });
courseTrackSchema.index({ active: 1 });

module.exports = model("CourseTrack", courseTrackSchema);
