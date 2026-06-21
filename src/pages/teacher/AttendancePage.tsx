import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/api/client";
import { teacherApi } from "@/services/teacherApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const statuses = ["present", "absent", "late", "excused"];

function dateOnly(value: any) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function studentName(student: any) {
  return student?.fullName || student?.username || "Student";
}

function flattenAttendance(records: any[]) {
  return records.flatMap((record) => {
    if (record.recordType === "class-day") {
      return (record.students || []).map((entry: any) => ({
        _id: `${record._id}-${entry.studentId?._id || entry.studentId}`,
        date: record.date,
        classSectionId: record.classSectionId,
        studentId: entry.studentId,
        status: entry.status,
        note: entry.note,
        markedBy: record.teacherId || record.markedBy,
        markedAt: record.markedAt
      }));
    }
    return [record];
  });
}

export default function AttendancePage() {
  const { token } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [showMarkDialog, setShowMarkDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [message, setMessage] = useState("");

  const refreshAttendance = async () => {
    const attendanceRows = await teacherApi.attendance({}, token);
    setRecords(attendanceRows || []);
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([teacherApi.attendance({}, token), teacherApi.classes(token)])
      .then(([attendanceRows, classRows]) => {
        setRecords(attendanceRows || []);
        setClasses(classRows || []);
      })
      .catch(() => {
        setRecords([]);
        setClasses([]);
        setMessage("We could not load attendance yet. Please try again in a moment.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!selectedClass || !showMarkDialog) {
      setClassStudents([]);
      setStudentStatuses({});
      return;
    }

    const loadStudentsAndRecord = async () => {
      setStudentsLoading(true);
      setMessage("");
      try {
        const [students, existingRows] = await Promise.all([
          apiFetch(`/teacher/classes/${selectedClass}/students`, {}, token),
          teacherApi.attendance({ classSectionId: selectedClass, date: attendanceDate }, token)
        ]);
        const roster = students || [];
        const existing = (existingRows || []).find((row: any) => row.recordType === "class-day") || existingRows?.[0];
        const savedStatuses = new Map((existing?.students || []).map((entry: any) => [String(entry.studentId?._id || entry.studentId), entry.status]));
        const statusesByStudent: Record<string, string> = {};
        roster.forEach((student: any) => {
          statusesByStudent[student._id] = String(savedStatuses.get(String(student._id)) || "present");
        });
        setClassStudents(roster);
        setStudentStatuses(statusesByStudent);
        if (existing) setMessage("Saved attendance loaded. You can update it and save again.");
      } catch {
        setClassStudents([]);
        setStudentStatuses({});
        setMessage("We could not load the class list. Please try again.");
      } finally {
        setStudentsLoading(false);
      }
    };

    loadStudentsAndRecord();
  }, [selectedClass, attendanceDate, showMarkDialog, token]);

  const flatRecords = useMemo(() => flattenAttendance(records), [records]);
  const filteredRecords = useMemo(() => {
    return flatRecords.filter((record) => {
      if (classFilter && String(record.classSectionId?._id || record.classSectionId) !== classFilter) return false;
      if (statusFilter && record.status !== statusFilter) return false;
      const recordDate = dateOnly(record.date);
      if (dateFrom && recordDate < dateFrom) return false;
      if (dateTo && recordDate > dateTo) return false;
      return true;
    });
  }, [flatRecords, classFilter, statusFilter, dateFrom, dateTo]);

  const visibleStudents = useMemo(() => {
    const query = search.toLowerCase();
    return classStudents.filter((student) => `${studentName(student)} ${student.rollNumber || ""} ${student.studentId || ""}`.toLowerCase().includes(query));
  }, [classStudents, search]);

  const presentCount = filteredRecords.filter((record) => ["present", "late"].includes(record.status)).length;
  const absentCount = filteredRecords.filter((record) => record.status === "absent").length;
  const attendancePercent = filteredRecords.length ? Math.round((presentCount / filteredRecords.length) * 100) : 0;

  const handleSaveAttendance = async () => {
    if (!selectedClass || !attendanceDate) {
      setMessage("Choose a class and date first.");
      return;
    }
    const students = classStudents.map((student) => ({ studentId: student._id, status: studentStatuses[student._id] || "present" }));
    if (!students.length) {
      setMessage("This class has no students yet.");
      return;
    }

    setMarking(true);
    setMessage("");
    try {
      await apiFetch("/teacher/attendance", { method: "POST", body: { classSectionId: selectedClass, date: attendanceDate, students } }, token);
      await refreshAttendance();
      toast.success("Attendance saved", { description: "The class record is updated for this date." });
      setMessage("Attendance saved. The history below is updated.");
      setShowMarkDialog(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Attendance could not be saved. Your marks are still here.");
    } finally {
      setMarking(false);
    }
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setStudentStatuses((current) => ({ ...current, [studentId]: status }));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Attendance</p>
            <h2 className="mt-2 text-3xl font-semibold">Class attendance</h2>
            <p className="mt-1 text-sm text-slate-500">Select your class and date, then mark each student below.</p>
          </div>
          <Button onClick={() => setShowMarkDialog(true)}><CalendarCheck className="mr-2 h-4 w-4" />Mark attendance</Button>
        </div>
        {message && <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
            <option value="">All classes</option>
            {classes.map((klass) => <option key={klass._id} value={klass._id}>{klass.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
            <option value="">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl"><CardHeader><CardTitle>Attendance %</CardTitle></CardHeader><CardContent>{attendancePercent}%</CardContent></Card>
        <Card className="rounded-3xl"><CardHeader><CardTitle>Marked students</CardTitle></CardHeader><CardContent>{filteredRecords.length}</CardContent></Card>
        <Card className="rounded-3xl"><CardHeader><CardTitle>Absent students</CardTitle></CardHeader><CardContent>{absentCount}</CardContent></Card>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        {loading ? <div className="py-10 text-center text-slate-500">Loading attendance history...</div> : filteredRecords.length ? (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Status</TableHead><TableHead>Marked by</TableHead></TableRow></TableHeader>
            <TableBody>{filteredRecords.map((record) => <TableRow key={`${record._id}-${record.date}`}><TableCell>{new Date(record.date).toLocaleDateString()}</TableCell><TableCell>{studentName(record.studentId)}</TableCell><TableCell>{record.classSectionId?.name || "-"}</TableCell><TableCell><Badge variant={record.status === "present" ? "default" : "secondary"}>{record.status}</Badge></TableCell><TableCell>{record.markedBy?.fullName || record.markedBy?.username || "-"}</TableCell></TableRow>)}</TableBody>
          </Table>
        ) : <div className="py-10 text-center text-sm text-slate-500">No attendance recorded for this filter yet.</div>}
      </section>

      <Dialog open={showMarkDialog} onOpenChange={setShowMarkDialog}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>Mark attendance</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">Class<select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"><option value="">Select a class</option>{classes.map((klass) => <option key={klass._id} value={klass._id}>{klass.name}</option>)}</select></label>
              <label className="grid gap-2 text-sm font-medium">Date<Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} /></label>
            </div>
            {selectedClass && classStudents.length > 15 && <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students" /></div>}
            {selectedClass && (studentsLoading ? <div className="py-8 text-center text-slate-500">Loading students...</div> : classStudents.length ? <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">{visibleStudents.map((student) => <div key={student._id} className="flex flex-col gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-sm">{studentName(student)}</p><p className="text-xs text-slate-500">{student.rollNumber || student.studentId || "No roll number"}</p></div><div className="flex flex-wrap gap-2">{statuses.map((status) => <Button key={status} type="button" size="sm" variant={(studentStatuses[student._id] || "present") === status ? "default" : "outline"} onClick={() => handleStatusChange(student._id, status)} className="capitalize">{status}</Button>)}</div></div>)}</div> : <div className="py-8 text-center text-sm text-slate-500">No students are assigned to this class yet.</div>)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveAttendance} disabled={!selectedClass || !classStudents.length || marking}>{marking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{marking ? "Saving..." : "Save attendance"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
