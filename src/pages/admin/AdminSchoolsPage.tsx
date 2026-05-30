import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Bell, Building2, CalendarCheck, CreditCard, Edit3, GraduationCap, Plus, RefreshCw, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import AdminShell from "@/components/layout/AdminShell";
import GlobalFilters, { filtersToQuery, readStoredFilters, type GlobalFilterState } from "@/components/admin/GlobalFilters";
import UsernameField from "@/components/admin/UsernameField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const PAGE_SIZE = 8;
const emptySchool = { name: "", code: "", address: "", city: "", state: "", country: "India", pincode: "", contactPhone: "", alternatePhone: "", principalName: "", contactEmail: "", logoUrl: "", schoolType: "private", plan: "trial", active: true };
const emptyTeacher = { fullName: "", username: "", email: "", phone: "", employeeId: "", schoolId: "", classSectionIds: [] as string[], subjects: "", qualification: "", experience: "", profilePhotoUrl: "", joiningDate: "", salary: "", permissions: ["students:view", "students:manage", "classes:manage", "attendance", "materials", "assignments", "coding", "analytics", "messages", "fees:view"], active: true };
const emptyClass = { schoolId: "", name: "", grade: "", section: "A", classTeacherId: "", teacherIds: [] as string[], courseIds: [] as string[], subjects: "", schedule: "", codingTracks: "python,scratch,robotics", capacity: 30, students: [] as any[], active: true };

