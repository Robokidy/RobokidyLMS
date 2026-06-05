const { Schema, model } = require("mongoose");

const leadTypes = [
  "School",
  "Tuition Centre",
  "Academy",
  "Training Institute",
  "Educational Franchise",
  "Corporate Training Lead",
  "Other"
];

const leadStatuses = [
  "New Lead",
  "Contacted",
  "Meeting Scheduled",
  "Meeting Completed",
  "Demo Scheduled",
  "Demo Completed",
  "Proposal Sent",
  "Negotiation",
  "Interested",
  "Not Interested",
  "Follow-Up Required",
  "Converted",
  "Lost"
];

const leadSources = ["Google Ads", "Website Enquiry", "Referral", "WhatsApp", "Walk-In", "Social Media", "Field Visit", "Other"];

const marketingLeadSchema = new Schema(
  {
    institutionName: { type: String, required: true, trim: true },
    leadType: { type: String, enum: leadTypes, default: "School" },
    status: { type: String, enum: leadStatuses, default: "New Lead" },
    opportunityScore: { type: String, enum: ["Hot", "Warm", "Cold"], default: "Cold" },
    leadSource: { type: String, enum: leadSources, default: "Field Visit" },
    principalName: { type: String, trim: true, default: "" },
    coordinatorName: { type: String, trim: true, default: "" },
    contactPerson: { type: String, trim: true, default: "" },
    phoneNumber: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "India" },
    website: { type: String, trim: true, default: "" },
    studentStrength: { type: Number, min: 0, default: 0 },
    gradesServed: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    revenuePotential: { type: Number, min: 0, default: 0 },
    nextAction: { type: String, trim: true, default: "" },
    nextFollowUpDate: { type: Date },
    convertedSchoolId: { type: Schema.Types.ObjectId, ref: "School" },
    onboardingStatus: { type: String, enum: ["Not Started", "Pending", "In Progress", "Completed"], default: "Not Started" },
    onboardingTasks: [{ title: String, ownerRole: String, dueDate: Date, status: { type: String, default: "Pending" } }],
    visits: [{
      visitType: { type: String, enum: ["School Visit", "Tuition Centre Visit", "Meeting", "Demo"], default: "School Visit" },
      date: { type: Date, default: Date.now },
      location: { type: String, trim: true, default: "" },
      purpose: { type: String, trim: true, default: "" },
      meetingWith: { type: String, trim: true, default: "" },
      discussionSummary: { type: String, trim: true, default: "" },
      response: { type: String, trim: true, default: "" },
      nextAction: { type: String, trim: true, default: "" },
      followUpDate: { type: Date },
      centreName: { type: String, trim: true, default: "" },
      ownerName: { type: String, trim: true, default: "" },
      studentCount: { type: Number, min: 0, default: 0 },
      coursesOffered: { type: String, trim: true, default: "" },
      opportunityRating: { type: String, enum: ["Hot", "Warm", "Cold", ""], default: "" },
      createdBy: { type: Schema.Types.ObjectId, ref: "User" }
    }],
    workLogs: [{
      date: { type: Date, default: Date.now },
      type: { type: String, trim: true, default: "" },
      activity: { type: String, trim: true, default: "" },
      outcome: { type: String, trim: true, default: "" },
      remarks: { type: String, trim: true, default: "" },
      hoursSpent: { type: Number, min: 0, default: 0 },
      nextAction: { type: String, trim: true, default: "" },
      createdBy: { type: Schema.Types.ObjectId, ref: "User" }
    }],
    proposals: [{
      title: { type: String, trim: true, default: "" },
      documentType: { type: String, enum: ["Proposal PDF", "Brochure", "Presentation Deck", "Contract", "MOU", "Marketing Material"], default: "Proposal PDF" },
      version: { type: String, trim: true, default: "v1" },
      dateSent: { type: Date, default: Date.now },
      status: { type: String, enum: ["Draft", "Sent", "Pending", "Accepted", "Rejected", "Signed"], default: "Sent" },
      fileName: { type: String, trim: true, default: "" },
      originalName: { type: String, trim: true, default: "" },
      filePath: { type: String, trim: true, default: "" },
      mimeType: { type: String, trim: true, default: "" },
      size: { type: Number, min: 0, default: 0 },
      createdBy: { type: Schema.Types.ObjectId, ref: "User" }
    }],
    followUps: [{
      title: { type: String, trim: true, default: "" },
      dueDate: { type: Date, required: true },
      type: { type: String, enum: ["Follow-Up", "Meeting", "Demo", "Proposal"], default: "Follow-Up" },
      status: { type: String, enum: ["Pending", "Completed", "Cancelled"], default: "Pending" },
      notes: { type: String, trim: true, default: "" },
      notifyCmo: { type: Boolean, default: true },
      notifyCeo: { type: Boolean, default: true },
      notifyCto: { type: Boolean, default: true },
      createdBy: { type: Schema.Types.ObjectId, ref: "User" }
    }],
    partnership: {
      agreementDate: Date,
      coursesPurchased: { type: String, trim: true, default: "" },
      studentCount: { type: Number, min: 0, default: 0 },
      duration: { type: String, trim: true, default: "" },
      status: { type: String, enum: ["Pending", "Signed", "Active", "Renewal Due", "Closed"], default: "Pending" }
    },
    communicationHistory: [{
      date: { type: Date, default: Date.now },
      channel: { type: String, trim: true, default: "Call" },
      summary: { type: String, trim: true, default: "" },
      createdBy: { type: Schema.Types.ObjectId, ref: "User" }
    }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

marketingLeadSchema.index({ status: 1, leadType: 1, createdAt: -1 });
marketingLeadSchema.index({ institutionName: "text", city: "text", contactPerson: "text", phoneNumber: "text", email: "text" });

module.exports = model("MarketingLead", marketingLeadSchema);
module.exports.leadTypes = leadTypes;
module.exports.leadStatuses = leadStatuses;
module.exports.leadSources = leadSources;
