const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { auth, requireRole } = require("../middleware/auth");
const MarketingLead = require("../models/MarketingLead");
const School = require("../models/School");
const ActivityLog = require("../models/ActivityLog");

const router = express.Router();
router.use(auth, requireRole("admin", "cto", "cmo"));

const UPLOAD_DIR = path.join(__dirname, "../../uploads/marketing");
const PIPELINE = ["New Lead", "Contacted", "Meeting Scheduled", "Meeting Completed", "Demo Scheduled", "Demo Completed", "Proposal Sent", "Negotiation", "Interested", "Not Interested", "Follow-Up Required", "Converted", "Lost"];
const FUNNEL = ["New Lead", "Contacted", "Meeting Scheduled", "Demo Scheduled", "Proposal Sent", "Converted"];

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname || "")}`)
  }),
  limits: { fileSize: 25 * 1024 * 1024 }
});

function safeText(value) {
  return String(value || "").trim();
}

function asNumber(value) {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
}

function parseDate(value) {
  return value ? new Date(value) : undefined;
}

function monthRange(query = {}) {
  const anchor = query.month ? new Date(`${query.month}-01T00:00:00.000Z`) : new Date();
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  return { start, end };
}

function opportunityScore(status, explicit) {
  if (["Hot", "Warm", "Cold"].includes(explicit)) return explicit;
  if (["Demo Completed", "Interested", "Proposal Sent", "Negotiation", "Converted"].includes(status)) return "Hot";
  if (["Meeting Completed", "Meeting Scheduled", "Demo Scheduled", "Contacted", "Follow-Up Required"].includes(status)) return "Warm";
  return "Cold";
}

function leadPatch(body) {
  const status = PIPELINE.includes(body.status) ? body.status : undefined;
  return {
    institutionName: safeText(body.institutionName),
    leadType: safeText(body.leadType) || "School",
    status: status || "New Lead",
    opportunityScore: opportunityScore(status || body.status, body.opportunityScore),
    leadSource: safeText(body.leadSource) || "Field Visit",
    principalName: safeText(body.principalName),
    coordinatorName: safeText(body.coordinatorName),
    contactPerson: safeText(body.contactPerson),
    phoneNumber: safeText(body.phoneNumber),
    email: safeText(body.email).toLowerCase(),
    address: safeText(body.address),
    city: safeText(body.city),
    state: safeText(body.state),
    country: safeText(body.country) || "India",
    website: safeText(body.website),
    studentStrength: asNumber(body.studentStrength),
    gradesServed: safeText(body.gradesServed),
    notes: safeText(body.notes),
    revenuePotential: asNumber(body.revenuePotential),
    nextAction: safeText(body.nextAction),
    nextFollowUpDate: parseDate(body.nextFollowUpDate)
  };
}

async function createSchoolForConvertedLead(lead, userId) {
  if (lead.status !== "Converted" || lead.convertedSchoolId) return lead;
  const baseCode = safeText(lead.institutionName).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 18).toUpperCase() || "SCHOOL";
  let code = baseCode;
  let suffix = 1;
  while (await School.exists({ code })) {
    suffix += 1;
    code = `${baseCode}-${suffix}`;
  }
  const school = await School.create({
    name: lead.institutionName,
    code,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    country: lead.country || "India",
    contactEmail: lead.email,
    contactPhone: lead.phoneNumber,
    principalName: lead.principalName || lead.contactPerson,
    schoolType: lead.leadType === "Tuition Centre" ? "training-center" : "private",
    plan: "trial",
    active: true,
    createdBy: userId
  });
  lead.convertedSchoolId = school._id;
  lead.onboardingStatus = "Pending";
  lead.onboardingTasks = [
    { title: "Confirm agreement and billing details", ownerRole: "CEO", status: "Pending" },
    { title: "Prepare academic setup", ownerRole: "CTO", status: "Pending" },
    { title: "Allocate teachers and implementation plan", ownerRole: "CTO", status: "Pending" }
  ];
  await lead.save();
  await ActivityLog.create({ userId, action: "marketing_lead_converted", meta: { leadId: lead._id, schoolId: school._id } });
  return lead;
}

function csv(rows) {
  return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

async function analyticsPayload(query = {}) {
  const { start, end } = monthRange(query);
  const [leads, monthLeads] = await Promise.all([
    MarketingLead.find({}).sort({ createdAt: -1 }).lean(),
    MarketingLead.find({ createdAt: { $gte: start, $lt: end } }).lean()
  ]);
  const workLogs = leads.flatMap((lead) => (lead.workLogs || []).map((log) => ({ ...log, institutionName: lead.institutionName, leadType: lead.leadType, status: lead.status })));
  const visits = leads.flatMap((lead) => lead.visits || []);
  const proposals = leads.flatMap((lead) => lead.proposals || []);
  const followUps = leads.flatMap((lead) => (lead.followUps || []).map((item) => ({ ...item, institutionName: lead.institutionName })));
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  const byStatus = Object.fromEntries(PIPELINE.map((status) => [status, leads.filter((lead) => lead.status === status).length]));
  const converted = leads.filter((lead) => lead.status === "Converted").length;
  const interested = leads.filter((lead) => ["Interested", "Negotiation", "Proposal Sent", "Converted"].includes(lead.status)).length;
  const contacted = leads.filter((lead) => lead.status !== "New Lead").length;
  const monthlyConverted = monthLeads.filter((lead) => lead.status === "Converted").length;
  return {
    summary: {
      totalLeads: leads.length,
      schoolsContacted: leads.filter((lead) => lead.leadType === "School" && lead.status !== "New Lead").length,
      tuitionCentresContacted: leads.filter((lead) => lead.leadType === "Tuition Centre" && lead.status !== "New Lead").length,
      meetingsScheduled: leads.filter((lead) => ["Meeting Scheduled", "Meeting Completed"].includes(lead.status)).length,
      meetingsCompleted: leads.filter((lead) => lead.status === "Meeting Completed").length + visits.filter((visit) => visit.visitType === "Meeting").length,
      followUpsPending: followUps.filter((item) => item.status === "Pending").length,
      schoolsInterested: interested,
      schoolsConverted: converted,
      partnershipsSigned: leads.filter((lead) => lead.partnership?.status === "Signed" || lead.partnership?.status === "Active").length,
      monthlyConversionRate: monthLeads.length ? Math.round((monthlyConverted / monthLeads.length) * 100) : 0,
      revenuePotential: leads.reduce((sum, lead) => sum + Number(lead.revenuePotential || 0), 0),
      totalVisits: visits.length,
      meetingsConducted: visits.filter((visit) => ["Meeting", "School Visit", "Tuition Centre Visit"].includes(visit.visitType)).length,
      demosConducted: visits.filter((visit) => visit.visitType === "Demo").length + leads.filter((lead) => lead.status === "Demo Completed").length,
      proposalsSent: proposals.filter((proposal) => ["Sent", "Accepted", "Signed"].includes(proposal.status)).length,
      institutionsInterested: interested,
      institutionsConverted: converted,
      lostOpportunities: leads.filter((lead) => lead.status === "Lost" || lead.status === "Not Interested").length,
      conversionRate: contacted ? Math.round((converted / contacted) * 100) : 0
    },
    pipeline: PIPELINE.map((status) => ({ status, count: byStatus[status] || 0 })),
    funnel: FUNNEL.map((status) => ({ name: status.replace(" Scheduled", "").replace(" Sent", ""), value: byStatus[status] || 0 })),
    typeDistribution: ["School", "Tuition Centre", "Academy", "Training Institute", "Educational Franchise", "Corporate Training Lead", "Other"].map((type) => ({ name: type, value: leads.filter((lead) => lead.leadType === type).length })),
    sourceAnalytics: ["Google Ads", "Website Enquiry", "Referral", "WhatsApp", "Walk-In", "Social Media", "Field Visit", "Other"].map((source) => ({ name: source, value: leads.filter((lead) => lead.leadSource === source).length })),
    visitTrends: Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const label = date.toLocaleString("en-US", { month: "short" });
      return { name: label, visits: visits.filter((visit) => new Date(visit.date).getMonth() === date.getMonth() && new Date(visit.date).getFullYear() === date.getFullYear()).length };
    }),
    reminders: {
      dueTomorrow: followUps.filter((item) => item.status === "Pending" && new Date(item.dueDate).toDateString() === tomorrow.toDateString()),
      dueToday: followUps.filter((item) => item.status === "Pending" && new Date(item.dueDate).toDateString() === now.toDateString()),
      demosThisWeek: followUps.filter((item) => item.status === "Pending" && item.type === "Demo" && new Date(item.dueDate) <= weekEnd),
      proposalPending: followUps.filter((item) => item.status === "Pending" && item.type === "Proposal")
    },
    activities: {
      today: workLogs.filter((log) => new Date(log.date).toDateString() === now.toDateString()),
      weekly: workLogs.filter((log) => new Date(log.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)),
      monthly: workLogs.filter((log) => new Date(log.date) >= start && new Date(log.date) < end)
    },
    ctoOnboarding: leads.filter((lead) => lead.status === "Converted").map((lead) => ({
      leadId: lead._id,
      institutionName: lead.institutionName,
      convertedSchoolId: lead.convertedSchoolId,
      onboardingStatus: lead.onboardingStatus,
      pendingAcademicSetup: (lead.onboardingTasks || []).filter((task) => task.ownerRole === "CTO" && task.status !== "Completed").length,
      studentStrength: lead.studentStrength
    }))
  };
}

router.get("/dashboard", async (req, res) => {
  res.json(await analyticsPayload(req.query));
});

router.get("/leads", async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.leadType) filter.leadType = req.query.leadType;
  if (req.query.opportunityScore) filter.opportunityScore = req.query.opportunityScore;
  if (req.query.search) filter.$text = { $search: req.query.search };
  res.json(await MarketingLead.find(filter).populate("convertedSchoolId", "name code").sort({ updatedAt: -1 }).lean());
});

router.post("/leads", async (req, res) => {
  const patch = leadPatch(req.body);
  if (!patch.institutionName) return res.status(400).json({ message: "Institution name is required" });
  const lead = await MarketingLead.create({ ...patch, createdBy: req.user.id, updatedBy: req.user.id });
  await ActivityLog.create({ userId: req.user.id, action: "marketing_lead_created", meta: { leadId: lead._id, institutionName: lead.institutionName } });
  res.status(201).json(lead);
});

router.put("/leads/:id", async (req, res) => {
  const patch = leadPatch(req.body);
  if (!patch.institutionName) return res.status(400).json({ message: "Institution name is required" });
  const lead = await MarketingLead.findByIdAndUpdate(req.params.id, { ...patch, updatedBy: req.user.id }, { new: true });
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  await createSchoolForConvertedLead(lead, req.user.id);
  await ActivityLog.create({ userId: req.user.id, action: "marketing_lead_updated", meta: { leadId: lead._id, status: lead.status } });
  res.json(await MarketingLead.findById(lead._id).populate("convertedSchoolId", "name code"));
});

router.delete("/leads/:id", async (req, res) => {
  const lead = await MarketingLead.findByIdAndUpdate(req.params.id, { status: "Lost", updatedBy: req.user.id }, { new: true });
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  res.json({ message: "Lead marked lost" });
});

router.post("/leads/:id/visits", async (req, res) => {
  const lead = await MarketingLead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  lead.visits.push({ ...req.body, date: parseDate(req.body.date) || new Date(), followUpDate: parseDate(req.body.followUpDate), createdBy: req.user.id });
  if (req.body.nextAction) lead.nextAction = safeText(req.body.nextAction);
  if (req.body.followUpDate) lead.nextFollowUpDate = parseDate(req.body.followUpDate);
  if (req.body.opportunityRating) lead.opportunityScore = opportunityScore(lead.status, req.body.opportunityRating);
  await lead.save();
  await ActivityLog.create({ userId: req.user.id, action: "marketing_visit_logged", meta: { leadId: lead._id } });
  res.status(201).json(lead);
});

router.post("/leads/:id/work-logs", async (req, res) => {
  const lead = await MarketingLead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  lead.workLogs.push({ ...req.body, date: parseDate(req.body.date) || new Date(), hoursSpent: asNumber(req.body.hoursSpent), createdBy: req.user.id });
  if (req.body.nextAction) lead.nextAction = safeText(req.body.nextAction);
  await lead.save();
  await ActivityLog.create({ userId: req.user.id, action: "marketing_work_log_created", meta: { leadId: lead._id, activity: req.body.activity } });
  res.status(201).json(lead);
});

router.post("/leads/:id/follow-ups", async (req, res) => {
  const lead = await MarketingLead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  if (!req.body.dueDate) return res.status(400).json({ message: "Due date is required" });
  lead.followUps.push({ ...req.body, dueDate: parseDate(req.body.dueDate), createdBy: req.user.id });
  lead.nextFollowUpDate = parseDate(req.body.dueDate);
  await lead.save();
  res.status(201).json(lead);
});

router.put("/leads/:leadId/follow-ups/:followUpId", async (req, res) => {
  const lead = await MarketingLead.findById(req.params.leadId);
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  const followUp = lead.followUps.id(req.params.followUpId);
  if (!followUp) return res.status(404).json({ message: "Follow-up not found" });
  followUp.set({ ...req.body, dueDate: parseDate(req.body.dueDate) || followUp.dueDate });
  await lead.save();
  res.json(lead);
});

router.post("/leads/:id/proposals", upload.single("file"), async (req, res) => {
  const lead = await MarketingLead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  lead.proposals.push({
    title: safeText(req.body.title) || req.file?.originalname || "Proposal",
    documentType: safeText(req.body.documentType) || "Proposal PDF",
    version: safeText(req.body.version) || "v1",
    dateSent: parseDate(req.body.dateSent) || new Date(),
    status: safeText(req.body.status) || "Sent",
    fileName: req.file?.filename || "",
    originalName: req.file?.originalname || "",
    filePath: req.file?.path || "",
    mimeType: req.file?.mimetype || "",
    size: req.file?.size || 0,
    createdBy: req.user.id
  });
  if (lead.status === "New Lead" || lead.status === "Contacted") lead.status = "Proposal Sent";
  lead.opportunityScore = opportunityScore(lead.status);
  await lead.save();
  await ActivityLog.create({ userId: req.user.id, action: "marketing_proposal_added", meta: { leadId: lead._id } });
  res.status(201).json(lead);
});

router.put("/leads/:id/partnership", async (req, res) => {
  const lead = await MarketingLead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  lead.partnership = {
    agreementDate: parseDate(req.body.agreementDate),
    coursesPurchased: safeText(req.body.coursesPurchased),
    studentCount: asNumber(req.body.studentCount),
    duration: safeText(req.body.duration),
    status: safeText(req.body.status) || "Pending"
  };
  if (["Signed", "Active"].includes(lead.partnership.status)) {
    lead.status = "Converted";
    lead.opportunityScore = "Hot";
  }
  await lead.save();
  await createSchoolForConvertedLead(lead, req.user.id);
  res.json(await MarketingLead.findById(lead._id).populate("convertedSchoolId", "name code"));
});

router.get("/reports/:type", async (req, res) => {
  const leads = await MarketingLead.find({}).sort({ createdAt: -1 }).lean();
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();
  const type = req.params.type;
  const fileNames = {
    leads: `Leads_Report_${month}_${year}.csv`,
    visits: `School_Visits_${month}_${year}.csv`,
    activities: `Marketing_Activities_${month}_${year}.csv`,
    conversion: `Conversion_Report_Q${Math.floor(now.getMonth() / 3) + 1}_${year}.csv`,
    partnership: `Partnership_Report_${year}.csv`
  };
  let rows = [["Institution", "Type", "Status", "Contact", "Phone", "City", "Revenue Potential"]];
  if (type === "visits") rows = [["Institution", "Visit Type", "Date", "Meeting With", "Response", "Next Action"], ...leads.flatMap((lead) => (lead.visits || []).map((visit) => [lead.institutionName, visit.visitType, visit.date, visit.meetingWith, visit.response, visit.nextAction]))];
  else if (type === "activities") rows = [["Institution", "Date", "Type", "Activity", "Outcome", "Hours", "Next Action"], ...leads.flatMap((lead) => (lead.workLogs || []).map((log) => [lead.institutionName, log.date, log.type, log.activity, log.outcome, log.hoursSpent, log.nextAction]))];
  else if (type === "conversion") rows = [["Institution", "Type", "Status", "Score", "Revenue Potential", "Converted School"], ...leads.map((lead) => [lead.institutionName, lead.leadType, lead.status, lead.opportunityScore, lead.revenuePotential, lead.convertedSchoolId || ""])];
  else if (type === "partnership") rows = [["School", "Agreement Date", "Courses", "Student Count", "Duration", "Status"], ...leads.map((lead) => [lead.institutionName, lead.partnership?.agreementDate || "", lead.partnership?.coursesPurchased || "", lead.partnership?.studentCount || "", lead.partnership?.duration || "", lead.partnership?.status || ""])];
  else rows = [rows[0], ...leads.map((lead) => [lead.institutionName, lead.leadType, lead.status, lead.contactPerson, lead.phoneNumber, lead.city, lead.revenuePotential])];
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileNames[type] || fileNames.leads}"`);
  res.send(csv(rows));
});

module.exports = router;