const teacherPermissionOptions = [
  { value: "students:view", label: "View students" },
  { value: "students:manage", label: "Manage students" },
  { value: "classes:manage", label: "Create/manage classes" },
  { value: "attendance", label: "Mark attendance" },
  { value: "materials", label: "Upload materials" },
  { value: "assignments", label: "Create assignments" },
  { value: "coding", label: "Access coding module" },
  { value: "analytics", label: "View analytics" },
  { value: "fees:view", label: "View fee status" },
  { value: "messages", label: "Send messages/announcements" }
];
const emptyStudent = { fullName: "", username: "", studentId: "", rollNumber: "", parentName: "", parentContact: "", email: "", phone: "", schoolId: "", classSectionIds: [] as string[], grade: "", assignedCourses: [] as string[], feeStructure: "", profilePhotoUrl: "", active: true };
const emptyFee = { schoolId: "", classSectionId: "", studentId: "", totalFees: "", paidAmount: "0", dueDate: "", notes: "" };
const emptyNotification = { schoolId: "", classSectionId: "", audience: "all", title: "", body: "", active: true };

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-10 w-full rounded-md border border-input bg-background px-3 text-sm ${props.className || ""}`} />;
}

export default function AdminSchoolsPage() {
  const { token } = useAuth();
  const location = useLocation();
  const routeTab = location.pathname.split("/").pop() || "schools";
  const routeActiveTab = ["teachers", "classes", "students", "fees", "attendance", "notifications", "settings"].includes(routeTab) ? routeTab : "schools";
  const [activeTab, setActiveTab] = useState(routeActiveTab);

  const [stats, setStats] = useState<any>({});
  const [filters, setFilters] = useState<GlobalFilterState>(() => readStoredFilters("learnpy-admin-filters"));
  const [filterOptions, setFilterOptions] = useState<any>({});
  const [schools, setSchools] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [schoolForm, setSchoolForm] = useState<any>(emptySchool);
  const [teacherForm, setTeacherForm] = useState<any>(emptyTeacher);
  const [classForm, setClassForm] = useState<any>(emptyClass);
  const [studentForm, setStudentForm] = useState<any>(emptyStudent);
  const [feeForm, setFeeForm] = useState<any>(emptyFee);
  const [notificationForm, setNotificationForm] = useState<any>(emptyNotification);
  const [attendanceForm, setAttendanceForm] = useState<any>({ classSectionId: "", date: new Date().toISOString().slice(0, 10), records: {} });
  const [credential, setCredential] = useState("");

  useEffect(() => {
    localStorage.setItem("learnpy-draft-school", JSON.stringify(schoolForm));
    localStorage.setItem("learnpy-draft-teacher", JSON.stringify(teacherForm));
    localStorage.setItem("learnpy-draft-class", JSON.stringify(classForm));
    localStorage.setItem("learnpy-draft-student", JSON.stringify(studentForm));
  }, [schoolForm, teacherForm, classForm, studentForm]);

  const load = async () => {
    const query = filtersToQuery(filters);
    const [dashboard, schoolsData, teachersData, classesData, studentsData, coursesData, feesData, attendanceData, notificationData] = await Promise.all([
      apiFetch(`/admin/dashboard${query}`, {}, token),
      apiFetch(`/admin/schools${query}`, {}, token),
      apiFetch(`/admin/teachers${query}`, {}, token),
      apiFetch(`/admin/classes${query}`, {}, token),
      apiFetch(`/admin/students${query}`, {}, token),
      apiFetch(`/admin/courses${filters.courseId ? `?courseId=${filters.courseId}` : ""}`, {}, token),
      apiFetch(`/admin/fees${query}`, {}, token),
      apiFetch(`/admin/attendance${query}`, {}, token),
      apiFetch("/admin/notifications", {}, token)
    ]);
    setStats(dashboard);
    setSchools(schoolsData);
    setTeachers(teachersData);
    setClasses(classesData);
    setStudents(studentsData);
    setCourses(coursesData);
    setFees(feesData);
    setAttendance(attendanceData);
    setNotifications(notificationData);
  };

  useEffect(() => {
    load().catch((error) => toast.error(error.message));
    const timer = window.setInterval(() => load().catch(() => undefined), 15000);
    return () => window.clearInterval(timer);
  }, [token, filters]);

  useEffect(() => {
    apiFetch("/admin/filter-options", {}, token).then(setFilterOptions).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    setActiveTab(routeActiveTab);
  }, [routeActiveTab]);

  const summary = [
    { label: "Schools", value: stats.totalSchools ?? schools.length, icon: Building2 },
    { label: "Teachers", value: stats.totalTeachers ?? teachers.length, icon: ShieldCheck },
    { label: "Classes", value: classes.filter((row) => row.active !== false).length, icon: GraduationCap },
    { label: "Students", value: stats.totalStudents ?? students.length, icon: Users },
    { label: "Pending Fees", value: `Rs. ${Number(stats.pendingFees || 0).toLocaleString()}`, icon: CreditCard },
    { label: "Attendance", value: `${stats.attendancePercentage || 0}%`, icon: CalendarCheck }
  ];

  const filteredSchools = useMemo(() => {
    const q = search.toLowerCase();
    return schools.filter((school) => [school.name, school.code, school.city, school.principalName].some((value) => String(value || "").toLowerCase().includes(q)));
  }, [schools, search]);
  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / PAGE_SIZE));
  const pagedSchools = filteredSchools.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedClassStudents = students.filter((student) => (student.classSectionIds || []).some((klass: any) => String(klass._id || klass) === attendanceForm.classSectionId));

  const submit = async (kind: string) => {
    try {
      if (kind === "school") {
        await apiFetch(editing ? `/admin/schools/${editing._id}` : "/admin/schools", { method: editing ? "PUT" : "POST", body: JSON.stringify(schoolForm) }, token);
      }
      if (kind === "teacher") {
        const payload = { ...teacherForm, subjects: splitList(teacherForm.subjects), permissions: teacherForm.permissions };
        const res = await apiFetch(editing ? `/admin/teachers/${editing._id}` : "/admin/teachers", { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) }, token);
        if (res.tempPassword) setCredential(`${res.username} temporary password: ${res.tempPassword}`);
      }
      if (kind === "class") {
        const payload = { ...classForm, subjects: splitList(classForm.subjects), codingTracks: splitList(classForm.codingTracks) };
        const res = await apiFetch(editing ? `/admin/classes/${editing._id}` : "/admin/classes", { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) }, token);
        if (res.students?.length) setCredential(`${res.students.length} student usernames created with password Robokidy@123`);
      }
      if (kind === "student") {
        const res = await apiFetch(editing ? `/admin/students/${editing._id}` : "/admin/students", { method: editing ? "PUT" : "POST", body: JSON.stringify(studentForm) }, token);
        if (res.tempPassword) setCredential(`${res.username} temporary password: ${res.tempPassword}`);
      }
      if (kind === "fee") {
        await apiFetch(editing ? `/admin/fees/${editing._id}` : "/admin/fees", { method: editing ? "PUT" : "POST", body: JSON.stringify(feeForm) }, token);
      }
      if (kind === "notification") {
        await apiFetch(editing ? `/admin/notifications/${editing._id}` : "/admin/notifications", { method: editing ? "PUT" : "POST", body: JSON.stringify(notificationForm) }, token);
      }
      toast.success(`${kind} saved`);
      setDialog("");
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save");
    }
  };

  const deactivate = async (path: string) => {
    if (!confirm("Deactivate this record?")) return;
    await apiFetch(path, { method: "DELETE" }, token);
    toast.success("Record updated");
    load();
  };

  const markAttendance = async () => {
    const records = Object.entries(attendanceForm.records).map(([studentId, status]) => ({ studentId, status }));
    await apiFetch("/admin/attendance", { method: "POST", body: JSON.stringify({ classSectionId: attendanceForm.classSectionId, date: attendanceForm.date, records }) }, token);
    toast.success("Attendance saved");
    load();
  };

  const openCreate = (kind: string) => {
    setEditing(null);
    setDialog(kind);
    const draft = localStorage.getItem(`learnpy-draft-${kind}`);
    const saved = draft ? JSON.parse(draft) : null;
    if (kind === "school") setSchoolForm(saved || emptySchool);
    if (kind === "teacher") setTeacherForm(saved || emptyTeacher);
    if (kind === "class") setClassForm(saved || emptyClass);
    if (kind === "student") setStudentForm(saved || emptyStudent);
    if (kind === "fee") setFeeForm(emptyFee);
    if (kind === "notification") setNotificationForm(emptyNotification);
  };

  const openEdit = (kind: string, row: any) => {
    setEditing(row);
    setDialog(kind);
    if (kind === "school") setSchoolForm({ ...emptySchool, ...row });
    if (kind === "teacher") setTeacherForm({ ...emptyTeacher, ...row, schoolId: row.schoolId?._id || row.schoolId || "", classSectionIds: (row.classSectionIds || []).map((item: any) => item._id || item), subjects: (row.subjects || []).join(", "), permissions: row.permissions || [], joiningDate: row.joiningDate?.slice(0, 10) || "" });
    if (kind === "class") setClassForm({ ...emptyClass, ...row, schoolId: row.schoolId?._id || row.schoolId || "", classTeacherId: row.classTeacherId?._id || row.classTeacherId || "", teacherIds: (row.teacherIds || []).map((item: any) => item._id || item), courseIds: (row.courseIds || []).map((item: any) => item._id || item), subjects: (row.subjects || []).join(", "), codingTracks: (row.codingTracks || []).join(", ") });
    if (kind === "student") setStudentForm({ ...emptyStudent, ...row, schoolId: row.schoolId?._id || row.schoolId || "", classSectionIds: (row.classSectionIds || []).map((item: any) => item._id || item), assignedCourses: (row.assignedCourses || []).map((item: any) => item._id || item) });
    if (kind === "fee") setFeeForm({ ...emptyFee, ...row, schoolId: row.schoolId?._id || row.schoolId || "", classSectionId: row.classSectionId?._id || row.classSectionId || "", studentId: row.studentId?._id || row.studentId || "", dueDate: row.dueDate?.slice(0, 10) || "" });
    if (kind === "notification") setNotificationForm({ ...emptyNotification, ...row, schoolId: row.schoolId?._id || row.schoolId || "", classSectionId: row.classSectionId?._id || row.classSectionId || "" });
  };

  return (
    <AdminShell title="School Operations" subtitle="CEO control plane for schools, accounts, classes, fees, attendance, notifications, and reports">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summary.map((item) => {
          const Icon = item.icon;
          return <Card key={item.label} className="rounded-lg"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-xs text-muted-foreground">{item.label}</CardTitle><Icon className="h-4 w-4 text-blue-600" /></CardHeader><CardContent className="text-2xl font-bold">{item.value}</CardContent></Card>;
        })}
      </div>

      {credential && <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">{credential}</div>}

      <div className="mt-4">
        <GlobalFilters filters={filters} setFilters={setFilters} options={filterOptions} storageKey="learnpy-admin-filters" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <TabsList className="h-auto flex-wrap justify-start">
            {["schools", "teachers", "classes", "students", "fees", "attendance", "notifications", "settings"].map((tab) => <TabsTrigger key={tab} value={tab} className="capitalize">{tab}</TabsTrigger>)}
          </TabsList>
          <Button variant="outline" onClick={() => load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        </div>

        <TabsContent value="schools"><Card className="rounded-lg"><CardHeader className="gap-3 md:flex-row md:items-center md:justify-between"><CardTitle>Schools</CardTitle><div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search schools" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div><Button onClick={() => openCreate("school")}><Plus className="mr-2 h-4 w-4" />New School</Button></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>School</TableHead><TableHead>Principal</TableHead><TableHead>Contact</TableHead><TableHead>Counts</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{pagedSchools.map((school) => <TableRow key={school._id}><TableCell><p className="font-semibold">{school.name}</p><p className="text-xs text-muted-foreground">{school.code} • {school.city || "No city"}</p></TableCell><TableCell>{school.principalName || "-"}</TableCell><TableCell><p>{school.contactPhone || "-"}</p><p className="text-xs text-muted-foreground">{school.contactEmail || "-"}</p></TableCell><TableCell>{school.teacherCount || 0} teachers / {school.studentCount || 0} students / {school.classCount || 0} classes</TableCell><TableCell><Badge variant={school.active ? "default" : "secondary"}>{school.active ? "Active" : "Inactive"}</Badge></TableCell><TableCell><div className="flex justify-end gap-2"><Button size="icon" variant="outline" onClick={() => openEdit("school", school)}><Edit3 className="h-4 w-4" /></Button><Button size="icon" variant="destructive" onClick={() => deactivate(`/admin/schools/${school._id}`)}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table><div className="mt-4 flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p><div className="flex gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button><Button variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button></div></div></CardContent></Card></TabsContent>

        <TabsContent value="teachers"><EntityTable title="Teachers" button="Create Teacher" onCreate={() => openCreate("teacher")} rows={teachers} columns={["Name", "School", "Classes", "Subjects", "Status"]} render={(teacher) => [teacher.fullName || teacher.username, teacher.schoolId?.name || "-", (teacher.classSectionIds || []).map((c: any) => c.name).join(", ") || "-", (teacher.subjects || []).join(", ") || "-", teacher.active ? "Active" : "Inactive"]} onEdit={(row) => openEdit("teacher", row)} onDelete={(row) => deactivate(`/admin/teachers/${row._id}`)} /></TabsContent>
        <TabsContent value="classes"><EntityTable title="Classes" button="Create Class" onCreate={() => openCreate("class")} rows={classes} columns={["Class", "School", "Teachers", "Courses", "Capacity"]} render={(klass) => [klass.name, klass.schoolId?.name || "-", (klass.teacherIds || []).map((t: any) => t.fullName || t.username).join(", ") || "-", (klass.courseIds || []).map((course: any) => course.name || course.slug || course).join(", ") || "-", klass.capacity || 30]} onEdit={(row) => openEdit("class", row)} onDelete={(row) => deactivate(`/admin/classes/${row._id}`)} /></TabsContent>
        <TabsContent value="students"><EntityTable title="Students" button="Create Student" onCreate={() => openCreate("student")} rows={students} columns={["Student", "School", "Class", "Parent", "Courses"]} render={(student) => [student.fullName || student.username, student.schoolId?.name || "-", (student.classSectionIds || []).map((c: any) => c.name).join(", ") || "-", `${student.parentName || "-"} ${student.parentContact || ""}`, (student.assignedCourses || []).map((c: any) => c.name).join(", ") || "-"]} onEdit={(row) => openEdit("student", row)} onDelete={(row) => deactivate(`/admin/students/${row._id}`)} /></TabsContent>
        <TabsContent value="fees"><EntityTable title="Fees" button="Create Fee" onCreate={() => openCreate("fee")} rows={fees} columns={["Student", "School", "Total", "Paid", "Status"]} render={(fee) => [fee.studentId?.fullName || fee.studentId?.username || "-", fee.schoolId?.name || "-", `Rs. ${Number(fee.totalFees || 0).toLocaleString()}`, `Rs. ${Number(fee.paidAmount || 0).toLocaleString()}`, fee.status]} onEdit={(row) => openEdit("fee", row)} onDelete={(row) => deactivate(`/admin/fees/${row._id}`)} /></TabsContent>
        <TabsContent value="notifications"><EntityTable title="Notifications" button="Create Notification" onCreate={() => openCreate("notification")} rows={notifications} columns={["Title", "Audience", "School", "Status", "Created"]} render={(note) => [note.title, note.audience, note.schoolId?.name || "All schools", note.active ? "Active" : "Inactive", new Date(note.createdAt).toLocaleDateString()]} onEdit={(row) => openEdit("notification", row)} onDelete={(row) => deactivate(`/admin/notifications/${row._id}`)} /></TabsContent>

        <TabsContent value="attendance"><Card className="rounded-lg"><CardHeader><CardTitle>Attendance</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-3"><Field label="Class"><NativeSelect value={attendanceForm.classSectionId} onChange={(e) => setAttendanceForm({ ...attendanceForm, classSectionId: e.target.value, records: {} })}><option value="">Select class</option>{classes.map((klass) => <option key={klass._id} value={klass._id}>{klass.name}</option>)}</NativeSelect></Field><Field label="Date"><Input type="date" value={attendanceForm.date} onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })} /></Field><div className="flex items-end"><Button disabled={!attendanceForm.classSectionId || !selectedClassStudents.length} onClick={markAttendance}><CalendarCheck className="mr-2 h-4 w-4" />Save Attendance</Button></div></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{selectedClassStudents.map((student) => <div key={student._id} className="rounded-lg border p-3"><p className="font-medium">{student.fullName || student.username}</p><NativeSelect value={attendanceForm.records[student._id] || "present"} onChange={(e) => setAttendanceForm({ ...attendanceForm, records: { ...attendanceForm.records, [student._id]: e.target.value } })}>{["present", "absent", "late", "leave"].map((status) => <option key={status} value={status}>{status}</option>)}</NativeSelect></div>)}</div><EntityTable title="Recent Attendance" rows={attendance.slice(0, 20)} columns={["Student", "Class", "Date", "Status"]} render={(row) => [row.studentId?.fullName || row.studentId?.username || "-", row.classSectionId?.name || "-", new Date(row.date).toLocaleDateString(), row.status]} /></CardContent></Card></TabsContent>

        <TabsContent value="settings"><Card className="rounded-lg"><CardHeader><CardTitle>System Controls</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><InfoCard icon={Building2} label="Tenant Isolation" value="Schools keep separate teachers, classes, students, fees, attendance, and reports." /><InfoCard icon={ShieldCheck} label="Access Control" value="JWT role checks protect CEO, teacher, and student APIs." /><InfoCard icon={Bell} label="Live Refresh" value="CEO metrics and operational tables refresh every 15 seconds." /></CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={Boolean(dialog)} onOpenChange={(open) => !open && setDialog("")}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle className="capitalize">{editing ? "Edit" : "Create"} {dialog}</DialogTitle></DialogHeader>
          {dialog === "school" && <SchoolForm form={schoolForm} setForm={setSchoolForm} onSubmit={() => submit("school")} />}
          {dialog === "teacher" && <TeacherForm form={teacherForm} setForm={setTeacherForm} schools={schools} classes={classes} onSubmit={() => submit("teacher")} />}
          {dialog === "class" && <ClassForm form={classForm} setForm={setClassForm} schools={schools} teachers={teachers} courses={courses} onSubmit={() => submit("class")} />}
          {dialog === "student" && <StudentForm form={studentForm} setForm={setStudentForm} schools={schools} classes={classes} courses={courses} onSubmit={() => submit("student")} />}
          {dialog === "fee" && <FeeForm form={feeForm} setForm={setFeeForm} schools={schools} classes={classes} students={students} onSubmit={() => submit("fee")} />}
          {dialog === "notification" && <NotificationForm form={notificationForm} setForm={setNotificationForm} schools={schools} classes={classes} onSubmit={() => submit("notification")} />}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function EntityTable({ title, button, onCreate, rows, columns, render, onEdit, onDelete }: any) {
  const exportCsv = () => {
    const csv = [columns.join(","), ...rows.map((row: any) => render(row).map((cell: any) => `"${String(cell).replaceAll('"', '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${String(title).toLowerCase().replaceAll(" ", "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return <Card className="rounded-lg"><CardHeader className="flex-row items-center justify-between"><CardTitle>{title}</CardTitle><div className="flex gap-2"><Button variant="outline" onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>{button && <Button onClick={onCreate}><Plus className="mr-2 h-4 w-4" />{button}</Button>}</div></CardHeader><CardContent><Table><TableHeader><TableRow>{columns.map((col: string) => <TableHead key={col}>{col}</TableHead>)}{onEdit && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader><TableBody>{rows.map((row: any) => <TableRow key={row._id}>{render(row).map((cell: any, index: number) => <TableCell key={index}>{String(cell)}</TableCell>)}{onEdit && <TableCell><div className="flex justify-end gap-2"><Button size="icon" variant="outline" onClick={() => onEdit(row)}><Edit3 className="h-4 w-4" /></Button><Button size="icon" variant="destructive" onClick={() => onDelete(row)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>}</TableRow>)}</TableBody></Table>{!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">No records yet.</p>}</CardContent></Card>;
}

