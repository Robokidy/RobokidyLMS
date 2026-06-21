const { Schema, model } = require("mongoose");

const certificateTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    version: { type: String, default: "v1", trim: true },
    fileUrl: { type: String, required: true },
    publicId: { type: String, default: "" },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
    uploadedByName: { type: String, default: "" },
    active: { type: Boolean, default: false }
  },
  { timestamps: true }
);

certificateTemplateSchema.index({ active: 1 });

module.exports = model("CertificateTemplate", certificateTemplateSchema);
