import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Bell, Building2, CalendarCheck, CheckCircle2, CreditCard, Download, Edit3, Eye, FileSpreadsheet, GraduationCap, KeyRound, LayoutGrid, Mail, MessageSquare, Phone, Plus, Search, Settings, ShieldCheck, Table2, Trash2, Upload, UserRound, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import AdminShell from "@/components/layout/AdminShell";
import UsernameField from "@/components/admin/UsernameField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const emptySchool = { name: "", code: "", address: "", city: "", state: "", country: "India", pincode: "", contactPhone: "", alternatePhone: "", principalName: "", contactEmail: "", schoolType: "private", plan: "trial", active: true };
const emptyTeacher = { fullName: "", username: "", email: "", phone: "", employeeId: "", schoolId: "", schoolIds: [] as string[], classSectionIds: [] as string[], subjects: "", qualification: "", experience: "", profilePhotoUrl: "", permissions: ["students:view", "students:manage", "classes:manage", "attendance", "materials", "assignments", "coding", "analytics", "messages", "fees:view"], active: true };
const emptyStudent = { fullName: "", username: "", studentId: "", rollNumber: "", parentName: "", parentContact: "", email: "", phone: "", schoolId: "", classSectionIds: [] as string[], grade: "", assignedCourses: [] as string[], feeStructure: "", customFeeAmount: "", profilePhotoUrl: "", active: true };
const emptyClass = { schoolId: "", name: "", grade: "", section: "A", classTeacherId: "", teacherIds: [] as string[], courseIds: [] as string[], subjects: "", schedule: "", codingTracks: "python,scratch,robotics", capacity: 30, feeType: "monthly", feeAmount: 0, currency: "INR", feeDueDay: 5, students: [] as any[], active: true };
const emptyFee = { schoolId: "", classSectionId: "", studentId: "", feeType: "custom", totalFees: "", paidAmount: "0", currency: "INR", dueDate: "", notes: "" };
const emptyNotification = { schoolId: "", classSectionId: "", audience: "all", title: "", body: "", active: true };
const fixedGrades = Array.from({ length: 12 }, (_, index) => `Grade ${index + 1}`);
const feeStatuses = ["paid", "partially-paid", "pending", "overdue", "waived", "scholarship"];

function splitList(value = "") {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function relationName(value: any) {
  if (!value) return "-";
  if (Array.isArray(value)) return value.map(relationName).filter(Boolean).join(", ") || "-";
  return value.name || value.fullName || value.username || value.title || String(value);
}

function formatCurrency(amount: any, currency = "INR") {
  const symbols: Record<string, string> = { INR: "Rs.", USD: "$", EUR: "EUR", GBP: "GBP" };
  return `${symbols[currency] || currency} ${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fileDate(value = new Date()) {
  const date = new Date(value);
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

function fileSafe(value: any, fallback = "Robokidy") {
  return String(value || fallback).replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || fallback;
}

function datedExportName(label: string, extension = "csv", scope = "Robokidy") {
  return `${fileSafe(scope)}_${label}_${fileDate()}.${extension}`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label className="rk-label">{label}</Label>{children}</div>;
}

function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-10 w-full rounded-lg border border-black/[0.12] bg-white px-3 text-sm text-[#0f1117] ${props.className || ""}`} />;
}

function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="rounded-[14px] border border-dashed border-black/[0.12] bg-white py-12 text-center"><p className="text-sm text-slate-500">{title}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

function SkeletonGrid() {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-[14px] bg-white/70 shadow-sm" />)}</div>;
}

function Metric({ label, value, icon: Icon }: any) {
  return <div className="rk-card p-4"><div className="flex items-center justify-between"><p className="rk-label">{label}</p><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[#1a56db]"><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-[28px] font-extrabold tracking-tight">{value}</p><div className="mt-3 h-1.5 rounded-full bg-slate-100"><span className="block h-full w-2/3 rounded-full bg-[#1a56db]" /></div></div>;
}

function AvatarTile({ src, label }: { src?: string; label: string }) {
  const initials = label.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "RK";
  return src ? <img src={src} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{initials}</span>;
}

function exportCsv(filename: string, headers: string[], rows: any[][]) {
  const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportXlsx(filename: string, headers: string[], rows: any[][]) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, filename);
}


function flattenAttendance(records: any[]) {
  return (records || []).flatMap((record) => record.recordType === "class-day"
    ? (record.students || []).map((entry: any) => ({ ...entry, _id: `${record._id}-${entry.studentId?._id || entry.studentId}`, date: record.date, schoolId: record.schoolId, classSectionId: record.classSectionId, markedBy: record.teacherId || record.markedBy }))
    : [record]);
}

function attendancePercent(rows: any[]) {
  const flat = flattenAttendance(rows);
  const present = flat.filter((row) => ["present", "late"].includes(row.status)).length;
  return flat.length ? Math.round((present / flat.length) * 100) : 0;
}
function parseStudentCsvRows(value = "") {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [fullName, rollNumber, parentName, parentContact] = line.split(",").map((item) => item.trim());
    return { fullName, rollNumber, parentName, parentContact };
  }).filter((row) => row.fullName.toLowerCase() !== "student name");
}

function validateStudentRows(rows: any[]) {
  const normalized = rows.map((row) => ({
    fullName: String(row.fullName || row["Student Name"] || row.name || "").trim(),
    rollNumber: String(row.rollNumber || row["Roll Number"] || "").trim(),
    parentName: String(row.parentName || row["Parent Name"] || "").trim(),
    parentContact: String(row.parentContact || row.parentNumber || row["Parent Number"] || "").trim()
  }));
  return {
    valid: normalized.filter((row) => row.fullName && row.rollNumber && row.parentName && row.parentContact),
    invalid: normalized.filter((row) => !row.fullName || !row.rollNumber || !row.parentName || !row.parentContact)
  };
}