function MultiSelect({ values, options, onChange }: any) {
  return <div className="grid gap-2 rounded-md border p-2 md:grid-cols-2">{options.map((option: any) => { const id = option._id; return <label key={id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.includes(id)} onChange={(e) => onChange(e.target.checked ? [...values, id] : values.filter((value: string) => value !== id))} />{option.name || option.fullName || option.username}</label>; })}</div>;
}

function SchoolForm({ form, setForm, onSubmit }: any) {
  return <div className="grid gap-3 md:grid-cols-2"><Field label="School Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="School Code"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field><Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field><Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field><Field label="State"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field><Field label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field><Field label="Pincode"><Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></Field><Field label="Contact Number"><Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></Field><Field label="Alternate Number"><Input value={form.alternatePhone} onChange={(e) => setForm({ ...form, alternatePhone: e.target.value })} /></Field><Field label="Principal Name"><Input value={form.principalName} onChange={(e) => setForm({ ...form, principalName: e.target.value })} /></Field><Field label="Email"><Input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></Field><Field label="Logo URL"><Input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} /></Field><Field label="School Type"><NativeSelect value={form.schoolType} onChange={(e) => setForm({ ...form, schoolType: e.target.value })}>{["private", "public", "international", "charter", "training-center"].map((item) => <option key={item} value={item}>{item}</option>)}</NativeSelect></Field><Field label="Status"><NativeSelect value={String(form.active)} onChange={(e) => setForm({ ...form, active: e.target.value === "true" })}><option value="true">Active</option><option value="false">Inactive</option></NativeSelect></Field><Button className="md:col-span-2" disabled={!form.name} onClick={onSubmit}>Save School</Button></div>;
}

