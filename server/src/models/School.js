const { Schema, model } = require("mongoose");

const schoolSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "India" },
    pincode: { type: String, default: "" },
    alternatePhone: { type: String, default: "" },
    principalName: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    schoolType: { type: String, enum: ["public", "private", "international", "charter", "training-center"], default: "private" },
    contactEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    plan: { type: String, enum: ["trial", "basic", "pro", "enterprise"], default: "trial" },
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

schoolSchema.index({ active: 1, name: 1 });

module.exports = model("School", schoolSchema);
