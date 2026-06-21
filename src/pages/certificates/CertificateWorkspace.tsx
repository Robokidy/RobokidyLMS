/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { Award, BarChart3, CheckCircle2, Download, Eye, FileSpreadsheet, FileText, Loader2, Search, ShieldCheck, Users, XCircle } from "lucide-react";
import { apiFetch, apiUrl } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const years = ["2024-25", "2025-26", "2026-27"];
const today = new Date().toISOString().slice(0, 10);

function certUrl(path: string) {
  return apiUrl(path);
}

function dateLabel(value?: string) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function gradeNumber(value?: string) {
  const match = String(value || "").match(/\d+/);
  return match ? match[0] : "";
}

function statusBadge(status = "active") {
  const styles: Record<string, string> = {
    active: "bg-blue-100 text-blue-700",
    revoked: "bg-red-100 text-red-700",
    pending_upload: "bg-amber-100 text-amber-700",
    expired: "bg-slate-100 text-slate-700"
  };
  return <Badge className={styles[status] || styles.active}>{status.replace("_", " ").toUpperCase()}</Badge>;
}

function Metric({ label, value, icon: Icon }: any) {
  return (
    <Card className="border-white bg-white shadow-sm">
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#1a1a2e]">{value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#c9a227]/15 text-[#9a7a18]"><Icon className="h-5 w-5" /></span>
      </CardContent>
    </Card>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5">{children}</div>;
}

export default function CertificateWorkspace() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [meta, setMeta] = useState<any>({ schools: [], classes: [], students: [], courses: [] });
  const [certificates, setCertificates] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [filter, setFilter] = useState({ search: "", schoolId: "", grade: "", academicYear: "", status: "" });
  const [form, setForm] = useState({ schoolId: "", classId: "", academicYear: "2025-26", grade: "", courseName: "", issueDate: today });
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState(1);
  const isExecutive = user?.role === "admin" || user?.role === "cto";

  const routeTab = location.pathname.includes("analytics") ? "analytics" : location.pathname.includes("templates") ? "templates" : location.pathname.includes("issued") ? "issued" : "generate";

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filter).forEach(([key, value]) => value && params.set(key, value));
      const [metaData, listData, analyticsData, templateData] = await Promise.all([
        apiFetch("/certificates/meta", {}, token),
        apiFetch(`/certificates?${params.toString()}`, {}, token),
        isExecutive ? apiFetch("/certificates/analytics", {}, token).catch(() => null) : Promise.resolve(null),
        isExecutive ? apiFetch("/certificates/templates", {}, token).catch(() => []) : Promise.resolve([])
      ]);
      setMeta(metaData);
      setCertificates(listData?.rows || []);
      setAnalytics(analyticsData);
      setTemplates(templateData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [token, filter.search, filter.schoolId, filter.grade, filter.academicYear, filter.status]);

  const classes = useMemo(() => meta.classes.filter((klass: any) => !form.schoolId || String(klass.schoolId) === form.schoolId), [meta.classes, form.schoolId]);
  const students = useMemo(() => meta.students.filter((student: any) => {
    if (form.classId && !(student.classSectionIds || []).map(String).includes(form.classId)) return false;
    if (form.grade && gradeNumber(student.grade) !== String(form.grade)) return false;
    return true;
  }), [meta.students, form.classId, form.grade]);

  useEffect(() => {
    setSelectedStudentIds(students.map((student: any) => student._id));
  }, [form.classId, form.grade, students.length]);

  const selectedStudents = students.filter((student: any) => selectedStudentIds.includes(student._id));
  const selectedSchool = meta.schools.find((school: any) => school._id === form.schoolId);
  const firstIdPreview = selectedSchool && form.grade ? `RK-${selectedSchool.code}-G${String(form.grade).padStart(2, "0")}-${form.academicYear}-001` : "RK-AKT-G03-2025-26-001";
  const progress = result?.total ? Math.round(((result.results || []).length / result.total) * 100) : generating ? 45 : 0;

  const generate = async () => {
    if (!form.classId || !form.courseName || !form.academicYear || !selectedStudentIds.length) {
      toast({ title: "Missing details", description: "Select class, course, academic year, and at least one student." });
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const data = await apiFetch("/certificates/generate-bulk", {
        method: "POST",
        body: { ...form, studentIds: selectedStudentIds, grade: form.grade || undefined }
      }, token);
      setResult(data);
      toast({ title: "Certificates generated", description: `${data.results?.filter((row: any) => !row.failed).length || 0} certificates are ready.` });
      await load();
      setStep(3);
    } catch (error: any) {
      toast({ title: "Generation failed", description: error.message || "Could not generate certificates" });
    } finally {
      setGenerating(false);
    }
  };

  const downloadZip = async (batchId: string) => {
    if (!token) return;
    const response = await fetch(certUrl(`/certificates/download-zip/${batchId}`), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      toast({ title: "Download failed", description: "Could not prepare the certificate ZIP." });
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "robokidy-certificates.zip";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const revoke = async (certificateId: string) => {
    const reason = window.prompt("Reason for revocation");
    if (reason === null) return;
    await apiFetch(`/certificates/revoke/${certificateId}`, { method: "PUT", body: { reason } }, token);
    toast({ title: "Certificate revoked" });
    load();
  };

  const exportExcel = () => {
    const rows = certificates.map((certificate) => ({
      "Certificate ID": certificate.certificateId,
      "Student Name": certificate.studentName,
      "Roll Number": certificate.rollNumber,
      School: certificate.schoolName,
      Grade: certificate.grade,
      Class: certificate.className,
      Course: certificate.courseName,
      "Issue Date": dateLabel(certificate.issueDate),
      "Generated By": certificate.generatedByName,
      Status: certificate.status,
      "Verification Count": certificate.verificationCount
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Certificates");
    XLSX.writeFile(workbook, "robokidy-certificates.xlsx");
  };

  const uploadTemplate = async (file?: File | null) => {
    if (!file || !token) return;
    const formData = new FormData();
    formData.append("template", file);
    formData.append("name", file.name.replace(/\.pdf$/i, ""));
    formData.append("version", `v${templates.length + 1}`);
    formData.append("active", "true");
    await apiFetch("/certificates/templates", { method: "POST", body: formData }, token);
    toast({ title: "Template uploaded", description: "The uploaded PDF is now the active certificate template." });
    load();
  };

  const activateTemplate = async (id: string) => {
    await apiFetch(`/certificates/templates/${id}/activate`, { method: "PUT" }, token);
    toast({ title: "Template activated" });
    load();
  };

  const content = (
    <Shell>
      <div className="rounded-xl bg-[#1a1a2e] p-5 text-white shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c9a227]">Robokidy Certificates</p>
            <h2 className="mt-2 text-2xl font-bold">Certificate Management System</h2>
            <p className="mt-1 text-sm text-white/70">Generate, verify, revoke, export, and download student certificates.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["generate", "issued", "templates", ...(isExecutive ? ["analytics"] : [])].map((tab) => (
              <Button key={tab} variant={routeTab === tab ? "secondary" : "outline"} className={routeTab === tab ? "bg-[#c9a227] text-[#1a1a2e]" : "border-white/30 bg-transparent text-white hover:bg-white/10"} asChild>
                <a href={user?.role === "teacher" ? `/teacher/certificates/${tab === "generate" ? "" : tab}` : `/${user?.role === "cto" ? "cto" : "admin"}/certificates/${tab === "generate" ? "" : tab}`}>{tab[0].toUpperCase() + tab.slice(1)}</a>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {routeTab === "generate" && (
        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="border-white bg-white shadow-sm">
            <CardHeader><CardTitle>Generate Certificates</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((item) => <div key={item} className={`h-2 rounded-full ${step >= item ? "bg-[#c9a227]" : "bg-slate-200"}`} />)}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <NativeSelect value={form.schoolId} onChange={(event) => setForm({ ...form, schoolId: event.target.value, classId: "" })}>
                  <option value="">Select school</option>
                  {meta.schools.map((school: any) => <option key={school._id} value={school._id}>{school.name}</option>)}
                </NativeSelect>
                <NativeSelect value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })}>{years.map((year) => <option key={year}>{year}</option>)}</NativeSelect>
                <NativeSelect value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value, classId: "" })}>
                  <option value="">Grade</option>
                  {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>Grade {index + 1}</option>)}
                </NativeSelect>
                <NativeSelect value={form.classId} onChange={(event) => { setForm({ ...form, classId: event.target.value }); setStep(2); }}>
                  <option value="">Class</option>
                  {classes.filter((klass: any) => !form.grade || gradeNumber(klass.grade) === String(form.grade)).map((klass: any) => <option key={klass._id} value={klass._id}>{klass.name || `${klass.grade} ${klass.section}`}</option>)}
                </NativeSelect>
                <Input list="certificate-courses" value={form.courseName} onChange={(event) => setForm({ ...form, courseName: event.target.value })} placeholder="Course name" />
                <datalist id="certificate-courses">{meta.courses.map((course: any) => <option key={course._id} value={course.name} />)}</datalist>
                <Input type="date" value={form.issueDate} onChange={(event) => setForm({ ...form, issueDate: event.target.value })} />
              </div>
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="text-sm font-semibold">Certificate ID Preview</p>
                <p className="mt-2 font-mono text-lg text-[#1a1a2e]">{firstIdPreview}</p>
                <p className="mt-1 text-xs text-slate-500">Running numbers restart from 001 for every batch.</p>
              </div>
              <Button className="w-full bg-[#1a1a2e] hover:bg-[#252542]" onClick={generate} disabled={generating || !selectedStudentIds.length}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
                Generate Selected Certificates
              </Button>
              {(generating || result) && <div className="space-y-2"><Progress value={progress} /><p className="text-sm text-slate-600">{result ? `${result.results?.length || 0} / ${result.total} processed` : "Generating certificates..."}</p></div>}
              {result?.batchId && <Button variant="outline" onClick={() => downloadZip(result.batchId)}><Download className="mr-2 h-4 w-4" />Download All as ZIP</Button>}
            </CardContent>
          </Card>

          <Card className="border-white bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Select Students</CardTitle>
              <Badge className="bg-[#c9a227] text-[#1a1a2e]">{selectedStudentIds.length} selected</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedStudentIds(students.map((student: any) => student._id))}>Select All</Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedStudentIds([])}>Deselect All</Button>
              </div>
              <div className="max-h-[460px] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-10"></TableHead><TableHead>Roll No</TableHead><TableHead>Student Name</TableHead><TableHead>Grade</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {students.map((student: any) => (
                      <TableRow key={student._id}>
                        <TableCell><input type="checkbox" checked={selectedStudentIds.includes(student._id)} onChange={(event) => setSelectedStudentIds((current) => event.target.checked ? [...current, student._id] : current.filter((id) => id !== student._id))} /></TableCell>
                        <TableCell>{student.rollNumber || student.studentId || "N/A"}</TableCell>
                        <TableCell className="font-medium">{student.fullName || student.username}</TableCell>
                        <TableCell>{student.grade || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {!students.length && <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">{loading ? "Loading students..." : "Select a class to load students."}</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-slate-500">{selectedStudents.length} students selected for this batch.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {routeTab === "issued" && (
        <Card className="border-white bg-white shadow-sm">
          <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Issued Certificates</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="mr-2 h-4 w-4" />Export Excel</Button>
              <Input className="w-64" value={filter.search} onChange={(event) => setFilter({ ...filter, search: event.target.value })} placeholder="Search name or ID" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-4">
              <NativeSelect value={filter.schoolId} onChange={(event) => setFilter({ ...filter, schoolId: event.target.value })}><option value="">All schools</option>{meta.schools.map((school: any) => <option key={school._id} value={school._id}>{school.name}</option>)}</NativeSelect>
              <NativeSelect value={filter.grade} onChange={(event) => setFilter({ ...filter, grade: event.target.value })}><option value="">All grades</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>Grade {index + 1}</option>)}</NativeSelect>
              <NativeSelect value={filter.academicYear} onChange={(event) => setFilter({ ...filter, academicYear: event.target.value })}><option value="">All years</option>{years.map((year) => <option key={year}>{year}</option>)}</NativeSelect>
              <NativeSelect value={filter.status} onChange={(event) => setFilter({ ...filter, status: event.target.value })}><option value="">All status</option><option value="active">Active</option><option value="revoked">Revoked</option><option value="pending_upload">Pending Upload</option></NativeSelect>
            </div>
            <div className="overflow-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow><TableHead>Certificate ID</TableHead><TableHead>Student</TableHead><TableHead>School</TableHead><TableHead>Grade</TableHead><TableHead>Course</TableHead><TableHead>Issue Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {certificates.map((certificate) => (
                    <TableRow key={certificate._id}>
                      <TableCell className="font-mono text-xs">{certificate.certificateId}</TableCell>
                      <TableCell className="font-medium">{certificate.studentName}</TableCell>
                      <TableCell>{certificate.schoolName}</TableCell>
                      <TableCell>{certificate.grade}</TableCell>
                      <TableCell>{certificate.courseName}</TableCell>
                      <TableCell>{dateLabel(certificate.issueDate)}</TableCell>
                      <TableCell>{statusBadge(certificate.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => setPreviewUrl(certificate.certificatePdfUrl)}><Eye className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" asChild><a href={certificate.certificatePdfUrl} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /></a></Button>
                          {isExecutive && certificate.status !== "revoked" && <Button size="icon" variant="ghost" className="text-red-600" onClick={() => revoke(certificate.certificateId)}><XCircle className="h-4 w-4" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!certificates.length && <TableRow><TableCell colSpan={8} className="py-10 text-center text-slate-500">No certificates found.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {routeTab === "templates" && (
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="border-white bg-white shadow-sm">
            <CardHeader><CardTitle>Active Template</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-[#c9a227]/40 bg-[#c9a227]/10 p-5">
                <FileText className="h-8 w-8 text-[#9a7a18]" />
                <h3 className="mt-3 text-lg font-bold text-[#1a1a2e]">Robokidy Master Template</h3>
                <p className="mt-1 text-sm text-slate-600">Dynamic certificate data is overlaid without altering the master design.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {meta.templateUrl ? <Button asChild><a href={meta.templateUrl} target="_blank" rel="noreferrer">Preview Template</a></Button> : <Badge variant="secondary">Fallback template active locally</Badge>}
                {isExecutive && (
                  <Button variant="outline" asChild>
                    <label className="cursor-pointer">
                      Upload New Template
                      <input type="file" accept="application/pdf" className="hidden" onChange={(event) => uploadTemplate(event.target.files?.[0])} />
                    </label>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="border-white bg-white shadow-sm">
            <CardHeader><CardTitle>Template Governance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Version</TableHead><TableHead>Uploaded By</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template._id}>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>{template.version}</TableCell>
                      <TableCell>{template.uploadedByName || "-"}</TableCell>
                      <TableCell>{template.active ? <Badge className="bg-green-100 text-green-700">ACTIVE</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" asChild><a href={template.fileUrl} target="_blank" rel="noreferrer">Preview</a></Button>
                          {!template.active && <Button size="sm" onClick={() => activateTemplate(template._id)}>Activate</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!templates.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-slate-500">{meta.templateUrl ? "Environment template is active." : "No uploaded templates yet."}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {routeTab === "analytics" && isExecutive && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Total" value={analytics?.totalCertificates || 0} icon={Award} />
            <Metric label="This Month" value={analytics?.certificatesThisMonth || 0} icon={BarChart3} />
            <Metric label="This Year" value={analytics?.certificatesThisYear || 0} icon={ShieldCheck} />
            <Metric label="Verifications" value={analytics?.totalVerifications || 0} icon={Search} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <SummaryTable title="Certificates by Grade" rows={analytics?.byGrade || []} labelKey="grade" />
            <SummaryTable title="Certificates by Course" rows={analytics?.byCourse || []} labelKey="courseName" />
            <SummaryTable title="Top Verified" rows={analytics?.mostVerified || []} labelKey="certificateId" countKey="verificationCount" />
            <SummaryTable title="By Teacher" rows={analytics?.byTeacher || []} labelKey="teacherName" />
          </div>
        </div>
      )}

      <Dialog open={Boolean(previewUrl)} onOpenChange={(open) => !open && setPreviewUrl("")}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>Certificate Preview</DialogTitle></DialogHeader>
          <iframe title="Certificate preview" src={previewUrl} className="h-[75vh] w-full rounded-lg border" />
        </DialogContent>
      </Dialog>
    </Shell>
  );

  return content;
}

function SummaryTable({ title, rows, labelKey, countKey = "count" }: any) {
  return (
    <Card className="border-white bg-white shadow-sm">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row: any, index: number) => <TableRow key={index}><TableCell>{row[labelKey]}</TableCell><TableCell className="text-right">{row[countKey]}</TableCell></TableRow>)}
            {!rows.length && <TableRow><TableCell colSpan={2} className="py-8 text-center text-slate-500">No data yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-10 rounded-md border bg-white px-3 text-sm ${props.className || ""}`} />;
}