function TeacherForm({ form, setForm, schools, classes, onSubmit }: any) {
  return <div className="grid gap-3 md:grid-cols-2"><Field label="Full Name"><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field><UsernameField value={form.username} seed={form.fullName || form.email || "teacher"} onChange={(username) => setForm({ ...form, username })} /><Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><Field label="Phone Number"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field><Field label="Employee ID"><Input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} /></Field><Field label="Assigned School"><NativeSelect value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })}><option value="">Select school</option>{schools.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}</NativeSelect></Field><Field label="Subjects"><Input value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} placeholder="Python, Robotics" /></Field><Field label="Qualification"><Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} /></Field><Field label="Experience"><Input value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} /></Field><Field label="Joining Date"><Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></Field><Field label="Salary"><Input value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></Field><Field label="Profile Photo URL"><Input value={form.profilePhotoUrl} onChange={(e) => setForm({ ...form, profilePhotoUrl: e.target.value })} /></Field>
            <Field label="Permissions">
              <div className="grid gap-2 rounded-md border p-3">
                {teacherPermissionOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(option.value)}
                      onChange={(event) => {
                        const nextPermissions = event.target.checked
                          ? [...form.permissions, option.value]
                          : form.permissions.filter((value: string) => value !== option.value);
                        setForm({ ...form, permissions: nextPermissions });
                      }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </Field>
            <div className="md:col-span-2"><Field label="Assigned Classes"><MultiSelect values={form.classSectionIds} options={classes.filter((c: any) => !form.schoolId || String(c.schoolId?._id || c.schoolId) === form.schoolId)} onChange={(value: string[]) => setForm({ ...form, classSectionIds: value })} /></Field></div><Button className="md:col-span-2" disabled={!form.schoolId} onClick={onSubmit}>Save Teacher</Button></div>;
}

