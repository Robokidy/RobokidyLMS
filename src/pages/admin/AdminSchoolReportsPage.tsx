import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import AdminShell from "@/components/layout/AdminShell";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const periodOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom Date Range" }
];

function dateLabel(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB");
}

function fileDate(value = new Date()) {
  const date = new Date(value);
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

function monthName(value = new Date()) {
  return new Date(value).toLocaleString("en-US", { month: "long" });
}

function schoolCode(report: any) {
  return String(report?.school?.code || report?.school?.name || "School").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
}

function reportFilename(report: any, extension: "xlsx" | "pdf") {
  const code = schoolCode(report);
  const start = new Date(report?.period?.start || new Date());
  const end = new Date(report?.period?.end || new Date());
  const period = report?.period?.type || "monthly";
  if (period === "monthly") return `${code}_Monthly_Academic_Report_${monthName(start)}_${start.getFullYear()}.${extension}`;
  if (period === "quarterly") return `${code}_Q${Math.floor(start.getMonth() / 3) + 1}_Academic_Report_${start.getFullYear()}.${extension}`;
  if (period === "yearly") return `${code}_Annual_Academic_Report_${start.getFullYear()}.${extension}`;
  if (period === "custom") return `${code}_Academic_Report_${fileDate(start)}_to_${fileDate(end)}.${extension}`;
  return `${code}_Academic_Report_${fileDate(end)}.${extension}`;
}

function rowsFromObject(obj: Record<string, any>) {
  return Object.entries(obj || {}).map(([Metric, Value]) => ({
    Metric,
    Value: Array.isArray(Value) ? Value.join(", ") : Value instanceof Date ? dateLabel(Value) : Value
  }));
}

function addSheet(workbook: XLSX.WorkBook, name: string, rows: any[]) {
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Status: "No records for selected period" }]);
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
}

function exportAcademicXlsx(report: any) {
  const workbook = XLSX.utils.book_new();
  addSheet(workbook, "Executive Summary", rowsFromObject({ ...report.executiveSummary, ...report.academicDelivery }));
  addSheet(workbook, "Curriculum Coverage", report.curriculumCoverage);
  addSheet(workbook, "Topics Covered", report.topicsCovered);
  addSheet(workbook, "Student Attendance", report.attendanceSummary?.studentAttendance);
  addSheet(workbook, "Teacher Attendance", report.attendanceSummary?.teacherAttendance);
  addSheet(workbook, "Assessment Analytics", rowsFromObject(report.assessmentAnalytics));
  addSheet(workbook, "Quiz Analytics", rowsFromObject(report.quizAnalytics));
  addSheet(workbook, "Student Performance", report.studentPerformance);
  addSheet(workbook, "Teacher Performance", report.teacherPerformance);
  addSheet(workbook, "Materials Utilized", report.materialsUtilized?.rows);
  addSheet(workbook, "Achievements", [
    { Metric: "Certificates Issued", Value: report.achievements?.certificatesIssued || 0 },
    { Metric: "Top Performing Class", Value: report.achievements?.topPerformingClass || "-" },
    { Metric: "Top Performing Teacher", Value: report.achievements?.topPerformingTeacher || "-" },
    ...(report.achievements?.assessmentToppers || []).map((row: any) => ({ Metric: "Assessment Topper", Value: `${row.studentName} (${row.overallScore}%)` })),
    ...(report.achievements?.bestAttendanceStudents || []).map((row: any) => ({ Metric: "Best Attendance", Value: `${row.studentName} (${row.attendancePercentage}%)` }))
  ]);
  addSheet(workbook, "Action Items", (report.actionItems || []).map((item: string) => ({ Observation: item })));
  XLSX.writeFile(workbook, reportFilename(report, "xlsx"));
}

function escapeHtml(value: any) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] || char));
}

