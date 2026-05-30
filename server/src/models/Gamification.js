const { Schema, model } = require("mongoose");

const badgeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "award" },
    xpRequired: { type: Number, default: 0 },
    trackId: { type: Schema.Types.ObjectId, ref: "Track" }
  },
  { timestamps: true }
);

const certificateSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    trackId: { type: Schema.Types.ObjectId, ref: "Track" },
    templateUrl: { type: String, default: "" },
    issuerName: { type: String, default: "Robokidy Innovative Centre" }
  },
  { timestamps: true }
);

const leaderboardSchema = new Schema(
  {
    scope: { type: String, enum: ["weekly", "monthly", "track", "competition"], default: "weekly" },
    trackId: { type: Schema.Types.ObjectId, ref: "Track" },
    entries: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        xp: { type: Number, default: 0 },
        rank: { type: Number, default: 0 },
        projectsCompleted: { type: Number, default: 0 }
      }
    ]
  },
  { timestamps: true }
);

module.exports = {
  Badge: model("Badge", badgeSchema),
  Certificate: model("Certificate", certificateSchema),
  Leaderboard: model("Leaderboard", leaderboardSchema)
};