function ClassForm({ form, setForm, schools, teachers, courses, onSubmit }: any) {
  const students = form.students || [];
  const updateStudent = (index: number, patch: any) => setForm({ ...form, students: students.map((row: any, rowIndex: number) => rowIndex === index ? { ...row, ...patch } : row) });
  return <div className="grid gap-3 md:grid-cols-2"><Field label="School"><NativeSelect value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })}><option value="">Select school</option>{schools.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}</NativeSelect></Field><Field label="Class Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Grade 1 - A" /></Field><Field label="Grade"><Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></Field><Field label="Section"><Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} /></Field><Field label="Class Teacher"><NativeSelect value={form.classTeacherId} onChange={(e) => setForm({ ...form, classTeacherId: e.target.value })}><option value="">Select teacher</option>{teachers.map((t: any) => <option key={t._id} value={t._id}>{t.fullName || t.username}</option>)}</NativeSelect></Field><Field label="Capacity"><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></Field><Field label="Subjects"><Input value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} /></Field><Field label="Schedule"><Input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} /></Field><Field label="Coding Tracks"><Input value={form.codingTracks} onChange={(e) => setForm({ ...form, codingTracks: e.target.value })} /></Field><div className="md:col-span-2"><Field label="Teachers"><MultiSelect values={form.teacherIds} options={teachers.filter((t: any) => !form.schoolId || String(t.schoolId?._id || t.schoolId) === form.schoolId)} onChange={(value: string[]) => setForm({ ...form, teacherIds: value })} /></Field></div><div className="md:col-span-2"><Field label="Courses / Curriculum Tracks"><MultiSelect values={form.courseIds} options={courses.filter((c: any) => c.active)} onChange={(value: string[]) => setForm({ ...form, courseIds: value })} /></Field></div><div className="md:col-span-2 space-y-2"><div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Bulk Students</Label><Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, students: [...students, { fullName: "", rollNumber: String(students.length + 1).padStart(2, "0"), parentName: "", parentContact: "" }] })}>Add Another Student</Button></div>{students.map((student: any, index: number) => <div key={index} className="grid gap-2 rounded-lg border p-2 md:grid-cols-4"><Input placeholder="Student name" value={student.fullName || ""} onChange={(e) => updateStudent(index, { fullName: e.target.value })} /><Input placeholder="Roll" value={student.rollNumber || ""} onChange={(e) => updateStudent(index, { rollNumber: e.target.value })} /><Input placeholder="Parent" value={student.parentName || ""} onChange={(e) => updateStudent(index, { parentName: e.target.value })} /><Input placeholder="Parent phone" value={student.parentContact || ""} onChange={(e) => updateStudent(index, { parentContact: e.target.value })} /></div>)}<Textarea placeholder="CSV paste: Student Name, Roll Number, Parent Name, Parent Phone" onBlur={(e) => { const rows = e.target.value.split(/\r?\n/).map((line) => line.split(",").map((cell) => cell.trim())).filter((cols) => cols[0]); if (rows.length) setForm({ ...form, students: rows.map((cols, index) => ({ fullName: cols[0], rollNumber: cols[1] || String(index + 1).padStart(2, "0"), parentName: cols[2] || "", parentContact: cols[3] || "" })) }); }} /></div><Button className="md:col-span-2" disabled={!form.schoolId || !form.name} onClick={onSubmit}>Save Class</Button></div>;
}