function tableHtml(title: string, rows: any[], columns: string[]) {
  return `<section><h2>${escapeHtml(title)}</h2><table><thead><tr>${columns.map((col) => `<th>${escapeHtml(col)}</th>`).join("")}</tr></thead><tbody>${(rows || []).slice(0, 40).map((row) => `<tr>${columns.map((col) => `<td>${escapeHtml(row[col] ?? "")}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${columns.length}">No records for selected period</td></tr>`}</tbody></table></section>`;
}

function printPdf(report: any) {
  const filename = reportFilename(report, "pdf");
  const summary = report.executiveSummary || {};
  const delivery = report.academicDelivery || {};
  const html = `<!doctype html><html><head><title>${escapeHtml(filename.replace(".pdf", ""))}</title><style>
    @page { margin: 18mm; }
    body { font-family: Arial, sans-serif; color: #172033; margin: 0; }
    .cover { min-height: 85vh; display: flex; flex-direction: column; justify-content: center; border-bottom: 4px solid #0f172a; }
    h1 { font-size: 34px; margin: 0 0 12px; } h2 { margin-top: 28px; color: #0f172a; }
    .muted { color: #64748b; } .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
    .card { border: 1px solid #dbe3ef; border-radius: 8px; padding: 14px; } .card strong { display: block; font-size: 24px; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; } th, td { border: 1px solid #dbe3ef; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; } footer { position: fixed; bottom: 0; left: 0; right: 0; color: #64748b; font-size: 11px; display: flex; justify-content: space-between; }
  </style></head><body>
    <footer><span>Robokidy LMS Academic Reporting System</span><span>${escapeHtml(filename)}</span></footer>
    <div class="cover"><p class="muted">Robokidy LMS Academic Reporting System</p><h1>${escapeHtml(summary.schoolName)}</h1><h2>Academic Report</h2><p>${escapeHtml(summary.dateRange)}</p><p class="muted">Generated ${escapeHtml(dateLabel(summary.reportGeneratedDate))} by ${escapeHtml(summary.generatedBy)}</p></div>
    <section><h2>Executive Summary</h2><div class="cards">
      ${Object.entries({ Teachers: summary.teachersAssigned, Students: summary.studentsEnrolled, Classes: summary.classesCovered?.length || 0, Grades: summary.gradesCovered?.length || 0 }).map(([label, value]) => `<div class="card">${label}<strong>${escapeHtml(value)}</strong></div>`).join("")}
    </div></section>
    <section><h2>Academic Delivery Summary</h2><div class="cards">
      ${Object.entries(delivery).map(([label, value]) => `<div class="card">${escapeHtml(label.replace(/([A-Z])/g, " $1"))}<strong>${escapeHtml(value)}</strong></div>`).join("")}
    </div></section>
    ${tableHtml("Curriculum Coverage", report.curriculumCoverage, ["grade", "className", "courseName", "plannedLessons", "completedLessons", "coveragePercentage", "pendingLessons"])}
    ${tableHtml("Topics Covered", report.topicsCovered, ["date", "teacher", "className", "course", "lesson", "topicsCovered", "durationHours"])}
    ${tableHtml("Student Performance", report.studentPerformance, ["studentName", "grade", "className", "assessmentAverage", "quizAverage", "attendancePercentage", "overallScore"])}
    ${tableHtml("Teacher Activity Summary", report.teacherPerformance, ["teacherName", "classesConducted", "teachingHours", "lessonsCompleted", "topicsCovered", "attendancePercentage"])}
    <section><h2>Action Items</h2><ul>${(report.actionItems || []).map((item: string) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
    <script>window.onload = () => window.print();</script>
  </body></html>`;
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-10 rounded-md border bg-background px-3 text-sm ${props.className || ""}`} />;
}

function Metric({ label, value }: { label: string; value: any }) {
  return <Card className="rounded-lg"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{value}</CardContent></Card>;
}

export default function AdminSchoolReportsPage() {
  const { token } = useAuth();
  const [schools, setSchools] = useState<any[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch("/admin/schools", {}, token).then((rows) => {
      setSchools(rows || []);
      setSchoolId((rows || [])[0]?._id || "");
    });
  }, [token]);

  const selectedSchool = useMemo(() => schools.find((school) => school._id === schoolId), [schools, schoolId]);

  const generate = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ schoolId, period });
      if (period === "custom" && startDate && endDate) {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      }
      setReport(await apiFetch(`/reports/school-academic?${params.toString()}`, {}, token));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const delivery = report?.academicDelivery || {};

  return (
    <AdminShell title="School Reports" subtitle="Generate academic execution reports from work logs, attendance, assessments, quizzes, curriculum, and materials">
      <div className="space-y-4">
        <Card className="rounded-lg">
          <CardContent className="grid gap-3 p-4 md:grid-cols-5">
            <NativeSelect value={schoolId} onChange={(event) => setSchoolId(event.target.value)}>
              {schools.map((school) => <option key={school._id} value={school._id}>{school.name}</option>)}
            </NativeSelect>
            <NativeSelect value={period} onChange={(event) => setPeriod(event.target.value)}>
              {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </NativeSelect>
            <Input type="date" value={startDate} disabled={period !== "custom"} onChange={(event) => setStartDate(event.target.value)} />
            <Input type="date" value={endDate} disabled={period !== "custom"} onChange={(event) => setEndDate(event.target.value)} />
            <Button onClick={generate} disabled={!schoolId || loading || (period === "custom" && (!startDate || !endDate))}>
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Generate
            </Button>
          </CardContent>
        </Card>

        {report && (
          <>
            <Card className="rounded-lg">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>{selectedSchool?.name || report.school?.name} Academic Report</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{dateLabel(report.period.start)} to {dateLabel(report.period.end)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => exportAcademicXlsx(report)}><FileSpreadsheet className="mr-2 h-4 w-4" />XLSX</Button>
                  <Button variant="outline" onClick={() => printPdf(report)}><Printer className="mr-2 h-4 w-4" />PDF</Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                <Metric label="Classes Conducted" value={delivery.totalClassesConducted || 0} />
                <Metric label="Teaching Hours" value={delivery.totalTeachingHours || 0} />
                <Metric label="Lessons Completed" value={delivery.totalLessonsCompleted || 0} />
                <Metric label="Topics Covered" value={delivery.totalTopicsCovered || 0} />
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="rounded-lg xl:col-span-2">
                <CardHeader><CardTitle>Curriculum Coverage</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-900"><tr>{["Grade", "Class", "Course", "Planned", "Completed", "Coverage", "Pending"].map((head) => <th key={head} className="px-3 py-2 font-medium">{head}</th>)}</tr></thead>
                    <tbody>{(report.curriculumCoverage || []).map((row: any, index: number) => <tr key={index} className="border-t"><td className="px-3 py-2">{row.grade}</td><td className="px-3 py-2">{row.className}</td><td className="px-3 py-2">{row.courseName}</td><td className="px-3 py-2">{row.plannedLessons}</td><td className="px-3 py-2">{row.completedLessons}</td><td className="px-3 py-2"><Badge variant={row.coveragePercentage >= 80 ? "default" : "secondary"}>{row.coveragePercentage}%</Badge></td><td className="px-3 py-2">{row.pendingLessons}</td></tr>)}</tbody>
                  </table>
                </CardContent>
              </Card>

              <Card className="rounded-lg">
                <CardHeader><CardTitle>Action Items</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(report.actionItems || []).map((item: string, index: number) => <div key={index} className="rounded-md border p-3 text-sm">{item}</div>)}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric label="Attendance %" value={`${report.attendanceSummary?.schoolLevel?.attendancePercentage || 0}%`} />
              <Metric label="Assessment Avg" value={`${report.assessmentAnalytics?.averageScore || 0}%`} />
              <Metric label="Quiz Attempts" value={report.quizAnalytics?.totalAttempts || 0} />
              <Metric label="Materials Used" value={report.materialsUtilized?.lessonResourcesUsed || 0} />
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
