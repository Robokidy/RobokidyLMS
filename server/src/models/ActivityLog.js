const { Schema, model } = require("mongoose");

const logSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    meta: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

module.exports = model("ActivityLog", logSchema);