function StudentForm({ form, setForm, schools, classes, courses, onSubmit }: any) {
  return <div className="grid gap-3 md:grid-cols-2"><Field label="Full Name"><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field><UsernameField value={form.username} seed={form.fullName || form.studentId || "student"} onChange={(username) => setForm({ ...form, username })} /><Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><Field label="Student ID"><Input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} /></Field><Field label="Roll Number"><Input value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} /></Field><Field label="Parent Name"><Input value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} /></Field><Field label="Parent Contact"><Input value={form.parentContact} onChange={(e) => setForm({ ...form, parentContact: e.target.value })} /></Field><Field label="Assigned School"><NativeSelect value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })}><option value="">Select school</option>{schools.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}</NativeSelect></Field><Field label="Grade"><Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></Field><Field label="Fee Structure"><Input value={form.feeStructure} onChange={(e) => setForm({ ...form, feeStructure: e.target.value })} /></Field><Field label="Profile Photo URL"><Input value={form.profilePhotoUrl} onChange={(e) => setForm({ ...form, profilePhotoUrl: e.target.value })} /></Field><div className="md:col-span-2"><Field label="Assigned Classes"><MultiSelect values={form.classSectionIds} options={classes.filter((c: any) => !form.schoolId || String(c.schoolId?._id || c.schoolId) === form.schoolId)} onChange={(value: string[]) => setForm({ ...form, classSectionIds: value })} /></Field></div><div className="md:col-span-2"><Field label="Course Access"><MultiSelect values={form.assignedCourses} options={courses.filter((c: any) => c.active)} onChange={(value: string[]) => setForm({ ...form, assignedCourses: value })} /></Field></div><Button className="md:col-span-2" disabled={!form.schoolId} onClick={onSubmit}>Save Student</Button></div>;
}

