import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, BarChart3, Building2, CalendarClock, CheckCircle2, FileUp, Handshake, LineChart, PhoneCall, Plus, Target, TrendingUp, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Funnel, FunnelChart, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AdminShell from "@/components/layout/AdminShell";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const leadTypes = ["School", "Tuition Centre", "Academy", "Training Institute", "Educational Franchise", "Corporate Training Lead", "Other"];
const statuses = ["New Lead", "Contacted", "Meeting Scheduled", "Meeting Completed", "Demo Scheduled", "Demo Completed", "Proposal Sent", "Negotiation", "Interested", "Not Interested", "Follow-Up Required", "Converted", "Lost"];
const pipeline = ["New Lead", "Contacted", "Meeting Scheduled", "Demo Scheduled", "Proposal Sent", "Converted"];
const sources = ["Field Visit", "Google Ads", "Website Enquiry", "Referral", "WhatsApp", "Walk-In", "Social Media", "Other"];
const colors = ["#0f172a", "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

const emptyLead = {
  institutionName: "",
  leadType: "School",
  status: "New Lead",
  leadSource: "Field Visit",
  principalName: "",
  coordinatorName: "",
  contactPerson: "",
  phoneNumber: "",
  email: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  website: "",
  studentStrength: "",
  gradesServed: "",
  revenuePotential: "",
  nextFollowUpDate: "",
  nextAction: "",
  notes: ""
};

function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${props.className || ""}`} />;
}

function formatMoney(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function field(label: string, value: any, onChange: (value: string) => void, type = "text") {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

export default function MarketingDashboard() {
  const { token, user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyLead);
  const [visit, setVisit] = useState<any>({ visitType: "School Visit", date: new Date().toISOString().slice(0, 10), purpose: "", meetingWith: "", response: "", nextAction: "", followUpDate: "" });
  const [workLog, setWorkLog] = useState<any>({ date: new Date().toISOString().slice(0, 10), type: "School Visit", activity: "", outcome: "", remarks: "", hoursSpent: "", nextAction: "" });
  const [followUp, setFollowUp] = useState<any>({ title: "", dueDate: "", type: "Follow-Up", notes: "" });
  const [proposal, setProposal] = useState<any>({ title: "", documentType: "Proposal PDF", version: "v1", status: "Sent", dateSent: new Date().toISOString().slice(0, 10), file: null });
  const [partnership, setPartnership] = useState<any>({ agreementDate: "", coursesPurchased: "", studentCount: "", duration: "", status: "Pending" });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const canEdit = user?.role === "cmo";

  const load = () => {
    Promise.all([apiFetch("/marketing/dashboard", {}, token), apiFetch("/marketing/leads", {}, token)])
      .then(([dash, rows]) => {
        setDashboard(dash);
        setLeads(rows || []);
        setSelected((current: any) => current ? (rows || []).find((row: any) => row._id === current._id) || current : (rows || [])[0] || null);
        setError("");
      })
      .catch((err) => setError(err.message || "Unable to load marketing data"));
  };

  useEffect(load, [token]);

  const stats = dashboard?.summary || {};
  const selectedLead = selected || leads[0];
  const kpis = [
    ["Total Leads", stats.totalLeads, Target],
    ["Schools Contacted", stats.schoolsContacted, Building2],
    ["Tuition Centres", stats.tuitionCentresContacted, Users],
    ["Meetings Scheduled", stats.meetingsScheduled, CalendarClock],
    ["Meetings Completed", stats.meetingsCompleted, CheckCircle2],
    ["Follow-Ups Pending", stats.followUpsPending, PhoneCall],
    ["Schools Interested", stats.schoolsInterested, TrendingUp],
    ["Schools Converted", stats.schoolsConverted, Handshake],
    ["Partnerships Signed", stats.partnershipsSigned, Handshake],
    ["Monthly Conversion", `${stats.monthlyConversionRate || 0}%`, BarChart3],
    ["Revenue Potential", formatMoney(stats.revenuePotential), LineChart]
  ];

  const groupedPipeline = useMemo(() => pipeline.map((status) => ({ status, leads: leads.filter((lead) => lead.status === status) })), [leads]);

  const openCreate = () => {
    setForm(emptyLead);
    setSelected(null);
    setOpen(true);
  };

  const openEdit = (lead: any) => {
    setSelected(lead);
    setForm({ ...emptyLead, ...lead, nextFollowUpDate: lead.nextFollowUpDate ? String(lead.nextFollowUpDate).slice(0, 10) : "" });
    setOpen(true);
  };

  const saveLead = async (event: React.FormEvent) => {
    event.preventDefault();
    const targetId = selected?._id;
    await apiFetch(targetId ? `/marketing/leads/${targetId}` : "/marketing/leads", { method: targetId ? "PUT" : "POST", body: form }, token);
    setOpen(false);
    load();
  };

  const postSubRecord = async (path: string, body: any) => {
    if (!selectedLead) return;
    await apiFetch(`/marketing/leads/${selectedLead._id}/${path}`, { method: "POST", body }, token);
    load();
  };

  const uploadProposal = async () => {
    if (!selectedLead) return;
    const body = new FormData();
    Object.entries(proposal).forEach(([key, value]: any) => {
      if (value) body.append(key, value);
    });
    await apiFetch(`/marketing/leads/${selectedLead._id}/proposals`, { method: "POST", body }, token);
    setProposal({ title: "", documentType: "Proposal PDF", version: "v1", status: "Sent", dateSent: new Date().toISOString().slice(0, 10), file: null });
    load();
  };

  const savePartnership = async () => {
    if (!selectedLead) return;
    await apiFetch(`/marketing/leads/${selectedLead._id}/partnership`, { method: "PUT", body: partnership }, token);
    load();
  };

  const downloadReport = async (type: string) => {
    const XLSX = await import("xlsx");
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "long" });
    const year = now.getFullYear();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const fileNames: Record<string, string> = {
      leads: `Leads_Report_${month}_${year}.xlsx`,
      visits: `School_Visits_${month}_${year}.xlsx`,
      activities: `Marketing_Activities_${month}_${year}.xlsx`,
      conversion: `Conversion_Report_Q${quarter}_${year}.xlsx`,
      partnership: `Partnership_Report_${year}.xlsx`
    };
    const rows =
      type === "visits" ? leads.flatMap((lead) => (lead.visits || []).map((visit: any) => ({ Institution: lead.institutionName, "Visit Type": visit.visitType, Date: visit.date, "Meeting With": visit.meetingWith, Response: visit.response, "Next Action": visit.nextAction }))) :
      type === "activities" ? leads.flatMap((lead) => (lead.workLogs || []).map((log: any) => ({ Institution: lead.institutionName, Date: log.date, Type: log.type, Activity: log.activity, Outcome: log.outcome, Hours: log.hoursSpent, "Next Action": log.nextAction }))) :
      type === "conversion" ? leads.map((lead) => ({ Institution: lead.institutionName, Type: lead.leadType, Status: lead.status, Score: lead.opportunityScore, "Revenue Potential": lead.revenuePotential, "Converted School": lead.convertedSchoolId?.name || "" })) :
      type === "partnership" ? leads.map((lead) => ({ School: lead.institutionName, "Agreement Date": lead.partnership?.agreementDate || "", Courses: lead.partnership?.coursesPurchased || "", "Student Count": lead.partnership?.studentCount || "", Duration: lead.partnership?.duration || "", Status: lead.partnership?.status || "" })) :
      leads.map((lead) => ({ Institution: lead.institutionName, Type: lead.leadType, Status: lead.status, Contact: lead.contactPerson, Phone: lead.phoneNumber, City: lead.city, "Revenue Potential": lead.revenuePotential }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), "Report");
    XLSX.writeFile(workbook, fileNames[type] || fileNames.leads);
  };

  return (
    <AdminShell
      title={user?.role === "cto" ? "Marketing & Onboarding Visibility" : user?.role === "admin" ? "Marketing Overview" : "CMO Dashboard"}
      subtitle={user?.role === "cmo" ? "Manage acquisition, visits, proposals, follow-ups, partnerships, and daily marketing work" : "Executive visibility into business growth, acquisition funnel, and school onboarding"}
    >
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["leads", "visits", "activities", "conversion", "partnership"].map((type) => (
            <Button key={type} variant="outline" size="sm" onClick={() => downloadReport(type)}>
              <ArrowDownToLine className="mr-2 h-4 w-4" />{type}
            </Button>
          ))}
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
              <DialogHeader><DialogTitle>{selected?._id ? "Edit Lead" : "Create Lead"}</DialogTitle></DialogHeader>
              <form onSubmit={saveLead} className="grid gap-3 md:grid-cols-3">
                {field("Institution Name", form.institutionName, (value) => setForm({ ...form, institutionName: value }))}
                <div className="space-y-1.5"><Label>Lead Type</Label><NativeSelect value={form.leadType} onChange={(event) => setForm({ ...form, leadType: event.target.value })}>{leadTypes.map((item) => <option key={item}>{item}</option>)}</NativeSelect></div>
                <div className="space-y-1.5"><Label>Status</Label><NativeSelect value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{statuses.map((item) => <option key={item}>{item}</option>)}</NativeSelect></div>
                <div className="space-y-1.5"><Label>Lead Source</Label><NativeSelect value={form.leadSource} onChange={(event) => setForm({ ...form, leadSource: event.target.value })}>{sources.map((item) => <option key={item}>{item}</option>)}</NativeSelect></div>
                {field("Principal Name", form.principalName, (value) => setForm({ ...form, principalName: value }))}
                {field("Coordinator Name", form.coordinatorName, (value) => setForm({ ...form, coordinatorName: value }))}
                {field("Contact Person", form.contactPerson, (value) => setForm({ ...form, contactPerson: value }))}
                {field("Phone Number", form.phoneNumber, (value) => setForm({ ...form, phoneNumber: value }))}
                {field("Email", form.email, (value) => setForm({ ...form, email: value }), "email")}
                {field("City", form.city, (value) => setForm({ ...form, city: value }))}
                {field("State", form.state, (value) => setForm({ ...form, state: value }))}
                {field("Country", form.country, (value) => setForm({ ...form, country: value }))}
                {field("Website", form.website, (value) => setForm({ ...form, website: value }))}
                {field("Student Strength", form.studentStrength, (value) => setForm({ ...form, studentStrength: value }), "number")}
                {field("Grades Served", form.gradesServed, (value) => setForm({ ...form, gradesServed: value }))}
                {field("Revenue Potential", form.revenuePotential, (value) => setForm({ ...form, revenuePotential: value }), "number")}
                {field("Follow-Up Date", form.nextFollowUpDate, (value) => setForm({ ...form, nextFollowUpDate: value }), "date")}
                {field("Next Action", form.nextAction, (value) => setForm({ ...form, nextAction: value }))}
                <div className="space-y-1.5 md:col-span-3"><Label>Address</Label><Textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div>
                <div className="space-y-1.5 md:col-span-3"><Label>Notes</Label><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
                <div className="md:col-span-3 flex justify-end"><Button type="submit">Save Lead</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        {kpis.map(([label, value, Icon]: any) => (
          <Card key={label} className="rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-slate-500">{label}</CardTitle>
              <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 dark:bg-slate-900"><Icon className="h-4 w-4" /></span>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{value ?? 0}</p></CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pipeline" className="mt-4 space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-6">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-6">
            {groupedPipeline.map((column) => (
              <div key={column.status} className="min-h-72 rounded-lg border bg-white p-3 dark:bg-slate-950">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">{column.status}</p>
                  <Badge variant="outline">{column.leads.length}</Badge>
                </div>
                <div className="space-y-2">
                  {column.leads.map((lead) => (
                    <button key={lead._id} onClick={() => setSelected(lead)} className="w-full rounded-md border bg-slate-50 p-3 text-left hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800">
                      <p className="truncate text-sm font-semibold">{lead.institutionName}</p>
                      <p className="text-xs text-slate-500">{lead.leadType} - {lead.city || "No city"}</p>
                      <Badge className={`mt-2 ${lead.opportunityScore === "Hot" ? "bg-red-50 text-red-700" : lead.opportunityScore === "Warm" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{lead.opportunityScore}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leads">
          <Card className="rounded-lg">
            <CardHeader><CardTitle>Lead Management</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Institution</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Contact</TableHead><TableHead>Follow-Up</TableHead><TableHead>Revenue</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead._id}>
                      <TableCell className="font-medium">{lead.institutionName}</TableCell>
                      <TableCell>{lead.leadType}</TableCell>
                      <TableCell><Badge variant="outline">{lead.status}</Badge></TableCell>
                      <TableCell>{lead.contactPerson || lead.principalName}<p className="text-xs text-slate-500">{lead.phoneNumber}</p></TableCell>
                      <TableCell>{lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{formatMoney(lead.revenuePotential)}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => openEdit(lead)}>Open</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-lg">
            <CardHeader><CardTitle>Selected Lead</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <NativeSelect value={selectedLead?._id || ""} onChange={(event) => setSelected(leads.find((lead) => lead._id === event.target.value))}>
                {leads.map((lead) => <option key={lead._id} value={lead._id}>{lead.institutionName}</option>)}
              </NativeSelect>
              {selectedLead && (
                <div className="rounded-md border p-3">
                  <p className="font-semibold">{selectedLead.institutionName}</p>
                  <p className="text-sm text-slate-500">{selectedLead.status} - {selectedLead.opportunityScore}</p>
                  <p className="mt-2 text-sm">{selectedLead.nextAction || "No next action recorded."}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-lg">
              <CardHeader><CardTitle>School / Centre Visit</CardTitle></CardHeader>
              <CardContent className="grid gap-3">
                <NativeSelect value={visit.visitType} onChange={(event) => setVisit({ ...visit, visitType: event.target.value })}>{["School Visit", "Tuition Centre Visit", "Meeting", "Demo"].map((item) => <option key={item}>{item}</option>)}</NativeSelect>
                <Input type="date" value={visit.date} onChange={(event) => setVisit({ ...visit, date: event.target.value })} />
                <Input placeholder="Meeting with" value={visit.meetingWith} onChange={(event) => setVisit({ ...visit, meetingWith: event.target.value })} />
                <Textarea placeholder="Discussion summary" value={visit.discussionSummary || ""} onChange={(event) => setVisit({ ...visit, discussionSummary: event.target.value })} />
                <Input placeholder="Response" value={visit.response} onChange={(event) => setVisit({ ...visit, response: event.target.value })} />
                <Input placeholder="Next action" value={visit.nextAction} onChange={(event) => setVisit({ ...visit, nextAction: event.target.value })} />
                <Input type="date" value={visit.followUpDate} onChange={(event) => setVisit({ ...visit, followUpDate: event.target.value })} />
                <Button disabled={!canEdit || !selectedLead} onClick={() => postSubRecord("visits", visit)}>Log Visit</Button>
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader><CardTitle>Daily Marketing Work Log</CardTitle></CardHeader>
              <CardContent className="grid gap-3">
                <Input type="date" value={workLog.date} onChange={(event) => setWorkLog({ ...workLog, date: event.target.value })} />
                <Input placeholder="Activity" value={workLog.activity} onChange={(event) => setWorkLog({ ...workLog, activity: event.target.value })} />
                <Input placeholder="Outcome" value={workLog.outcome} onChange={(event) => setWorkLog({ ...workLog, outcome: event.target.value })} />
                <Input type="number" placeholder="Hours spent" value={workLog.hoursSpent} onChange={(event) => setWorkLog({ ...workLog, hoursSpent: event.target.value })} />
                <Textarea placeholder="Remarks" value={workLog.remarks} onChange={(event) => setWorkLog({ ...workLog, remarks: event.target.value })} />
                <Input placeholder="Next action" value={workLog.nextAction} onChange={(event) => setWorkLog({ ...workLog, nextAction: event.target.value })} />
                <Button disabled={!canEdit || !selectedLead} onClick={() => postSubRecord("work-logs", workLog)}>Add Daily Entry</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="proposals" className="grid gap-4 xl:grid-cols-3">
          <Card className="rounded-lg">
            <CardHeader><CardTitle>Follow-Up Reminder</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Input placeholder="Reminder title" value={followUp.title} onChange={(event) => setFollowUp({ ...followUp, title: event.target.value })} />
              <NativeSelect value={followUp.type} onChange={(event) => setFollowUp({ ...followUp, type: event.target.value })}>{["Follow-Up", "Meeting", "Demo", "Proposal"].map((item) => <option key={item}>{item}</option>)}</NativeSelect>
              <Input type="date" value={followUp.dueDate} onChange={(event) => setFollowUp({ ...followUp, dueDate: event.target.value })} />
              <Textarea placeholder="Notes" value={followUp.notes} onChange={(event) => setFollowUp({ ...followUp, notes: event.target.value })} />
              <Button disabled={!canEdit || !selectedLead} onClick={() => postSubRecord("follow-ups", followUp)}>Create Reminder</Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader><CardTitle>Proposal Management</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Input placeholder="Title" value={proposal.title} onChange={(event) => setProposal({ ...proposal, title: event.target.value })} />
              <NativeSelect value={proposal.documentType} onChange={(event) => setProposal({ ...proposal, documentType: event.target.value })}>{["Proposal PDF", "Brochure", "Presentation Deck", "Contract", "MOU", "Marketing Material"].map((item) => <option key={item}>{item}</option>)}</NativeSelect>
              <Input placeholder="Version" value={proposal.version} onChange={(event) => setProposal({ ...proposal, version: event.target.value })} />
              <Input type="date" value={proposal.dateSent} onChange={(event) => setProposal({ ...proposal, dateSent: event.target.value })} />
              <Input type="file" onChange={(event) => setProposal({ ...proposal, file: event.target.files?.[0] || null })} />
              <Button disabled={!canEdit || !selectedLead} onClick={uploadProposal}><FileUp className="mr-2 h-4 w-4" />Upload Proposal</Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader><CardTitle>Partnership</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <Input type="date" value={partnership.agreementDate} onChange={(event) => setPartnership({ ...partnership, agreementDate: event.target.value })} />
              <Input placeholder="Courses purchased" value={partnership.coursesPurchased} onChange={(event) => setPartnership({ ...partnership, coursesPurchased: event.target.value })} />
              <Input type="number" placeholder="Student count" value={partnership.studentCount} onChange={(event) => setPartnership({ ...partnership, studentCount: event.target.value })} />
              <Input placeholder="Duration" value={partnership.duration} onChange={(event) => setPartnership({ ...partnership, duration: event.target.value })} />
              <NativeSelect value={partnership.status} onChange={(event) => setPartnership({ ...partnership, status: event.target.value })}>{["Pending", "Signed", "Active", "Renewal Due", "Closed"].map((item) => <option key={item}>{item}</option>)}</NativeSelect>
              <Button disabled={!canEdit || !selectedLead} onClick={savePartnership}>Save Partnership</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="grid gap-4 xl:grid-cols-2">
          <Card className="rounded-lg"><CardHeader><CardTitle>Lead Conversion Funnel</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer><FunnelChart><Tooltip /><Funnel dataKey="value" data={dashboard?.funnel || []} isAnimationActive><LabelListPlaceholder /></Funnel></FunnelChart></ResponsiveContainer></CardContent></Card>
          <Card className="rounded-lg"><CardHeader><CardTitle>School Type Distribution</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer><PieChart><Pie data={dashboard?.typeDistribution || []} dataKey="value" nameKey="name" outerRadius={110} label>{(dashboard?.typeDistribution || []).map((_: any, index: number) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
          <Card className="rounded-lg"><CardHeader><CardTitle>Lead Source Analytics</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer><BarChart data={dashboard?.sourceAnalytics || []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" hide /><YAxis /><Tooltip /><Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
          <Card className="rounded-lg"><CardHeader><CardTitle>Visit Activity Trends</CardTitle></CardHeader><CardContent className="h-80"><ResponsiveContainer><AreaChart data={dashboard?.visitTrends || []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Area type="monotone" dataKey="visits" stroke="#16a34a" fill="#bbf7d0" /></AreaChart></ResponsiveContainer></CardContent></Card>
        </TabsContent>

        <TabsContent value="monitoring" className="grid gap-4 xl:grid-cols-3">
          {[
            ["Today's Activities", dashboard?.activities?.today || []],
            ["Weekly Activities", dashboard?.activities?.weekly || []],
            ["Monthly Activities", dashboard?.activities?.monthly || []]
          ].map(([title, rows]: any) => (
            <Card key={title} className="rounded-lg">
              <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {rows.slice(0, 6).map((row: any, index: number) => <div key={index} className="rounded-md border p-3"><p className="text-sm font-medium">{row.institutionName}</p><p className="text-xs text-slate-500">{row.activity} - {row.outcome}</p></div>)}
                {!rows.length && <p className="py-8 text-center text-sm text-slate-500">No records yet.</p>}
              </CardContent>
            </Card>
          ))}
          {user?.role === "cto" && (
            <Card className="rounded-lg xl:col-span-3">
              <CardHeader><CardTitle>Upcoming School Onboardings</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>School</TableHead><TableHead>Status</TableHead><TableHead>Pending Academic Setup</TableHead><TableHead>Teacher Allocation</TableHead></TableRow></TableHeader>
                  <TableBody>{(dashboard?.ctoOnboarding || []).map((row: any) => <TableRow key={row.leadId}><TableCell>{row.institutionName}</TableCell><TableCell>{row.onboardingStatus}</TableCell><TableCell>{row.pendingAcademicSetup}</TableCell><TableCell>{row.studentStrength ? `${Math.ceil(row.studentStrength / 100)} suggested` : "Review required"}</TableCell></TableRow>)}</TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function LabelListPlaceholder() {
  return null;
}