export default function AdminSchoolsPage({ mode = "admin" }: { mode?: "admin" | "teacher" }) {
  const { token, user } = useAuth();
  const location = useLocation();
  const page = location.pathname.split("/").pop() || "schools";
  const pageKey = ["teachers", "classes", "students", "fees", "attendance", "notifications", "settings"].includes(page) ? page : "schools";
  const isTeacherMode = mode === "teacher" || user?.role === "teacher";
  const isCtoMode = user?.role === "cto";
  const apiBase = isTeacherMode ? "/teacher" : "/admin";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [schools, setSchools] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [teacherWorkforce, setTeacherWorkforce] = useState<any>({ summaries: [], attendance: [], holidays: [], workLogs: [], missingDailyLogs: [], absentToday: [], pendingReports: [] });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [feeStatusFilter, setFeeStatusFilter] = useState("");
  const [schoolView, setSchoolView] = useState<"cards" | "sheet">("cards");
  const [teacherView, setTeacherView] = useState<"cards" | "sheet">("cards");
  const [classView, setClassView] = useState<"cards" | "sheet">("cards");
  const [studentView, setStudentView] = useState<"cards" | "sheet">("cards");
  const [dialog, setDialog] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [credential, setCredential] = useState("");
  const [schoolForm, setSchoolForm] = useState<any>(emptySchool);
  const [teacherForm, setTeacherForm] = useState<any>(emptyTeacher);
  const [studentForm, setStudentForm] = useState<any>(emptyStudent);
  const [classForm, setClassForm] = useState<any>(emptyClass);
  const [feeForm, setFeeForm] = useState<any>(emptyFee);
  const [notificationForm, setNotificationForm] = useState<any>(emptyNotification);
  const [attendanceForm, setAttendanceForm] = useState<any>({ classSectionId: "", date: new Date().toISOString().slice(0, 10), records: {} });

  const load = async () => {
    setLoading(true);
    try {
      const [schoolsData, teachersData, classesData, studentsData, coursesData, feesData, attendanceData, notificationData, workforceData] = await Promise.all([
        apiFetch(`${apiBase}/schools`, {}, token),
        apiFetch(`${apiBase}/teachers`, {}, token),
        apiFetch(`${apiBase}/classes`, {}, token),
        apiFetch(`${apiBase}/students`, {}, token),
        apiFetch(`${apiBase}/courses`, {}, token),
        isCtoMode ? Promise.resolve([]) : apiFetch(`${apiBase}/fees`, {}, token),
        apiFetch(`${apiBase}/attendance`, {}, token),
        apiFetch(`${apiBase}/notifications`, {}, token),
        isTeacherMode ? Promise.resolve({ summaries: [], attendance: [], holidays: [], workLogs: [], missingDailyLogs: [], absentToday: [], pendingReports: [] }) : apiFetch("/admin/teacher-workforce", {}, token)
      ]);
      setSchools(schoolsData || []);
      setTeachers(teachersData || []);
      setClasses(classesData || []);
      setStudents(studentsData || []);
      setCourses(coursesData || []);
      setFees(feesData || []);
      setAttendance(attendanceData || []);
      setNotifications(notificationData || []);
      setTeacherWorkforce(workforceData || { summaries: [], attendance: [], holidays: [], workLogs: [], missingDailyLogs: [], absentToday: [], pendingReports: [] });
      setError("");
    } catch (err: any) {
      setError(err.message || "Unable to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);
  useEffect(() => { setSearch(""); setSchoolFilter(""); setGradeFilter(""); setClassFilter(""); setFeeStatusFilter(""); setViewing(null); }, [pageKey]);

  const filteredSchools = useMemo(() => schools.filter((school) => `${school.name} ${school.code} ${school.principalName} ${school.city}`.toLowerCase().includes(search.toLowerCase())), [schools, search]);
  const filteredTeachers = useMemo(() => teachers.filter((teacher) => {
    const textMatch = `${teacher.fullName} ${teacher.username} ${teacher.email}`.toLowerCase().includes(search.toLowerCase());
    if (!textMatch) return false;
    if (!schoolFilter) return true;
    const teacherSchoolIds = (teacher.schoolIds && teacher.schoolIds.map((s: any) => String(s._id || s))) || [];
    const primary = String(teacher.schoolId?._id || teacher.schoolId || "");
    return teacherSchoolIds.includes(schoolFilter) || primary === schoolFilter;
  }), [teachers, search, schoolFilter]);
  const filteredStudents = useMemo(() => students.filter((student) => {
    const textMatch = `${student.fullName} ${student.username} ${student.rollNumber} ${student.parentName}`.toLowerCase().includes(search.toLowerCase());
    if (!textMatch) return false;
    if (schoolFilter) {
      const primary = String(student.schoolId?._id || student.schoolId || "");
      if (primary !== schoolFilter) return false;
    }
    if (gradeFilter && student.grade !== gradeFilter) return false;
    if (classFilter && !(student.classSectionIds || []).some((klass: any) => String(klass._id || klass) === classFilter)) return false;
    if (feeStatusFilter && student.feeAccount?.status !== feeStatusFilter) return false;
    return true;
  }), [students, search, schoolFilter, gradeFilter, classFilter, feeStatusFilter]);
  const filteredClasses = useMemo(() => classes.filter((klass) => `${klass.name} ${klass.grade} ${relationName(klass.teacherIds)}`.toLowerCase().includes(search.toLowerCase()) && (!schoolFilter || String(klass.schoolId?._id || klass.schoolId) === schoolFilter)), [classes, search, schoolFilter]);
  const filteredFees = useMemo(() => fees.filter((fee) => {
    const textMatch = `${relationName(fee.studentId)} ${relationName(fee.schoolId)} ${relationName(fee.classSectionId)} ${fee.status}`.toLowerCase().includes(search.toLowerCase());
    if (!textMatch) return false;
    if (schoolFilter && String(fee.schoolId?._id || fee.schoolId) !== schoolFilter) return false;
    if (classFilter && String(fee.classSectionId?._id || fee.classSectionId) !== classFilter) return false;
    if (feeStatusFilter && fee.status !== feeStatusFilter) return false;
    return true;
  }), [fees, search, schoolFilter, classFilter, feeStatusFilter]);
  const filteredNotifications = useMemo(() => notifications.filter((note) => `${note.title} ${note.body} ${note.audience}`.toLowerCase().includes(search.toLowerCase())), [notifications, search]);
  const selectedClassStudents = students.filter((student) => (student.classSectionIds || []).some((klass: any) => String(klass._id || klass) === attendanceForm.classSectionId));

  const titleMap: Record<string, [string, string]> = {
    schools: ["Schools", "Modern school portfolio, account health, and school-level drilldowns"],
    teachers: ["Teachers", "Faculty cards, assignments, school coverage, and profile drilldowns"],
    students: ["Students", "Student cards with progress, attendance, parent, and performance context"],
    classes: ["Classes", "Class dashboards with teachers, courses, capacity, and attendance signals"],
    fees: ["Fees", "Collection health, pending dues, revenue trend, and exportable ledgers"],
    attendance: ["Attendance", "Daily marking, monthly trend, absent students, and class-wise reports"],
    notifications: ["Notifications", "Communication center for schools, teachers, classes, students, email, SMS, and in-app"],
    settings: ["Settings", "Security, roles, integrations, email, and backup readiness"]
  };

  const openCreate = (kind: string) => {
    setEditing(null);
    setCredential("");
    setDialog(kind);
    if (kind === "school") setSchoolForm(emptySchool);
    if (kind === "teacher") setTeacherForm(emptyTeacher);
    if (kind === "student") setStudentForm(emptyStudent);
    if (kind === "class") setClassForm(emptyClass);
    if (kind === "fee") setFeeForm(emptyFee);
    if (kind === "notification") setNotificationForm(emptyNotification);
  };

  const openEdit = (kind: string, row: any) => {
    setEditing(row);
    setDialog(kind);
    if (kind === "school") setSchoolForm({ ...emptySchool, ...row });
    if (kind === "teacher") {
      const existingSchoolIds = (row.schoolIds && Array.isArray(row.schoolIds) ? row.schoolIds.map((s: any) => s._id || s) : (row.schoolId ? [(row.schoolId?._id || row.schoolId)] : []));
      setTeacherForm({ ...emptyTeacher, ...row, schoolIds: existingSchoolIds, schoolId: existingSchoolIds[0] || (row.schoolId?._id || row.schoolId) || "", classSectionIds: (row.classSectionIds || []).map((item: any) => item._id || item), subjects: (row.subjects || []).join(", ") });
    }
    if (kind === "student") setStudentForm({ ...emptyStudent, ...row, schoolId: row.schoolId?._id || row.schoolId || "", classSectionIds: (row.classSectionIds || []).map((item: any) => item._id || item), assignedCourses: (row.assignedCourses || []).map((item: any) => item._id || item) });
    if (kind === "class") setClassForm({ ...emptyClass, ...row, name: row.section || row.name, schoolId: row.schoolId?._id || row.schoolId || "", classTeacherId: row.classTeacherId?._id || row.classTeacherId || "", teacherIds: (row.teacherIds || []).map((item: any) => item._id || item), courseIds: (row.courseIds || []).map((item: any) => item._id || item), subjects: (row.subjects || []).join(", "), codingTracks: (row.codingTracks || []).join(", ") });
    if (kind === "fee") setFeeForm({ ...emptyFee, ...row, schoolId: row.schoolId?._id || row.schoolId || "", classSectionId: row.classSectionId?._id || row.classSectionId || "", studentId: row.studentId?._id || row.studentId || "", dueDate: row.dueDate?.slice(0, 10) || "" });
    if (kind === "notification") setNotificationForm({ ...emptyNotification, ...row, schoolId: row.schoolId?._id || row.schoolId || "", classSectionId: row.classSectionId?._id || row.classSectionId || "" });
  };

  const submit = async (kind: string) => {
    try {
      if (kind === "school") {
        if (isTeacherMode) return toast.error("Teachers can view assigned schools but cannot create or edit schools");
        await apiFetch(editing ? `/admin/schools/${editing._id}` : "/admin/schools", { method: editing ? "PUT" : "POST", body: schoolForm }, token);
      }
      if (kind === "teacher") {
        if (isTeacherMode) return toast.error("Teachers cannot create or edit other teachers");
        const res = await apiFetch(editing ? `/admin/teachers/${editing._id}` : "/admin/teachers", { method: editing ? "PUT" : "POST", body: { ...teacherForm, subjects: splitList(teacherForm.subjects) } }, token);
        if (res.tempPassword) setCredential(`${res.username} temporary password: ${res.tempPassword}`);
      }
      if (kind === "student") {
        const res = await apiFetch(editing ? `${apiBase}/students/${editing._id}` : `${apiBase}/students`, { method: editing ? "PUT" : "POST", body: studentForm }, token);
        if (res.tempPassword) setCredential(`${res.username} temporary password: ${res.tempPassword}`);
      }
      if (kind === "class") {
        const teacherIds = Array.from(new Set([...(classForm.teacherIds || []), classForm.classTeacherId].filter(Boolean)));
        await apiFetch(editing ? `${apiBase}/classes/${editing._id}` : `${apiBase}/classes`, { method: editing ? "PUT" : "POST", body: { ...classForm, section: classForm.name || classForm.section, name: classForm.grade && classForm.name ? `${classForm.grade} - ${classForm.name}` : classForm.name, teacherIds, classTeacherId: classForm.classTeacherId || teacherIds[0], subjects: splitList(classForm.subjects), codingTracks: splitList(classForm.codingTracks) } }, token);
      }
      if (kind === "fee") await apiFetch(editing ? `${apiBase}/fees/${editing._id}` : `${apiBase}/fees`, { method: editing ? "PUT" : "POST", body: feeForm }, token);
      if (kind === "notification") await apiFetch(editing ? `${apiBase}/notifications/${editing._id}` : `${apiBase}/notifications`, { method: editing ? "PUT" : "POST", body: notificationForm }, token);
      toast.success(`${kind} saved`);
      setDialog("");
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Unable to save");
    }
  };

  const updateStudentFee = async (student: any, status: string) => {
    try {
      const current = student.feeAccount || {};
      if (status === "partially-paid") {
        const pending = Number(current.pendingAmount ?? Math.max(0, Number(current.totalFees || 0) - Number(current.paidAmount || 0)));
        const value = window.prompt(`Amount paid for ${student.fullName || student.username}. Pending balance: ${formatCurrency(pending)}`, "");
        if (!value) return;
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid payment amount");
        if (current._id && !isCtoMode) {
          await apiFetch(`${apiBase}/fees/${current._id}/payments`, { method: "POST", body: { amount, paymentDate: new Date().toISOString().slice(0, 10) } }, token);
        } else {
          await apiFetch(`${apiBase}/students/${student._id}/fees`, {
            method: "PUT",
            body: {
              status,
              amountPaid: amount,
              paymentDate: new Date().toISOString().slice(0, 10),
              schoolId: student.schoolId?._id || student.schoolId,
              classSectionId: student.classSectionIds?.[0]?._id || student.classSectionIds?.[0],
              totalFees: current.totalFees || student.feeAmount || 0,
              paidAmount: Number(current.paidAmount || student.paidAmount || 0) + amount
            }
          }, token);
        }
        toast.success("Payment recorded");
        load();
        return;
      }
      await apiFetch(`${apiBase}/students/${student._id}/fees`, {
        method: "PUT",
        body: {
          status,
          schoolId: student.schoolId?._id || student.schoolId,
          classSectionId: student.classSectionIds?.[0]?._id || student.classSectionIds?.[0],
          totalFees: current.totalFees || student.feeAmount || 0,
          paidAmount: status === "paid"
            ? (current.totalFees || student.feeAmount || 0)
            : status === "pending"
              ? 0
              : (current.paidAmount || 0)
        }
      }, token);
      toast.success("Fee status updated");
      load();
    } catch (err: any) {
      toast.error(err.message || "Unable to update fee");
    }
  };

  const archive = async (path: string) => {
    await apiFetch(path, { method: "DELETE" }, token);
    toast.success(path.includes("/students/") ? "Student deleted" : "Record archived");
    load();
  };

  const markAttendance = async () => {
    const records = Object.entries(attendanceForm.records).map(([studentId, status]) => ({ studentId, status }));
    await apiFetch(`${apiBase}/attendance`, { method: "POST", body: { classSectionId: attendanceForm.classSectionId, date: attendanceForm.date, records } }, token);
    toast.success("Attendance saved");
    load();
  };

  const markTeacherAttendance = async (payload: any) => {
    await apiFetch("/admin/teacher-attendance", { method: "POST", body: payload }, token);
    toast.success("Teacher attendance saved");
    load();
  };

  const createTeacherHoliday = async (payload: any) => {
    await apiFetch("/admin/teacher-holidays", { method: "POST", body: payload }, token);
    toast.success("Holiday saved and teacher exemptions updated");
    load();
  };

  const archiveTeacherHoliday = async (holiday: any) => {
    await apiFetch(`/admin/teacher-holidays/${holiday._id}`, { method: "DELETE" }, token);
    toast.success("Holiday archived");
    load();
  };

  const actionButton = pageKey === "schools" ? (isTeacherMode ? null : ["New School", "school"]) : pageKey === "teachers" ? (isTeacherMode ? null : ["New Teacher", "teacher"]) : pageKey === "students" ? ["New Student", "student"] : pageKey === "classes" ? ["New Class", "class"] : pageKey === "fees" ? ["Add Fee", "fee"] : pageKey === "notifications" ? ["New Message", "notification"] : null;

  const content = (
    <>
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {credential && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">{credential}</div>}

      {pageKey !== "settings" && (
        <div className="rk-card mb-5 flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            {["schools", "teachers", "students", "classes", "fees", "notifications"].includes(pageKey) && (
              <div className="relative md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="h-10 rounded-lg border-black/[0.12] bg-white pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${pageKey}`} />
              </div>
            )}
            {["teachers", "classes", "students", "fees"].includes(pageKey) && (
              <NativeSelect value={schoolFilter} onChange={(event) => setSchoolFilter(event.target.value)} className="md:w-64">
                <option value="">All schools</option>
                {schools.map((school) => <option key={school._id} value={school._id}>{school.name}</option>)}
              </NativeSelect>
            )}
            {(pageKey === "students" || pageKey === "fees") && (
              <>
                {pageKey === "students" && <NativeSelect value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)} className="md:w-44">
                  <option value="">All grades</option>
                  {fixedGrades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                </NativeSelect>}
                <NativeSelect value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="md:w-52">
                  <option value="">All classes</option>
                  {classes.filter((klass) => !schoolFilter || String(klass.schoolId?._id || klass.schoolId) === schoolFilter).map((klass) => <option key={klass._id} value={klass._id}>{klass.name}</option>)}
                </NativeSelect>
                <NativeSelect value={feeStatusFilter} onChange={(event) => setFeeStatusFilter(event.target.value)} className="md:w-44">
                  <option value="">All fees</option>
                  <option value="paid">Paid</option>
                  {feeStatuses.map((status) => <option key={status} value={status}>{feeLabel(status)}</option>)}
                </NativeSelect>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {pageKey === "schools" && (
              <Button variant="outline" onClick={() => setSchoolView(schoolView === "cards" ? "sheet" : "cards")}>{schoolView === "cards" ? <Table2 className="mr-2 h-4 w-4" /> : <LayoutGrid className="mr-2 h-4 w-4" />}{schoolView === "cards" ? "Spreadsheet" : "Cards"}</Button>
            )}
            {pageKey === "teachers" && (
              <Button variant="outline" onClick={() => setTeacherView(teacherView === "cards" ? "sheet" : "cards")}>{teacherView === "cards" ? <Table2 className="mr-2 h-4 w-4" /> : <LayoutGrid className="mr-2 h-4 w-4" />}{teacherView === "cards" ? "Spreadsheet" : "Cards"}</Button>
            )}
            {pageKey === "classes" && (
              <Button variant="outline" onClick={() => setClassView(classView === "cards" ? "sheet" : "cards")}>{classView === "cards" ? <Table2 className="mr-2 h-4 w-4" /> : <LayoutGrid className="mr-2 h-4 w-4" />}{classView === "cards" ? "Spreadsheet" : "Cards"}</Button>
            )}
            {pageKey === "students" && (
              <>
                <Button variant="outline" onClick={() => setStudentView(studentView === "cards" ? "sheet" : "cards")}>{studentView === "cards" ? <Table2 className="mr-2 h-4 w-4" /> : <LayoutGrid className="mr-2 h-4 w-4" />}{studentView === "cards" ? "Spreadsheet" : "Cards"}</Button>
              </>
            )}
            {actionButton && <Button className="rounded-lg bg-[#1a56db] text-white hover:bg-blue-700" onClick={() => openCreate(actionButton[1])}><Plus className="mr-2 h-4 w-4" />{actionButton[0]}</Button>}
          </div>
        </div>
      )}

      {loading ? <SkeletonGrid /> : (
        <>
          {pageKey === "schools" && <SchoolsView rows={filteredSchools} view={schoolView} teachers={teachers} classes={classes} students={students} onView={setViewing} onEdit={(row: any) => !isTeacherMode && openEdit("school", row)} onArchive={(row: any) => !isTeacherMode && archive(`/admin/schools/${row._id}`)} />}
          {pageKey === "teachers" && <TeachersView rows={filteredTeachers} view={teacherView} students={students} workforce={teacherWorkforce} onView={setViewing} onEdit={(row: any) => !isTeacherMode && openEdit("teacher", row)} onArchive={(row: any) => !isTeacherMode && archive(`/admin/teachers/${row._id}`)} />}
          {pageKey === "students" && <StudentsView rows={filteredStudents} view={studentView} onView={setViewing} onEdit={(row: any) => openEdit("student", row)} onArchive={(row: any) => archive(`${apiBase}/students/${row._id}`)} onFeeChange={updateStudentFee} />}
          {pageKey === "classes" && <ClassesView rows={filteredClasses} view={classView} students={students} onView={setViewing} onEdit={(row: any) => openEdit("class", row)} onArchive={(row: any) => archive(`${apiBase}/classes/${row._id}`)} />}
          {pageKey === "fees" && <FeesView rows={filteredFees} />}
          {pageKey === "attendance" && <AttendanceView classes={classes} students={selectedClassStudents} attendance={attendance} form={attendanceForm} setForm={setAttendanceForm} onSave={markAttendance} />}
          {pageKey === "notifications" && <NotificationsView rows={filteredNotifications} onEdit={(row: any) => openEdit("notification", row)} onArchive={(row: any) => archive(`${apiBase}/notifications/${row._id}`)} />}
          {pageKey === "settings" && <SettingsView />}
        </>
      )}

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-2xl border-0 bg-white shadow-[0_24px_64px_rgba(0,0,0,0.15)]">
          <DialogHeader><DialogTitle>{relationName(viewing)}</DialogTitle></DialogHeader>
          {viewing && <ProfileView entity={viewing} type={pageKey} students={students} teachers={teachers} classes={classes} courses={courses} fees={fees} attendance={attendance} teacherWorkforce={teacherWorkforce} onTeacherAttendance={markTeacherAttendance} onHoliday={createTeacherHoliday} onHolidayDelete={archiveTeacherHoliday} />}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && setDialog("")}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle className="capitalize">{editing ? "Edit" : "Create"} {dialog}</DialogTitle></DialogHeader>
          {dialog === "school" && <SchoolForm form={schoolForm} setForm={setSchoolForm} onSubmit={() => submit("school")} />}
          {dialog === "teacher" && <TeacherForm form={teacherForm} setForm={setTeacherForm} schools={schools} classes={classes} onSubmit={() => submit("teacher")} />}
          {dialog === "student" && <StudentForm form={studentForm} setForm={setStudentForm} schools={schools} classes={classes} courses={courses} onSubmit={() => submit("student")} />}
          {dialog === "class" && <ClassForm form={classForm} setForm={setClassForm} schools={schools} teachers={teachers} courses={courses} students={students} editing={editing} onSubmit={() => submit("class")} onStudentEdit={(row: any) => openEdit("student", row)} onStudentDelete={(row: any) => archive(`${apiBase}/students/${row._id}`)} onStudentTransfer={(row: any) => openEdit("student", row)} />}
          {dialog === "fee" && <FeeForm form={feeForm} setForm={setFeeForm} schools={schools} classes={classes} students={students} onSubmit={() => submit("fee")} />}
          {dialog === "notification" && <NotificationForm form={notificationForm} setForm={setNotificationForm} schools={schools} classes={classes} onSubmit={() => submit("notification")} />}
        </DialogContent>
      </Dialog>
    </>
  );

  if (isTeacherMode) return <div>{content}</div>;
  return <AdminShell title={titleMap[pageKey][0]} subtitle={titleMap[pageKey][1]}>{content}</AdminShell>;
}

function CardActions({ onView, onEdit, onArchive }: any) {
  return <div className="flex gap-2"><Button size="sm" variant="outline" onClick={onView}><Eye className="mr-1 h-4 w-4" />View</Button><Button size="sm" variant="outline" onClick={onEdit}><Edit3 className="mr-1 h-4 w-4" />Edit</Button><Button size="sm" variant="destructive" onClick={onArchive}><Trash2 className="mr-1 h-4 w-4" />Delete</Button></div>;
}

function SchoolsView({ rows, view, onView, onEdit, onArchive }: any) {
  if (!rows.length) return <EmptyState title="No schools found." />;
  if (view === "sheet") {
    const headers = ["School", "Code", "City", "Principal", "Teachers", "Students", "Classes", "Status"];
    const exportRows = rows.map((school: any) => [school.name, school.code, school.city, school.principalName, school.teacherCount || 0, school.studentCount || 0, school.classCount || 0, school.active ? "Active" : "Archived"]);
    return <Card className="rounded-lg"><CardHeader className="flex-row items-center justify-between"><CardTitle>Schools Spreadsheet</CardTitle><Button variant="outline" onClick={() => exportCsv(datedExportName("Schools"), headers, exportRows)}><Download className="mr-2 h-4 w-4" />Export CSV</Button></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-900"><tr>{[...headers, "Actions"].map((head) => <th key={head} className="px-3 py-2 font-medium">{head}</th>)}</tr></thead><tbody>{rows.map((school: any) => <tr key={school._id} className="border-t"><td className="px-3 py-2 font-medium">{school.name}</td><td className="px-3 py-2">{school.code || "-"}</td><td className="px-3 py-2">{school.city || "-"}</td><td className="px-3 py-2">{school.principalName || "-"}</td><td className="px-3 py-2">{school.teacherCount || 0}</td><td className="px-3 py-2">{school.studentCount || 0}</td><td className="px-3 py-2">{school.classCount || 0}</td><td className="px-3 py-2"><Badge variant={school.active ? "default" : "secondary"}>{school.active ? "Active" : "Archived"}</Badge></td><td className="px-3 py-2"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onView(school)}>View</Button><Button size="sm" variant="outline" onClick={() => onEdit(school)}>Edit</Button><Button size="sm" variant="destructive" onClick={() => onArchive(school)}>Delete</Button></div></td></tr>)}</tbody></table></CardContent></Card>;
  }
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((school: any) => <Card key={school._id} className="rounded-lg"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg">{school.name}</CardTitle><p className="text-sm text-slate-500">{school.code} - {school.city || "No city"}</p></div><Badge variant={school.active ? "default" : "secondary"}>{school.active ? "Active" : "Archived"}</Badge></div></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-3 gap-2 text-center"><MetricLite label="Teachers" value={school.teacherCount || 0} /><MetricLite label="Students" value={school.studentCount || 0} /><MetricLite label="Classes" value={school.classCount || 0} /></div><div className="space-y-1 text-sm"><p className="font-medium">{school.principalName || "Principal not set"}</p><p className="text-slate-500">{school.contactPhone || school.contactEmail || "No contact"}</p></div><CardActions onView={() => onView(school)} onEdit={() => onEdit(school)} onArchive={() => onArchive(school)} /></CardContent></Card>)}</div>;
}

function TeachersView({ rows, view, students, workforce, onView, onEdit, onArchive }: any) {
  if (!rows.length) return <EmptyState title="No teachers found." />;
  const summaries = rows.map((teacher: any) => teacher.workforce || (workforce?.summaries || []).find((row: any) => String(row.teacherId) === String(teacher._id)) || {});
  const avgRating = summaries.length ? Math.round(summaries.reduce((sum: number, row: any) => sum + Number(row.finalRating || 0), 0) / summaries.length) : 0;
  const totalHours = Math.round(summaries.reduce((sum: number, row: any) => sum + Number(row.teachingHours || 0), 0) * 10) / 10;
  if (view === "sheet") {
    const headers = ["Teacher", "School", "Classes", "Students", "Subjects", "Attendance %", "Present Days", "Absent Days", "Teaching Hours", "Performance", "Status"];
    const tableRows = rows.map((teacher: any) => { const classIds = new Set((teacher.classSectionIds || []).map((item: any) => String(item._id || item))); const count = students.filter((student: any) => (student.classSectionIds || []).some((item: any) => classIds.has(String(item._id || item)))).length; const summary = teacher.workforce || (workforce?.summaries || []).find((row: any) => String(row.teacherId) === String(teacher._id)) || {}; return { teacher, cells: [teacher.fullName || teacher.username, relationName(teacher.schoolId), (teacher.classSectionIds || []).length, count, (teacher.subjects || []).join(", "), summary.attendancePercentage || 0, summary.presentDays || 0, summary.absentDays || 0, summary.teachingHours || 0, summary.grade || "N/A", teacher.active ? "Active" : "Archived"] }; });
    return <div className="space-y-4"><div className="grid gap-3 md:grid-cols-4"><Metric label="Teachers Missing Daily Logs" value={(workforce?.missingDailyLogs || []).length} icon={FileSpreadsheet} /><Metric label="Teachers Absent Today" value={(workforce?.absentToday || []).length} icon={CalendarCheck} /><Metric label="Teachers With Pending Reports" value={(workforce?.pendingReports || []).length} icon={Bell} /><Metric label="Avg Performance" value={`${avgRating}%`} icon={ShieldCheck} /></div><Card className="rounded-lg"><CardHeader className="flex-row items-center justify-between"><CardTitle>Teachers Spreadsheet</CardTitle><Button variant="outline" onClick={() => exportCsv(datedExportName("Teachers"), headers, tableRows.map((row: any) => row.cells))}><Download className="mr-2 h-4 w-4" />Export CSV</Button></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[1280px] text-sm"><thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-900"><tr>{[...headers, "Actions"].map((head) => <th key={head} className="px-3 py-2 font-medium">{head}</th>)}</tr></thead><tbody>{tableRows.map(({ teacher, cells }: any) => <tr key={teacher._id} className="border-t">{cells.map((cell: any, index: number) => <td key={index} className="px-3 py-2">{cell || "-"}</td>)}<td className="px-3 py-2"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onView(teacher)}>View</Button><Button size="sm" variant="outline" onClick={() => onEdit(teacher)}>Edit</Button><Button size="sm" variant="destructive" onClick={() => onArchive(teacher)}>Delete</Button></div></td></tr>)}</tbody></table></CardContent></Card></div>;
  }
  return <div className="space-y-4"><div className="grid gap-3 md:grid-cols-4"><Metric label="Teachers Missing Daily Logs" value={(workforce?.missingDailyLogs || []).length} icon={FileSpreadsheet} /><Metric label="Teachers Absent Today" value={(workforce?.absentToday || []).length} icon={CalendarCheck} /><Metric label="Teachers With Pending Reports" value={(workforce?.pendingReports || []).length} icon={Bell} /><Metric label="Avg Performance" value={`${avgRating}%`} icon={ShieldCheck} /></div><div className="grid gap-3 md:grid-cols-3"><Metric label="Teaching Hours This Month" value={totalHours} icon={ClockIcon} /><Metric label="Holiday Records" value={(workforce?.holidays || []).length} icon={CalendarCheck} /><Metric label="Daily Work Logs" value={(workforce?.workLogs || []).length} icon={BookIcon} /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((teacher: any) => { const classIds = new Set((teacher.classSectionIds || []).map((item: any) => String(item._id || item))); const count = students.filter((student: any) => (student.classSectionIds || []).some((item: any) => classIds.has(String(item._id || item)))).length; const summary = teacher.workforce || (workforce?.summaries || []).find((row: any) => String(row.teacherId) === String(teacher._id)) || {}; return <Card key={teacher._id} className="rounded-lg"><CardHeader><div className="flex items-center gap-3"><AvatarTile src={teacher.profilePhotoUrl} label={teacher.fullName || teacher.username} /><div className="min-w-0"><CardTitle className="truncate text-lg">{teacher.fullName || teacher.username}</CardTitle><p className="truncate text-sm text-slate-500">{relationName(teacher.schoolId)}</p></div></div></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-3 gap-2 text-center"><MetricLite label="Classes" value={(teacher.classSectionIds || []).length} /><MetricLite label="Students" value={count} /><MetricLite label="Subjects" value={(teacher.subjects || []).length} /></div><div className="grid grid-cols-3 gap-2 text-center"><MetricLite label="Attendance" value={`${summary.attendancePercentage || 0}%`} /><MetricLite label="Present Days" value={summary.presentDays || 0} /><MetricLite label="Absent Days" value={summary.absentDays || 0} /></div><div className="grid grid-cols-3 gap-2 text-center"><MetricLite label="Teaching Hours" value={summary.teachingHours || 0} /><MetricLite label="Classes This Month" value={summary.classesConducted || 0} /><MetricLite label="Performance" value={summary.grade || "N/A"} /></div><div className="flex flex-wrap gap-2"><Badge variant={teacher.active ? "default" : "secondary"}>{teacher.active ? "Active" : "Archived"}</Badge><Badge variant="outline">{summary.finalRating || 0}% rating</Badge></div><CardActions onView={() => onView(teacher)} onEdit={() => onEdit(teacher)} onArchive={() => onArchive(teacher)} /></CardContent></Card>; })}</div></div>;
}

function feeLabel(status?: string) {
  const normalized = status === "partial" ? "partially-paid" : status || "pending";
  return normalized.split("-").map((part) => part.replace(/^\w/, (value) => value.toUpperCase())).join(" ");
}

function StudentsView({ rows, view, onView, onEdit, onArchive, onFeeChange }: any) {
  if (!rows.length) return <EmptyState title="No students found." />;
  if (view === "sheet") {
    return <Card className="rounded-lg"><CardHeader className="flex-row items-center justify-between"><CardTitle>Spreadsheet View</CardTitle><Button variant="outline" onClick={() => exportCsv(datedExportName(`${fileSafe(rows[0]?.grade || "All_Grades")}_Students`, "csv", relationName(rows[0]?.schoolId)), ["Student Name", "Roll Number", "School", "Grade", "Class", "Fee Amount", "Paid Amount", "Balance", "Fee Status", "Last Payment", "Performance", "Parent Name", "Parent Number"], rows.map((student: any) => [student.fullName || student.username, student.rollNumber, relationName(student.schoolId), student.grade, relationName(student.classSectionIds), student.feeAccount?.totalFees || student.feeAmount || 0, student.feeAccount?.paidAmount || student.paidAmount || 0, student.feeAccount?.pendingAmount || student.pendingAmount || 0, feeLabel(student.feeAccount?.status || student.feeStatus), student.feeAccount?.lastPaymentDate || student.lastPaymentDate || "", student.performanceScore || 0, student.parentName, student.parentContact]))}><Download className="mr-2 h-4 w-4" />Export CSV</Button></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[1240px] text-sm"><thead className="sticky top-0 bg-white dark:bg-slate-950"><tr className="border-b text-left text-slate-500">{["Student Name", "Roll Number", "School", "Grade", "Class", "Fee Amount", "Paid", "Balance", "Fee Status", "Last Payment", "Actions"].map((head) => <th key={head} className="px-3 py-2 font-medium">{head}</th>)}</tr></thead><tbody>{rows.map((student: any) => { const fee = student.feeAccount || {}; return <tr key={student._id} className="border-b"><td className="px-3 py-2 font-medium">{student.fullName || student.username}</td><td className="px-3 py-2">{student.rollNumber || "-"}</td><td className="px-3 py-2">{relationName(student.schoolId)}</td><td className="px-3 py-2">{student.grade || "-"}</td><td className="px-3 py-2">{relationName(student.classSectionIds)}</td><td className="px-3 py-2">{formatCurrency(fee.totalFees || student.feeAmount)}</td><td className="px-3 py-2">{formatCurrency(fee.paidAmount || student.paidAmount)}</td><td className="px-3 py-2">{formatCurrency(fee.pendingAmount || student.pendingAmount)}</td><td className="px-3 py-2"><NativeSelect value={fee.status || student.feeStatus || "pending"} onChange={(event) => onFeeChange(student, event.target.value)} className="h-8 min-w-36">{feeStatuses.map((status) => <option key={status} value={status}>{feeLabel(status)}</option>)}</NativeSelect></td><td className="px-3 py-2">{fee.lastPaymentDate ? new Date(fee.lastPaymentDate).toLocaleDateString() : "-"}</td><td className="px-3 py-2"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onView(student)}>View</Button><Button size="sm" variant="outline" onClick={() => onEdit(student)}>Edit</Button><Button size="sm" variant="destructive" onClick={() => onArchive(student)}>Delete</Button></div></td></tr>; })}</tbody></table></CardContent></Card>;
  }
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((student: any) => { const fee = student.feeAccount || {}; return <Card key={student._id} className="rounded-lg"><CardHeader><div className="flex items-center gap-3"><AvatarTile src={student.profilePhotoUrl} label={student.fullName || student.username} /><div className="min-w-0"><CardTitle className="truncate text-lg">{student.fullName || student.username}</CardTitle><p className="text-sm text-slate-500">Roll {student.rollNumber || "-"} - {relationName(student.classSectionIds)}</p></div></div></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-3 gap-2 text-center"><MetricLite label="Total Fee" value={formatCurrency(fee.totalFees || student.feeAmount)} /><MetricLite label="Paid" value={formatCurrency(fee.paidAmount || student.paidAmount)} /><MetricLite label="Balance" value={formatCurrency(fee.pendingAmount || student.pendingAmount)} /></div><div className="flex flex-wrap gap-2"><Badge variant="outline">{student.grade || "No grade"}</Badge><Badge variant={(fee.status || student.feeStatus) === "paid" ? "default" : "secondary"}>{feeLabel(fee.status || student.feeStatus)}</Badge><Badge variant={(student.performanceScore || 0) < 50 ? "destructive" : "secondary"}>{student.performanceLabel || "Average"}</Badge></div><p className="text-sm text-slate-500">Parent: {student.parentName || "-"} {student.parentContact || ""}</p><CardActions onView={() => onView(student)} onEdit={() => onEdit(student)} onArchive={() => onArchive(student)} /></CardContent></Card>; })}</div>;
}

function ClassesView({ rows, view, students, onView, onEdit, onArchive }: any) {
  if (!rows.length) return <EmptyState title="No classes found." />;
  if (view === "sheet") {
    const headers = ["Class", "School", "Grade", "Section", "Teacher", "Students", "Capacity", "Class Fee", "Subjects", "Status"];
    const tableRows = rows.map((klass: any) => { const classStudents = students.filter((student: any) => (student.classSectionIds || []).some((item: any) => String(item._id || item) === String(klass._id))); return { klass, cells: [klass.name, relationName(klass.schoolId), klass.grade || "-", klass.section || "-", relationName(klass.classTeacherId || klass.teacherIds), classStudents.length, klass.capacity || 0, formatCurrency(klass.feeAmount, klass.currency), (klass.subjects || []).join(", "), klass.active === false ? "Archived" : "Active"] }; });
    return <Card className="rounded-lg"><CardHeader className="flex-row items-center justify-between"><CardTitle>Classes Spreadsheet</CardTitle><Button variant="outline" onClick={() => exportCsv(datedExportName("Classes"), headers, tableRows.map((row: any) => row.cells))}><Download className="mr-2 h-4 w-4" />Export CSV</Button></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[1240px] text-sm"><thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-900"><tr>{[...headers, "Actions"].map((head) => <th key={head} className="px-3 py-2 font-medium">{head}</th>)}</tr></thead><tbody>{tableRows.map(({ klass, cells }: any) => <tr key={klass._id} className="border-t">{cells.map((cell: any, index: number) => <td key={index} className="px-3 py-2">{cell || "-"}</td>)}<td className="px-3 py-2"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onView(klass)}>View</Button><Button size="sm" variant="outline" onClick={() => onEdit(klass)}>Edit</Button><Button size="sm" variant="destructive" onClick={() => onArchive(klass)}>Delete</Button></div></td></tr>)}</tbody></table></CardContent></Card>;
  }
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((klass: any) => { const classStudents = students.filter((student: any) => (student.classSectionIds || []).some((item: any) => String(item._id || item) === String(klass._id))); const expected = classStudents.reduce((sum: number, student: any) => sum + Number(student.feeAccount?.totalFees || student.feeAmount || klass.feeAmount || 0), 0); const collected = classStudents.reduce((sum: number, student: any) => sum + Number(student.feeAccount?.paidAmount || student.paidAmount || 0), 0); const pending = Math.max(0, expected - collected); const pct = expected ? Math.round((collected / expected) * 100) : 0; return <Card key={klass._id} className="rounded-lg"><CardHeader><CardTitle className="text-lg">{klass.name}</CardTitle><p className="text-sm text-slate-500">{relationName(klass.schoolId)}</p></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-3 gap-2 text-center"><MetricLite label="Students" value={classStudents.length} /><MetricLite label="Class Fee" value={formatCurrency(klass.feeAmount, klass.currency)} /><MetricLite label="Collected" value={`${pct}%`} /></div><div className="grid grid-cols-3 gap-2 text-center"><MetricLite label="Expected" value={formatCurrency(expected, klass.currency)} /><MetricLite label="Paid" value={formatCurrency(collected, klass.currency)} /><MetricLite label="Pending" value={formatCurrency(pending, klass.currency)} /></div><p className="text-sm text-slate-500">Teacher: {relationName(klass.classTeacherId || klass.teacherIds)}</p><CardActions onView={() => onView(klass)} onEdit={() => onEdit(klass)} onArchive={() => onArchive(klass)} /></CardContent></Card>; })}</div>;
}

function FeesView({ rows }: any) {
  const total = rows.reduce((sum: number, fee: any) => sum + Number(fee.totalFees || 0), 0);
  const paid = rows.reduce((sum: number, fee: any) => sum + Number(fee.paidAmount || 0), 0);
  const pending = Math.max(0, total - paid);
  const overdue = rows.filter((fee: any) => fee.status === "overdue").reduce((sum: number, fee: any) => sum + Number(fee.pendingAmount || 0), 0);
  const exportRows = rows.map((fee: any) => [relationName(fee.studentId), relationName(fee.schoolId), relationName(fee.classSectionId), fee.totalFees, fee.paidAmount, fee.pendingAmount ?? Math.max(0, Number(fee.totalFees || 0) - Number(fee.paidAmount || 0)), fee.status, fee.lastPaymentDate ? new Date(fee.lastPaymentDate).toLocaleDateString() : ""]);
  const headers = ["Student", "School", "Class", "Total", "Paid", "Balance", "Status", "Last Payment"];
  const chart = rows.slice(0, 8).map((fee: any, index: number) => ({ name: `M${index + 1}`, paid: Number(fee.paidAmount || 0), pending: Math.max(0, Number(fee.totalFees || 0) - Number(fee.paidAmount || 0)) }));
  const statusClass = (status?: string) => status === "paid" ? "rk-status-paid" : status === "overdue" ? "rk-status-overdue" : "rk-status-pending";
  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-4">
      <Metric label="Expected" value={formatCurrency(total)} icon={CreditCard} />
      <Metric label="Collected" value={formatCurrency(paid)} icon={CheckCircle2} />
      <Metric label="Pending" value={formatCurrency(pending)} icon={CalendarCheck} />
      <Metric label="Overdue" value={formatCurrency(overdue)} icon={CalendarCheck} />
    </div>
    <Card className="rk-card">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Fee Analytics</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportCsv(datedExportName("Fees"), headers, exportRows)}><Download className="mr-2 h-4 w-4" />CSV</Button>
          <Button variant="outline" onClick={() => exportXlsx(datedExportName("Fees", "xlsx"), headers, exportRows)}><Download className="mr-2 h-4 w-4" />Excel</Button>
          <Button variant="outline" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" />PDF</Button>
        </div>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.08)" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="paid" fill="#1a56db" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" fill="#93c5fd" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
    <div className="rk-table-wrap">
      <table className="w-full min-w-[980px] text-sm">
        <thead className="bg-slate-50 text-left text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400">
          <tr>{["Student", "Class", "Amount", "Paid", "Balance", "Due Date", "Status"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((fee: any) => <tr key={fee._id} className="border-b border-black/[0.06] transition-colors hover:bg-[#f8f7f4]">
            <td className="px-4 py-3 font-semibold">{relationName(fee.studentId)}</td>
            <td className="px-4 py-3 text-slate-500">{relationName(fee.classSectionId)}</td>
            <td className="px-4 py-3">{formatCurrency(fee.totalFees, fee.currency)}</td>
            <td className="px-4 py-3">{formatCurrency(fee.paidAmount, fee.currency)}</td>
            <td className="px-4 py-3">{formatCurrency(fee.pendingAmount, fee.currency)}</td>
            <td className="px-4 py-3">{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : fee.lastPaymentDate ? new Date(fee.lastPaymentDate).toLocaleDateString() : "-"}</td>
            <td className="px-4 py-3"><Badge className={statusClass(fee.status)}>{feeLabel(fee.status)}</Badge></td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>;
}

function AttendanceView({ classes, students, attendance, form, setForm, onSave }: any) {
  const trend = Array.from({ length: 12 }).map((_, index) => ({ day: `${index + 1}`, present: 72 + ((index * 5) % 24) }));
  const presentCount = Object.values(form.records).filter((value) => value === "present").length;
  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-3">
      <Metric label="Today's %" value="86%" icon={CalendarCheck} />
      <Metric label="Monthly Trend" value="+4.8%" icon={ActivityIcon} />
      <Metric label="Absent Students" value={Math.max(0, students.length - presentCount)} icon={Users} />
    </div>
    <Card className="rk-card">
      <CardHeader><CardTitle>Mark Attendance</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <NativeSelect value={form.classSectionId} onChange={(event) => setForm({ ...form, classSectionId: event.target.value, records: {} })}><option value="">Select class</option>{classes.map((klass: any) => <option key={klass._id} value={klass._id}>{klass.name}</option>)}</NativeSelect>
          <Input className="rounded-lg border-black/[0.12]" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          <Button className="rounded-lg bg-[#1a56db] text-white hover:bg-blue-700" disabled={!form.classSectionId} onClick={onSave}>Save Attendance</Button>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student: any) => <label key={student._id} className="flex items-center justify-between rounded-lg border border-black/[0.08] bg-slate-50/80 p-3 text-sm">
            <span className="font-medium">{student.fullName || student.username}</span>
            <NativeSelect value={form.records[student._id] || "present"} onChange={(event) => setForm({ ...form, records: { ...form.records, [student._id]: event.target.value } })} className="h-9 w-32"><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option></NativeSelect>
          </label>)}
        </div>
      </CardContent>
    </Card>
    <div className="grid gap-4 xl:grid-cols-[1fr_0.7fr]">
      <Card className="rk-card"><CardHeader><CardTitle>Monthly Attendance Trend</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.08)" /><XAxis dataKey="day" /><YAxis domain={[0, 100]} /><Tooltip /><Area type="monotone" dataKey="present" stroke="#1a56db" fill="#dbeafe" strokeWidth={2} /></AreaChart></ResponsiveContainer></CardContent></Card>
      <Card className="rk-card"><CardHeader><CardTitle>Heatmap Calendar</CardTitle></CardHeader><CardContent><div className="grid grid-cols-7 gap-2">{Array.from({ length: 35 }).map((_, index) => <span key={index} className={`h-8 rounded ${index % 7 === 0 ? "bg-red-200" : index % 5 === 0 ? "bg-yellow-200" : "bg-emerald-200"}`} title={`Day ${index + 1}`} />)}</div><div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded bg-emerald-200" />90%+</span><span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded bg-yellow-200" />70-89%</span><span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded bg-red-200" />Below 70%</span></div></CardContent></Card>
    </div>
  </div>;
}

function NotificationsView({ rows, onEdit, onArchive }: any) {
  if (!rows.length) return <EmptyState title="No notification history yet." />;
  return <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]"><Card className="rounded-lg"><CardHeader><CardTitle>Channels</CardTitle></CardHeader><CardContent className="space-y-3"><MetricLite label="In-App" value="Ready" /><MetricLite label="Email" value="Configured" /><MetricLite label="SMS" value="Ready" /></CardContent></Card><div className="space-y-3">{rows.map((note: any) => <Card key={note._id} className="rounded-lg"><CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-blue-600" /><p className="font-semibold">{note.title}</p><Badge variant="outline">{note.audience}</Badge></div><p className="mt-1 text-sm text-slate-500">{note.body}</p><div className="mt-2 flex gap-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />In-App</span><span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />Email</span><span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />SMS</span></div></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onEdit(note)}>Edit</Button><Button size="sm" variant="destructive" onClick={() => onArchive(note)}>Archive</Button></div></CardContent></Card>)}</div></div>;
}

function SettingsView() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [tempCredential, setTempCredential] = useState("");
  const [loading, setLoading] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (role) params.set("role", role);
      const rows = await apiFetch(`/admin/accounts${params.toString() ? `?${params.toString()}` : ""}`, {}, token);
      setAccounts(rows || []);
    } catch (err: any) {
      toast.error(err.message || "Unable to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAccounts(); }, [token]);

  const resetPassword = async (account: any) => {
    if (!window.confirm(`Generate a temporary password for ${account.fullName || account.username}?`)) return;
    try {
      const result = await apiFetch(`/admin/accounts/${account._id}/reset-password`, { method: "POST" }, token);
      setTempCredential(`Username: ${result.username} | Temporary password: ${result.tempPassword}`);
      toast.success("Temporary password generated");
      loadAccounts();
    } catch (err: any) {
      toast.error(err.message || "Unable to reset password");
    }
  };

  const changeUsername = async (account: any) => {
    const username = window.prompt(`New username for ${account.fullName || account.username}`, account.username || "");
    if (username === null) return;
    const normalized = username.trim().toLowerCase();
    if (!normalized) return toast.error("Username is required");
    if (normalized === account.username) return;

    try {
      const result = await apiFetch(`/admin/accounts/${account._id}`, { method: "PUT", body: { username: normalized } }, token);
      toast.success(`Username updated to ${result.username}`);
      loadAccounts();
    } catch (err: any) {
      toast.error(err.message || "Unable to update username");
    }
  };

  return (
    <div className="space-y-4">
      {tempCredential && <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">{tempCredential}</div>}
      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-slate-500" />
            <CardTitle>Password & Account Manager</CardTitle>
          </div>
          <p className="text-sm text-slate-500">Generate temporary passwords for users who forgot their password. They will be forced to create a new password on login.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, username, email, student ID, employee ID" />
            <NativeSelect value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="">All roles</option>
              {["admin", "cto", "cmo", "teacher", "student", "parent"].map((item) => <option key={item} value={item}>{item}</option>)}
            </NativeSelect>
            <Button onClick={loadAccounts}><Search className="mr-2 h-4 w-4" />Search</Button>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-900">
                <tr>{["User", "Role", "School", "Status", "First Login", "Updated", "Action"].map((head) => <th key={head} className="px-3 py-2 font-medium">{head}</th>)}</tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account._id} className="border-t">
                    <td className="px-3 py-2">
                      <p className="font-medium">{account.fullName || account.username}</p>
                      <p className="text-xs text-slate-500">{account.username} {account.email ? `- ${account.email}` : ""}</p>
                    </td>
                    <td className="px-3 py-2 capitalize">{account.role}</td>
                    <td className="px-3 py-2">{relationName(account.schoolId)}</td>
                    <td className="px-3 py-2"><Badge variant={account.active ? "default" : "secondary"}>{account.active ? "Active" : "Inactive"}</Badge></td>
                    <td className="px-3 py-2">{account.firstLogin ? "Required" : "Completed"}</td>
                    <td className="px-3 py-2">{account.updatedAt ? new Date(account.updatedAt).toLocaleDateString() : "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => changeUsername(account)}>
                          <Edit3 className="mr-2 h-4 w-4" />Username
                        </Button>
                        <Button size="sm" variant="outline" disabled={account.role === "admin"} onClick={() => resetPassword(account)}>
                          <KeyRound className="mr-2 h-4 w-4" />Temp Password
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!accounts.length && <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={7}>{loading ? "Loading accounts..." : "No accounts found."}</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileView({ entity, type, students, teachers, classes, courses, fees, attendance, teacherWorkforce, onTeacherAttendance, onHoliday, onHolidayDelete }: any) {
  if (type === "students") {
    const fee = entity.feeAccount || fees.find((row: any) => String(row.studentId?._id || row.studentId) === String(entity._id)) || {};
    return <Tabs defaultValue="overview"><TabsList className="flex-wrap"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="fees">Fee Tab</TabsTrigger><TabsTrigger value="history">Payment History</TabsTrigger></TabsList><TabsContent value="overview" className="mt-4 grid gap-3 md:grid-cols-3"><MetricLite label="School" value={relationName(entity.schoolId)} /><MetricLite label="Class" value={relationName(entity.classSectionIds)} /><MetricLite label="Grade" value={entity.grade || "-"} /><MetricLite label="Attendance" value={`${entity.attendancePercentage || 0}%`} /><MetricLite label="Performance" value={entity.performanceScore || 0} /><MetricLite label="Status" value={entity.active ? "Active" : "Archived"} /></TabsContent><TabsContent value="fees" className="mt-4 grid gap-3 md:grid-cols-3"><MetricLite label="Total Fee" value={formatCurrency(fee.totalFees || entity.feeAmount, fee.currency)} /><MetricLite label="Amount Paid" value={formatCurrency(fee.paidAmount || entity.paidAmount, fee.currency)} /><MetricLite label="Pending Amount" value={formatCurrency(fee.pendingAmount || entity.pendingAmount, fee.currency)} /><MetricLite label="Payment Status" value={feeLabel(fee.status || entity.feeStatus)} /><MetricLite label="Last Payment Date" value={fee.lastPaymentDate ? new Date(fee.lastPaymentDate).toLocaleDateString() : "-"} /><MetricLite label="Due Date" value={fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : "-"} /></TabsContent><TabsContent value="history" className="mt-4 grid gap-2">{(fee.payments || []).length ? fee.payments.map((payment: any, index: number) => <div key={payment._id || index} className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-4"><span>{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : "-"}</span><span>{formatCurrency(payment.amount, fee.currency)}</span><span className="capitalize">{payment.method || "cash"}</span><span>{payment.reference || payment.receiptNo || "-"}</span></div>) : <p className="text-sm text-slate-500">No payment history yet.</p>}</TabsContent></Tabs>;
  }
  const classIds = new Set((entity.classSectionIds || entity.teacherIds || []).map((item: any) => String(item._id || item)));
  const relatedStudents = type === "classes" ? students.filter((student: any) => (student.classSectionIds || []).some((item: any) => String(item._id || item) === String(entity._id))) : students.filter((student: any) => (student.classSectionIds || []).some((item: any) => classIds.has(String(item._id || item))));
  if (type === "teachers") {
    const summary = entity.workforce || (teacherWorkforce?.summaries || []).find((row: any) => String(row.teacherId) === String(entity._id)) || {};
    const teacherAttendance = (teacherWorkforce?.attendance || []).filter((row: any) => String(row.teacherId?._id || row.teacherId) === String(entity._id));
    const logs = (teacherWorkforce?.workLogs || []).filter((row: any) => String(row.teacherId?._id || row.teacherId) === String(entity._id));
    return <TeacherWorkforceProfile teacher={entity} classes={classes.filter((klass: any) => classIds.has(String(klass._id)) || (entity.classSectionIds || []).some((item: any) => String(item._id || item) === String(klass._id)))} students={relatedStudents} courses={courses} summary={summary} attendance={teacherAttendance} holidays={teacherWorkforce?.holidays || []} logs={logs} onTeacherAttendance={onTeacherAttendance} onHoliday={onHoliday} onHolidayDelete={onHolidayDelete} />;
  }
  if (type === "classes") {
    const classFees = fees.filter((fee: any) => String(fee.classSectionId?._id || fee.classSectionId) === String(entity._id));
    const totalFees = classFees.reduce((sum: number, fee: any) => sum + Number(fee.totalFees || 0), 0);
    const paidFees = classFees.reduce((sum: number, fee: any) => sum + Number(fee.paidAmount || 0), 0);
    const attendanceRows = attendance.filter((row: any) => String(row.classSectionId?._id || row.classSectionId) === String(entity._id));
    const presentRows = attendanceRows.filter((row: any) => ["present", "late"].includes(row.status));
    const assessmentAverage = relatedStudents.length ? Math.round(relatedStudents.reduce((sum: number, student: any) => sum + Number(student.performanceScore || 0), 0) / relatedStudents.length) : 0;
    return <Tabs defaultValue="overview"><TabsList className="flex-wrap"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="students">Students</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger><TabsTrigger value="assessments">Assessments</TabsTrigger><TabsTrigger value="materials">Materials</TabsTrigger><TabsTrigger value="performance">Performance</TabsTrigger></TabsList><TabsContent value="overview" className="mt-4 space-y-4"><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4"><MetricLite label="School" value={relationName(entity.schoolId)} /><MetricLite label="Grade" value={entity.grade || "-"} /><MetricLite label="Class" value={entity.section || entity.name} /><MetricLite label="Teacher" value={relationName(entity.classTeacherId || entity.teacherIds)} /><MetricLite label="Courses" value={(entity.courseIds || []).length} /><MetricLite label="Capacity" value={entity.capacity || 0} /><MetricLite label="Student Count" value={relatedStudents.length} /><MetricLite label="Attendance %" value={`${flatAttendanceRows.length ? Math.round((presentRows.length / flatAttendanceRows.length) * 100) : 0}%`} /><MetricLite label="Fees Collection %" value={`${totalFees ? Math.round((paidFees / totalFees) * 100) : 0}%`} /><MetricLite label="Assessment Average" value={`${assessmentAverage}%`} /></div></TabsContent><TabsContent value="students" className="mt-4"><StudentMiniTable rows={relatedStudents} /></TabsContent><TabsContent value="attendance" className="mt-4"><AttendanceMiniTable rows={attendanceRows} /></TabsContent><TabsContent value="assessments" className="mt-4"><Metric label="Assessment Average" value={`${assessmentAverage}%`} icon={CheckCircle2} /></TabsContent><TabsContent value="materials" className="mt-4"><p className="text-sm text-slate-500">Class course materials are controlled by assigned courses.</p></TabsContent><TabsContent value="performance" className="mt-4"><Progress value={assessmentAverage} /></TabsContent></Tabs>;
  }
  return <Tabs defaultValue="overview"><TabsList className="flex-wrap"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="teachers">Teachers</TabsTrigger><TabsTrigger value="classes">Classes</TabsTrigger><TabsTrigger value="students">Students</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger><TabsTrigger value="fees">Fees</TabsTrigger><TabsTrigger value="reports">Reports</TabsTrigger></TabsList><TabsContent value="overview" className="mt-4 grid gap-3 md:grid-cols-3"><Metric label="Students" value={relatedStudents.length || entity.studentCount || 0} icon={Users} /><Metric label="Teachers" value={(entity.teacherIds || []).length || entity.teacherCount || 0} icon={ShieldCheck} /><Metric label="Classes" value={(entity.classSectionIds || []).length || entity.classCount || 0} icon={GraduationCap} /></TabsContent><TabsContent value="teachers" className="mt-4 grid gap-2">{teachers.slice(0, 8).map((teacher: any) => <div key={teacher._id} className="rounded-md border p-3">{teacher.fullName || teacher.username}</div>)}</TabsContent><TabsContent value="classes" className="mt-4 grid gap-2">{classes.slice(0, 8).map((klass: any) => <div key={klass._id} className="rounded-md border p-3">{klass.name}</div>)}</TabsContent><TabsContent value="students" className="mt-4"><StudentMiniTable rows={relatedStudents} /></TabsContent><TabsContent value="attendance" className="mt-4"><AttendanceMiniTable rows={attendance.filter((row: any) => String(row.schoolId?._id || row.schoolId) === String(entity._id))} /></TabsContent><TabsContent value="fees" className="mt-4"><FeeMiniTable rows={fees.filter((fee: any) => String(fee.schoolId?._id || fee.schoolId) === String(entity._id))} /></TabsContent><TabsContent value="reports" className="mt-4"><p className="text-sm text-slate-500">Performance, assessment, and operation reports are available from Analytics.</p></TabsContent></Tabs>;
}

function TeacherWorkforceProfile({ teacher, classes, students, courses, summary, attendance, holidays, logs, onTeacherAttendance, onHoliday, onHolidayDelete }: any) {
  const today = new Date().toISOString().slice(0, 10);
  const [attendanceForm, setAttendanceForm] = useState({ date: today, status: "present", checkInTime: "09:00", checkOutTime: "17:00", totalHours: 8, remarks: "" });
  const [holidayForm, setHolidayForm] = useState({ name: "", type: "school", date: today, description: "" });
  const reportHeaders = ["Teacher", "Date", "School", "Grade", "Class", "Course", "Lesson", "Duration", "Status"];
  const reportRows = logs.map((row: any) => [teacher.fullName || teacher.username, row.date ? new Date(row.date).toLocaleDateString() : "-", relationName(row.schoolId), row.grade || row.classSectionId?.grade || "-", relationName(row.classSectionId), relationName(row.courseId), row.lessonConducted || relationName(row.lessonId), `${row.durationMinutes || 0} min`, row.status]);
  const attendanceHeaders = ["Teacher", "Date", "Status", "Check In", "Check Out", "Hours", "Remarks", "Approved By"];
  const attendanceRows = attendance.map((row: any) => [teacher.fullName || teacher.username, row.date ? new Date(row.date).toLocaleDateString() : "-", row.status, row.checkInTime, row.checkOutTime, row.totalHours, row.remarks, relationName(row.approvedBy)]);
  const chart = logs.slice(0, 10).reverse().map((row: any, index: number) => ({ name: row.date ? new Date(row.date).toLocaleDateString() : `Log ${index + 1}`, hours: Math.round(Number(row.durationMinutes || 0) / 6) / 10, classes: 1, assessments: row.assessmentConducted ? 1 : 0, lessons: row.lessonId || row.lessonConducted ? 1 : 0 }));
  const saveAttendance = () => onTeacherAttendance({ ...attendanceForm, teacherId: teacher._id, schoolId: teacher.schoolId?._id || teacher.schoolId });
  const saveHoliday = () => onHoliday({ ...holidayForm, teacherIds: [teacher._id], schoolIds: [teacher.schoolId?._id || teacher.schoolId].filter(Boolean), classSectionIds: (teacher.classSectionIds || []).map((item: any) => item._id || item) });

  return <Tabs defaultValue="overview"><TabsList className="flex-wrap"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="classes">Classes</TabsTrigger><TabsTrigger value="students">Students</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger><TabsTrigger value="worklog">Daily Work Log</TabsTrigger><TabsTrigger value="performance">Performance</TabsTrigger><TabsTrigger value="reports">Reports</TabsTrigger></TabsList>
    <TabsContent value="overview" className="mt-4 space-y-4"><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4"><MetricLite label="School" value={relationName(teacher.schoolId)} /><MetricLite label="Classes" value={classes.length} /><MetricLite label="Students" value={students.length} /><MetricLite label="Subjects" value={(teacher.subjects || []).join(", ") || "-"} /><MetricLite label="Attendance %" value={`${summary.attendancePercentage || 0}%`} /><MetricLite label="Present Days" value={summary.presentDays || 0} /><MetricLite label="Absent Days" value={summary.absentDays || 0} /><MetricLite label="Teaching Hours" value={summary.teachingHours || 0} /><MetricLite label="Classes This Month" value={summary.classesConducted || 0} /><MetricLite label="Performance Rating" value={summary.grade || "N/A"} /></div><div className="grid gap-4 md:grid-cols-3"><Metric label="Missing Daily Logs" value={logs.some((row: any) => row.date?.slice?.(0, 10) === today) ? 0 : 1} icon={CalendarCheck} /><Metric label="Absent Today" value={attendance.some((row: any) => row.status === "absent" && row.date?.slice?.(0, 10) === today) ? 1 : 0} icon={Users} /><Metric label="Pending Reports" value={logs.filter((row: any) => row.status === "pending").length} icon={FileSpreadsheet} /></div></TabsContent>
    <TabsContent value="classes" className="mt-4 grid gap-2">{classes.length ? classes.map((klass: any) => <div key={klass._id} className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-4"><span className="font-medium">{klass.name}</span><span>{klass.grade || "-"}</span><span>{(klass.subjects || []).join(", ") || "-"}</span><span>{relationName(klass.schoolId)}</span></div>) : <EmptyState title="No classes assigned." />}</TabsContent>
    <TabsContent value="students" className="mt-4"><StudentMiniTable rows={students} /></TabsContent>
    <TabsContent value="attendance" className="mt-4 space-y-4"><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4"><MetricLite label="Present Days" value={summary.presentDays || 0} /><MetricLite label="Absent Days" value={summary.absentDays || 0} /><MetricLite label="Leave Days" value={summary.leaveDays || 0} /><MetricLite label="Half Days" value={summary.halfDays || 0} /><MetricLite label="Holiday Count" value={summary.holidayCount || 0} /><MetricLite label="Attendance %" value={`${summary.attendancePercentage || 0}%`} /><MetricLite label="Working Hours This Month" value={summary.workingHoursThisMonth || 0} /></div><Card className="rounded-lg"><CardHeader><CardTitle>Mark Teacher Attendance</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Input type="date" value={attendanceForm.date} onChange={(event) => setAttendanceForm({ ...attendanceForm, date: event.target.value })} /><NativeSelect value={attendanceForm.status} onChange={(event) => setAttendanceForm({ ...attendanceForm, status: event.target.value })}>{["present", "absent", "half-day", "leave", "holiday", "work-from-home"].map((status) => <option key={status} value={status}>{status}</option>)}</NativeSelect><Input value={attendanceForm.remarks} onChange={(event) => setAttendanceForm({ ...attendanceForm, remarks: event.target.value })} placeholder="Remarks" /><Input type="time" value={attendanceForm.checkInTime} onChange={(event) => setAttendanceForm({ ...attendanceForm, checkInTime: event.target.value })} /><Input type="time" value={attendanceForm.checkOutTime} onChange={(event) => setAttendanceForm({ ...attendanceForm, checkOutTime: event.target.value })} /><Input type="number" min={0} value={attendanceForm.totalHours} onChange={(event) => setAttendanceForm({ ...attendanceForm, totalHours: Number(event.target.value) })} /><Button className="md:col-span-3" onClick={saveAttendance}>Save Attendance</Button></CardContent></Card><div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr>{attendanceHeaders.map((head) => <th key={head} className="px-3 py-2">{head}</th>)}</tr></thead><tbody>{attendanceRows.map((row: any[], index: number) => <tr key={index} className="border-t">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2">{cell || "-"}</td>)}</tr>)}</tbody></table></div></TabsContent>
    <TabsContent value="worklog" className="mt-4 space-y-4"><div className="grid gap-3 md:grid-cols-4"><MetricLite label="Lessons Completed" value={summary.lessonsCompleted || 0} /><MetricLite label="Classes Conducted" value={summary.classesConducted || 0} /><MetricLite label="Teaching Hours" value={summary.teachingHours || 0} /><MetricLite label="Assessments Conducted" value={summary.assessmentsConducted || 0} /></div><div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[960px] text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr>{reportHeaders.map((head) => <th key={head} className="px-3 py-2">{head}</th>)}</tr></thead><tbody>{reportRows.map((row: any[], index: number) => <tr key={index} className="border-t">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2">{cell || "-"}</td>)}</tr>)}</tbody></table></div></TabsContent>
    <TabsContent value="performance" className="mt-4 space-y-4"><div className="grid gap-3 md:grid-cols-3"><MetricLite label="Teaching Activity Score" value={`${summary.teachingActivityScore || 0}%`} /><MetricLite label="Attendance Score" value={`${summary.attendanceScore || 0}%`} /><MetricLite label="Student Performance Score" value={`${summary.studentPerformanceScore || 0}%`} /><MetricLite label="Assessment Completion Score" value={`${summary.assessmentCompletionScore || 0}%`} /><MetricLite label="Homework Completion Score" value={`${summary.homeworkCompletionScore || 0}%`} /><MetricLite label="Final Rating" value={`${summary.finalRating || 0}% (${summary.grade || "N/A"})`} /></div><Card className="rounded-lg"><CardHeader><CardTitle>Teaching Activity Trend</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="hours" fill="#2563eb" /><Bar dataKey="classes" fill="#16a34a" /><Bar dataKey="assessments" fill="#f97316" /></BarChart></ResponsiveContainer></CardContent></Card></TabsContent>
    <TabsContent value="reports" className="mt-4 space-y-4"><Card className="rounded-lg"><CardHeader className="flex-row items-center justify-between"><CardTitle>Export Reports</CardTitle><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => exportCsv(datedExportName("Teacher_Work_Log"), reportHeaders, reportRows)}><Download className="mr-2 h-4 w-4" />CSV</Button><Button variant="outline" onClick={() => { const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([attendanceHeaders, ...attendanceRows]), "Teacher Attendance"); XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([reportHeaders, ...reportRows]), "Daily Work Logs"); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Teacher: teacher.fullName || teacher.username, Hours: summary.teachingHours || 0 }]), "Teaching Hours"); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(logs.map((row: any) => ({ Class: relationName(row.classSectionId), Lesson: row.lessonConducted || relationName(row.lessonId), Date: row.date }))), "Class Coverage"); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([summary]), "Performance Metrics"); XLSX.writeFile(workbook, datedExportName("Teacher_Workforce_Report", "xlsx", teacher.fullName || teacher.username)); }}><Download className="mr-2 h-4 w-4" />XLSX</Button><Button variant="outline" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" />PDF</Button></div></CardHeader><CardContent className="grid gap-3 md:grid-cols-4"><MetricLite label="Daily Report" value={today} /><MetricLite label="Weekly Report" value={`${logs.length} logs`} /><MetricLite label="Monthly Report" value={`${summary.finalRating || 0}%`} /><MetricLite label="Yearly Report" value="Export ready" /></CardContent></Card><Card className="rounded-lg"><CardHeader><CardTitle>Holiday Management</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><Input placeholder="Holiday name" value={holidayForm.name} onChange={(event) => setHolidayForm({ ...holidayForm, name: event.target.value })} /><NativeSelect value={holidayForm.type} onChange={(event) => setHolidayForm({ ...holidayForm, type: event.target.value })}>{["national", "school", "festival", "special", "emergency"].map((type) => <option key={type} value={type}>{type}</option>)}</NativeSelect><Input type="date" value={holidayForm.date} onChange={(event) => setHolidayForm({ ...holidayForm, date: event.target.value })} /><Input placeholder="Description" value={holidayForm.description} onChange={(event) => setHolidayForm({ ...holidayForm, description: event.target.value })} /><Button className="md:col-span-2" disabled={!holidayForm.name} onClick={saveHoliday}>Save Holiday</Button></CardContent></Card><div className="grid gap-2">{holidays.map((holiday: any) => <div key={holiday._id} className="flex flex-col gap-2 rounded-md border p-3 text-sm md:flex-row md:items-center md:justify-between"><div><span className="font-medium">{holiday.name}</span><span className="ml-2 text-slate-500">{holiday.date ? new Date(holiday.date).toLocaleDateString() : ""} - {holiday.type}</span><p className="mt-1 text-xs text-slate-500">Schools: {relationName(holiday.schoolIds)} | Teachers: {relationName(holiday.teacherIds) || "All scoped"} | Classes: {relationName(holiday.classSectionIds)}</p></div><Button size="sm" variant="outline" onClick={() => onHolidayDelete(holiday)}>Archive</Button></div>)}</div></TabsContent>
  </Tabs>;
}

function MetricLite({ label, value }: any) {
  return <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800"><p className="text-xs text-slate-500">{label}</p><p className="font-semibold">{value}</p></div>;
}

function ActivityIcon(props: any) {
  return <CalendarCheck {...props} />;
}

function ClockIcon(props: any) {
  return <CalendarCheck {...props} />;
}

function BookIcon(props: any) {
  return <FileSpreadsheet {...props} />;
}

function MultiSelect({ values, options, onChange }: any) {
  return <div className="grid gap-2 rounded-md border p-2 md:grid-cols-2">{options.map((option: any) => { const id = option._id; return <label key={id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.includes(id)} onChange={(event) => onChange(event.target.checked ? [...values, id] : values.filter((value: string) => value !== id))} />{relationName(option)}</label>; })}</div>;
}

function SchoolForm({ form, setForm, onSubmit }: any) {
  return <div className="grid gap-3 md:grid-cols-2"><Field label="School Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="School Code"><Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></Field><Field label="Principal"><Input value={form.principalName} onChange={(event) => setForm({ ...form, principalName: event.target.value })} /></Field><Field label="Email"><Input value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} /></Field><Field label="Phone"><Input value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} /></Field><Field label="City"><Input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field><div className="md:col-span-2"><Field label="Address"><Textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field></div><Button className="md:col-span-2" disabled={!form.name.trim()} onClick={onSubmit}>Save School</Button></div>;
}

function TeacherForm({ form, setForm, schools, classes, onSubmit }: any) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Full Name"><Input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></Field>
      <UsernameField value={form.username} seed={form.fullName || form.email || "teacher"} onChange={(username) => setForm({ ...form, username })} />
      <Field label="Schools"><MultiSelect values={form.schoolIds || []} options={schools} onChange={(value: string[]) => setForm({ ...form, schoolIds: value, schoolId: value[0] || "" })} /></Field>
      <Field label="Email"><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
      <Field label="Phone"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
      <Field label="Subjects"><Input value={form.subjects} onChange={(event) => setForm({ ...form, subjects: event.target.value })} placeholder="Python, Robotics" /></Field>
      <div className="md:col-span-2"><Field label="Classes"><MultiSelect values={form.classSectionIds} options={classes.filter((klass: any) => !form.schoolId || String(klass.schoolId?._id || klass.schoolId) === form.schoolId)} onChange={(value: string[]) => setForm({ ...form, classSectionIds: value })} /></Field></div>
      <Button className="md:col-span-2" disabled={!form.schoolIds || !form.schoolIds.length} onClick={onSubmit}>Save Teacher</Button>
    </div>
  );
}

function StudentForm({ form, setForm, schools, classes, courses, onSubmit }: any) {
  const selectedClass = classes.find((klass: any) => String(klass._id) === String(form.classSectionIds?.[0]));
  return <div className="grid gap-3 md:grid-cols-2"><Field label="Full Name"><Input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></Field><UsernameField value={form.username} seed={form.fullName || form.studentId || "student"} onChange={(username) => setForm({ ...form, username })} /><Field label="School"><NativeSelect value={form.schoolId} onChange={(event) => setForm({ ...form, schoolId: event.target.value, classSectionIds: [], grade: "" })}><option value="">Select school</option>{schools.map((school: any) => <option key={school._id} value={school._id}>{school.name}</option>)}</NativeSelect></Field><Field label="Grade"><NativeSelect value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value, classSectionIds: [] })}><option value="">Select grade</option>{fixedGrades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</NativeSelect></Field><Field label="Roll Number"><Input value={form.rollNumber} onChange={(event) => setForm({ ...form, rollNumber: event.target.value })} /></Field><Field label="Email"><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field><Field label="Parent"><Input value={form.parentName} onChange={(event) => setForm({ ...form, parentName: event.target.value })} /></Field><Field label="Parent Phone"><Input value={form.parentContact} onChange={(event) => setForm({ ...form, parentContact: event.target.value })} /></Field><div className="md:col-span-2"><Field label="Classes"><MultiSelect values={form.classSectionIds} options={classes.filter((klass: any) => (!form.schoolId || String(klass.schoolId?._id || klass.schoolId) === form.schoolId) && (!form.grade || klass.grade === form.grade))} onChange={(value: string[]) => setForm({ ...form, classSectionIds: value })} /></Field></div><Field label="Default Class Fee"><Input value={selectedClass ? formatCurrency(selectedClass.feeAmount, selectedClass.currency) : "Select a class"} readOnly /></Field><Field label="Custom Fee Override"><Input type="number" min={0} value={form.customFeeAmount || ""} onChange={(event) => setForm({ ...form, customFeeAmount: event.target.value })} placeholder="Optional scholarship amount" /></Field><div className="md:col-span-2"><Field label="Courses"><MultiSelect values={form.assignedCourses} options={courses.filter((course: any) => course.active)} onChange={(value: string[]) => setForm({ ...form, assignedCourses: value })} /></Field></div><Field label="Status"><NativeSelect value={form.active ? "active" : "archived"} onChange={(event) => setForm({ ...form, active: event.target.value === "active" })}><option value="active">Active</option><option value="archived">Archived</option></NativeSelect></Field><Button className="md:col-span-2" disabled={!form.schoolId || !form.classSectionIds.length} onClick={onSubmit}>Save Student</Button></div>;
}

function ClassForm({ form, setForm, schools, teachers, courses, students, editing, onSubmit, onStudentEdit, onStudentDelete, onStudentTransfer }: any) {
  const [step, setStep] = useState(0);
  const [pasteText, setPasteText] = useState("");
  const [manualStudent, setManualStudent] = useState({ fullName: "", rollNumber: "", parentName: "", parentContact: "" });
  const enrolledStudents = students.filter((student: any) => (student.classSectionIds || []).some((klass: any) => String(klass._id || klass) === String(editing?._id)));
  const preview = validateStudentRows(form.students || []);
  const steps = ["Class Information", "Teacher Assignment", "Course Assignment", "Student Enrollment", editing ? "Review & Save" : "Review & Create"];
  const selectedTeacher = teachers.find((teacher: any) => String(teacher._id) === String(form.classTeacherId));
  const classDisplayName = form.grade && form.name ? `${form.grade} - ${form.name}` : "New Class";

  const addRows = (rows: any[]) => {
    const next = validateStudentRows(rows).valid;
    setForm({ ...form, students: [...(form.students || []), ...next] });
  };

  const handlePaste = () => {
    addRows(parseStudentCsvRows(pasteText));
    setPasteText("");
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "xlsx") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      addRows(XLSX.utils.sheet_to_json(sheet));
      return;
    }
    const text = await file.text();
    addRows(parseStudentCsvRows(text));
  };

  const addManualStudent = () => {
    const { valid } = validateStudentRows([manualStudent]);
    if (!valid.length) return toast.error("Complete all student fields");
    setForm({ ...form, students: [...(form.students || []), valid[0]] });
    setManualStudent({ fullName: "", rollNumber: "", parentName: "", parentContact: "" });
  };

  return <div className="space-y-5">
    <div className="grid gap-2 md:grid-cols-5">{steps.map((label, index) => <button key={label} type="button" onClick={() => setStep(index)} className={`rounded-md border px-3 py-2 text-left text-xs font-medium ${step === index ? "border-slate-950 bg-slate-950 text-white" : "bg-white text-slate-600 dark:bg-slate-900"}`}><span className="block text-[11px] opacity-70">Step {index + 1}</span>{label}</button>)}</div>

    {step === 0 && <div className="grid gap-3 md:grid-cols-2">
      <Field label="School *"><NativeSelect value={form.schoolId} onChange={(event) => setForm({ ...form, schoolId: event.target.value, grade: "", classTeacherId: "", teacherIds: [] })}><option value="">Select school</option>{schools.map((school: any) => <option key={school._id} value={school._id}>{school.name}</option>)}</NativeSelect></Field>
      <Field label="Grade *"><NativeSelect value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })}><option value="">Select grade</option>{fixedGrades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</NativeSelect></Field>
      <Field label="Class Name *"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value.toUpperCase() })} placeholder="A" /></Field>
      <Field label="Capacity *"><Input type="number" min={1} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} /></Field>
      <Field label="Status *"><NativeSelect value={form.active ? "active" : "archived"} onChange={(event) => setForm({ ...form, active: event.target.value === "active" })}><option value="active">Active</option><option value="archived">Archived</option></NativeSelect></Field>
      <Field label="Fee Type"><NativeSelect value={form.feeType || "monthly"} onChange={(event) => setForm({ ...form, feeType: event.target.value })}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option><option value="course-based">Course Based</option><option value="none">No Fee</option></NativeSelect></Field>
      <Field label="Fee Amount"><Input type="number" min={0} value={form.feeAmount ?? 0} onChange={(event) => setForm({ ...form, feeAmount: Number(event.target.value) })} /></Field>
      <Field label="Currency"><NativeSelect value={form.currency || "INR"} onChange={(event) => setForm({ ...form, currency: event.target.value })}><option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></NativeSelect></Field>
      <Field label="Fee Due Day"><Input type="number" min={1} max={31} value={form.feeDueDay ?? 5} onChange={(event) => setForm({ ...form, feeDueDay: Number(event.target.value) })} /></Field>
      <div className="rounded-md border bg-slate-50 p-3 text-sm dark:bg-slate-900"><p className="text-xs text-slate-500">Auto-generated display name</p><p className="mt-1 font-semibold">{classDisplayName}</p></div>
      <div className="rounded-md border bg-slate-50 p-3 text-sm dark:bg-slate-900"><p className="text-xs text-slate-500">Class fee structure</p><p className="mt-1 font-semibold">{formatCurrency(form.feeAmount, form.currency)} / {String(form.feeType || "monthly").replace("-", " ")}</p><p className="text-xs text-slate-500">Due day {form.feeDueDay || 5}</p></div>
    </div>}

    {step === 1 && <div className="grid gap-3 md:grid-cols-2">
      <Field label="Teacher *"><NativeSelect value={form.classTeacherId} onChange={(event) => setForm({ ...form, classTeacherId: event.target.value, teacherIds: event.target.value ? [event.target.value] : [] })}><option value="">Select teacher</option>{teachers.filter((teacher: any) => {
        if (!form.schoolId) return true;
        const teacherSchoolIds = (teacher.schoolIds && teacher.schoolIds.map((s: any) => String(s._id || s))) || [];
        const primary = String(teacher.schoolId?._id || teacher.schoolId || "");
        return teacherSchoolIds.includes(form.schoolId) || primary === form.schoolId;
      }).map((teacher: any) => <option key={teacher._id} value={teacher._id}>{teacher.fullName || teacher.username}</option>)}</NativeSelect></Field>
      <Field label="Subjects"><Input value={form.subjects} onChange={(event) => setForm({ ...form, subjects: event.target.value })} placeholder="Math, Science, Robotics" /></Field>
      <div className="md:col-span-2 rounded-md border p-4"><p className="text-sm font-medium">{selectedTeacher ? relationName(selectedTeacher) : "No teacher selected"}</p><p className="text-sm text-slate-500">Teacher assignment is required before class creation.</p></div>
    </div>}

    {step === 2 && <div className="space-y-3">
      <Field label="Courses"><MultiSelect values={form.courseIds} options={courses.filter((course: any) => course.active)} onChange={(value: string[]) => setForm({ ...form, courseIds: value })} /></Field>
    </div>}

    {step === 3 && <div className="space-y-4">
      <div className="rounded-md border p-4">
        <div className="mb-3 flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" /><p className="font-semibold">Student Enrollment</p></div>
        <Textarea className="min-h-36 font-mono" value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder={"Student Name,Roll Number,Parent Name,Parent Number\nArun Kumar,R001,Ramesh Kumar,9876543201\nKavin Raj,R002,Suresh Raj,9876543202\nDivya Sri,R003,Meena Devi,9876543203"} />
        <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={!pasteText.trim()} onClick={handlePaste}>Preview Pasted Students</Button><label className="inline-flex h-10 cursor-pointer items-center rounded-md border px-4 text-sm font-medium"><Upload className="mr-2 h-4 w-4" />Upload CSV/XLSX<input type="file" accept=".csv,.xlsx" className="hidden" onChange={(event) => handleUpload(event.target.files?.[0])} /></label></div>
      </div>
      <div className="grid gap-3 md:grid-cols-4"><Input placeholder="Student Name" value={manualStudent.fullName} onChange={(event) => setManualStudent({ ...manualStudent, fullName: event.target.value })} /><Input placeholder="Roll Number" value={manualStudent.rollNumber} onChange={(event) => setManualStudent({ ...manualStudent, rollNumber: event.target.value })} /><Input placeholder="Parent Name" value={manualStudent.parentName} onChange={(event) => setManualStudent({ ...manualStudent, parentName: event.target.value })} /><Input placeholder="Parent Number" value={manualStudent.parentContact} onChange={(event) => setManualStudent({ ...manualStudent, parentContact: event.target.value })} /><Button type="button" variant="outline" onClick={addManualStudent}>Add Student</Button></div>
      <div className="grid gap-3 md:grid-cols-2"><MetricLite label="Valid Students" value={preview.valid.length} /><MetricLite label="Invalid Students" value={preview.invalid.length} /></div>
      <StudentMiniTable rows={preview.valid} emptyText="No new students staged yet." />
      {editing && <div className="space-y-2"><p className="text-sm font-semibold">Enrolled Students</p><StudentMiniTable rows={enrolledStudents} actions={{ onStudentEdit, onStudentDelete, onStudentTransfer }} /></div>}
    </div>}

    {step === 4 && <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4"><MetricLite label="School" value={relationName(schools.find((school: any) => school._id === form.schoolId))} /><MetricLite label="Grade" value={form.grade || "-"} /><MetricLite label="Class" value={classDisplayName} /><MetricLite label="Capacity" value={form.capacity || 0} /><MetricLite label="Teacher" value={selectedTeacher ? relationName(selectedTeacher) : "-"} /><MetricLite label="Courses" value={(form.courseIds || []).length} /><MetricLite label="Class Fee" value={formatCurrency(form.feeAmount, form.currency)} /><MetricLite label="Due Day" value={form.feeDueDay || 5} /><MetricLite label="New Students" value={preview.valid.length} /><MetricLite label="Status" value={form.active ? "Active" : "Archived"} /></div>
    </div>}

    <div className="flex items-center justify-between border-t pt-4">
      <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Previous</Button>
      {step < steps.length - 1 ? <Button type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}>Next</Button> : <Button type="button" disabled={!form.schoolId || !form.grade || !form.name || !form.classTeacherId || !form.capacity} onClick={onSubmit}>{editing ? "Save Class" : "Create Class"}</Button>}
    </div>
  </div>;
}

function AttendanceMiniTable({ rows, emptyText = "No attendance recorded yet." }: any) {
  const flatRows = flattenAttendance(rows);
  if (!flatRows.length) return <div className="rounded-md border border-dashed py-8 text-center text-sm text-slate-500">{emptyText}</div>;
  return <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[860px] text-sm"><thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-900"><tr>{["Date", "Student", "Class", "Status", "Marked By", "Note"].map((head) => <th key={head} className="px-3 py-2 font-medium">{head}</th>)}</tr></thead><tbody>{flatRows.map((row: any, index: number) => <tr key={row._id || index} className="border-t"><td className="px-3 py-2">{row.date ? new Date(row.date).toLocaleDateString() : "-"}</td><td className="px-3 py-2 font-medium">{relationName(row.studentId)}</td><td className="px-3 py-2">{relationName(row.classSectionId)}</td><td className="px-3 py-2"><Badge variant={row.status === "present" ? "default" : "secondary"}>{row.status || "-"}</Badge></td><td className="px-3 py-2">{relationName(row.markedBy)}</td><td className="px-3 py-2">{row.note || row.remarks || "-"}</td></tr>)}</tbody></table></div>;
}

function FeeMiniTable({ rows, emptyText = "No fee records yet." }: any) {
  if (!rows.length) return <div className="rounded-md border border-dashed py-8 text-center text-sm text-slate-500">{emptyText}</div>;
  return <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[860px] text-sm"><thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-900"><tr>{["Student", "Class", "Total", "Paid", "Pending", "Due Date", "Status"].map((head) => <th key={head} className="px-3 py-2 font-medium">{head}</th>)}</tr></thead><tbody>{rows.map((fee: any) => <tr key={fee._id} className="border-t"><td className="px-3 py-2 font-medium">{relationName(fee.studentId)}</td><td className="px-3 py-2">{relationName(fee.classSectionId)}</td><td className="px-3 py-2">{formatCurrency(fee.totalFees, fee.currency)}</td><td className="px-3 py-2">{formatCurrency(fee.paidAmount, fee.currency)}</td><td className="px-3 py-2">{formatCurrency(fee.pendingAmount, fee.currency)}</td><td className="px-3 py-2">{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : "-"}</td><td className="px-3 py-2"><Badge className={statusClass(fee.status)}>{feeLabel(fee.status)}</Badge></td></tr>)}</tbody></table></div>;
}
function StudentMiniTable({ rows, actions, emptyText = "No students found." }: any) {
  if (!rows.length) return <div className="rounded-md border border-dashed py-8 text-center text-sm text-slate-500">{emptyText}</div>;
  return <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-900"><tr>{["Student Name", "Roll Number", "Parent Name", "Parent Number", "Attendance", "Fees Status", "Actions"].map((head) => <th key={head} className="px-3 py-2 font-medium">{head}</th>)}</tr></thead><tbody>{rows.map((student: any, index: number) => <tr key={student._id || `${student.rollNumber}-${index}`} className="border-t"><td className="px-3 py-2 font-medium">{student.fullName || student.username}</td><td className="px-3 py-2">{student.rollNumber || "-"}</td><td className="px-3 py-2">{student.parentName || "-"}</td><td className="px-3 py-2">{student.parentContact || "-"}</td><td className="px-3 py-2">{student.attendancePercentage || 0}%</td><td className="px-3 py-2">{feeLabel(student.feeAccount?.status)}</td><td className="px-3 py-2">{actions ? <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => actions.onStudentEdit(student)}>Edit</Button><Button size="sm" variant="outline" onClick={() => actions.onStudentTransfer(student)}>Transfer</Button><Button size="sm" variant="destructive" onClick={() => actions.onStudentDelete(student)}>Delete</Button></div> : <Badge variant="outline">Ready</Badge>}</td></tr>)}</tbody></table></div>;
}

function FeeForm({ form, setForm, schools, classes, students, onSubmit }: any) {
  const selectedClass = classes.find((klass: any) => String(klass._id) === String(form.classSectionId));
  return <div className="grid gap-3 md:grid-cols-2"><Field label="School"><NativeSelect value={form.schoolId} onChange={(event) => setForm({ ...form, schoolId: event.target.value, classSectionId: "", studentId: "" })}><option value="">Select school</option>{schools.map((school: any) => <option key={school._id} value={school._id}>{school.name}</option>)}</NativeSelect></Field><Field label="Class"><NativeSelect value={form.classSectionId} onChange={(event) => { const klass = classes.find((item: any) => item._id === event.target.value); setForm({ ...form, classSectionId: event.target.value, totalFees: klass?.feeAmount ?? form.totalFees, currency: klass?.currency || form.currency, feeType: klass?.feeType || form.feeType }); }}><option value="">Select class</option>{classes.filter((klass: any) => !form.schoolId || String(klass.schoolId?._id || klass.schoolId) === form.schoolId).map((klass: any) => <option key={klass._id} value={klass._id}>{klass.name}</option>)}</NativeSelect></Field><Field label="Student"><NativeSelect value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })}><option value="">Select student</option>{students.filter((student: any) => !form.classSectionId || (student.classSectionIds || []).some((klass: any) => String(klass._id || klass) === String(form.classSectionId))).map((student: any) => <option key={student._id} value={student._id}>{student.fullName || student.username}</option>)}</NativeSelect></Field><Field label="Fee Type"><NativeSelect value={form.feeType || "custom"} onChange={(event) => setForm({ ...form, feeType: event.target.value })}><option value="custom">Custom</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option><option value="course-based">Course Based</option></NativeSelect></Field><Field label="Default Class Fee"><Input value={selectedClass ? formatCurrency(selectedClass.feeAmount, selectedClass.currency) : "-"} readOnly /></Field><Field label="Total"><Input type="number" min={0} value={form.totalFees} onChange={(event) => setForm({ ...form, totalFees: event.target.value })} /></Field><Field label="Paid"><Input type="number" min={0} value={form.paidAmount} onChange={(event) => setForm({ ...form, paidAmount: event.target.value })} /></Field><Field label="Currency"><NativeSelect value={form.currency || "INR"} onChange={(event) => setForm({ ...form, currency: event.target.value })}><option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></NativeSelect></Field><Field label="Due Date"><Input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></Field><div className="md:col-span-2"><Field label="Notes"><Textarea value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field></div><Button className="md:col-span-2" disabled={!form.schoolId || !form.studentId} onClick={onSubmit}>Save Fee</Button></div>;
}

function NotificationForm({ form, setForm, schools, classes, onSubmit }: any) {
  return <div className="grid gap-3 md:grid-cols-2"><Field label="Audience"><NativeSelect value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })}>{["all", "school", "teachers", "class", "students"].map((item) => <option key={item} value={item}>{item}</option>)}</NativeSelect></Field><Field label="School"><NativeSelect value={form.schoolId} onChange={(event) => setForm({ ...form, schoolId: event.target.value })}><option value="">All schools</option>{schools.map((school: any) => <option key={school._id} value={school._id}>{school.name}</option>)}</NativeSelect></Field><Field label="Class"><NativeSelect value={form.classSectionId} onChange={(event) => setForm({ ...form, classSectionId: event.target.value })}><option value="">All classes</option>{classes.map((klass: any) => <option key={klass._id} value={klass._id}>{klass.name}</option>)}</NativeSelect></Field><Field label="Title"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field><div className="md:col-span-2"><Field label="Message"><Textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></Field></div><Button className="md:col-span-2" disabled={!form.title || !form.body} onClick={onSubmit}>Send Notification</Button></div>;
}