function FeeForm({ form, setForm, schools, classes, students, onSubmit }: any) {
  return <div className="grid gap-3 md:grid-cols-2"><Field label="School"><NativeSelect value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })}><option value="">Select school</option>{schools.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}</NativeSelect></Field><Field label="Class"><NativeSelect value={form.classSectionId} onChange={(e) => setForm({ ...form, classSectionId: e.target.value })}><option value="">Select class</option>{classes.filter((c: any) => !form.schoolId || String(c.schoolId?._id || c.schoolId) === form.schoolId).map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}</NativeSelect></Field><Field label="Student"><NativeSelect value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}><option value="">Select student</option>{students.filter((s: any) => !form.schoolId || String(s.schoolId?._id || s.schoolId) === form.schoolId).map((s: any) => <option key={s._id} value={s._id}>{s.fullName || s.username}</option>)}</NativeSelect></Field><Field label="Total Fees"><Input type="number" value={form.totalFees} onChange={(e) => setForm({ ...form, totalFees: e.target.value })} /></Field><Field label="Paid Amount"><Input type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} /></Field><Field label="Due Date"><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field><div className="md:col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div><Button className="md:col-span-2" disabled={!form.schoolId || !form.studentId} onClick={onSubmit}>Save Fee</Button></div>;
}

function NotificationForm({ form, setForm, schools, classes, onSubmit }: any) {
  return <div className="grid gap-3 md:grid-cols-2"><Field label="Audience"><NativeSelect value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>{["all", "teachers", "students", "parents", "class"].map((item) => <option key={item} value={item}>{item}</option>)}</NativeSelect></Field><Field label="School"><NativeSelect value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })}><option value="">All schools</option>{schools.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}</NativeSelect></Field><Field label="Class"><NativeSelect value={form.classSectionId} onChange={(e) => setForm({ ...form, classSectionId: e.target.value })}><option value="">All classes</option>{classes.filter((c: any) => !form.schoolId || String(c.schoolId?._id || c.schoolId) === form.schoolId).map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}</NativeSelect></Field><Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><div className="md:col-span-2"><Field label="Message"><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field></div><Button className="md:col-span-2" disabled={!form.title || !form.body} onClick={onSubmit}>Publish Notification</Button></div>;
}

function InfoCard({ icon: Icon, label, value }: any) {
  return <div className="rounded-lg border p-4"><Icon className="mb-3 h-5 w-5 text-blue-600" /><p className="font-semibold">{label}</p><p className="mt-1 text-sm text-muted-foreground">{value}</p></div>;
}
