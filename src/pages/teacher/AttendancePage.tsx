import { useEffect, useMemo, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/api/client";
import { teacherApi } from "@/services/teacherApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function AttendancePage() {
  const { token } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Mark attendance state
  const [showMarkDialog, setShowMarkDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<Record<string, string>>({});
  const [marking, setMarking] = useState(false);

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
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Load students when selected class changes in the dialog
  useEffect(() => {
    if (!selectedClass || !showMarkDialog) {
      setClassStudents([]);
      setStudentStatuses({});
      return;
    }

    const loadStudents = async () => {
      try {
        const students = await apiFetch(`/teacher/classes/${selectedClass}/students`, {}, token);
        setClassStudents(students || []);
        
        // Initialize all students with present status
        const statuses: Record<string, string> = {};
        (students || []).forEach((student: any) => {
          statuses[student._id] = "present";
        });
        setStudentStatuses(statuses);
      } catch (error) {
        console.error("Failed to load students:", error);
        setClassStudents([]);
        setStudentStatuses({});
      }
    };

    loadStudents();
  }, [selectedClass, showMarkDialog, token]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (classFilter && record.classSectionId?._id !== classFilter) return false;
      if (statusFilter && record.status !== statusFilter) return false;
      if (dateFrom && new Date(record.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(record.date) > new Date(dateTo)) return false;
      return true;
    });
  }, [records, classFilter, statusFilter, dateFrom, dateTo]);

  const handleSaveAttendance = async () => {
    if (!selectedClass || !attendanceDate) {
      alert("Please select a class and date");
      return;
    }

    const attendanceRecords = Object.entries(studentStatuses).map(([studentId, status]) => ({
      studentId,
      status,
      remarks: ""
    }));

    if (!attendanceRecords.length) {
      alert("No students to mark");
      return;
    }

    setMarking(true);
    try {
      await apiFetch("/teacher/attendance", {
        method: "POST",
        body: JSON.stringify({
          classSectionId: selectedClass,
          date: attendanceDate,
          records: attendanceRecords
        })
      }, token);

      alert("Attendance marked successfully!");
      setShowMarkDialog(false);
      setSelectedClass("");
      setStudentStatuses({});
      
      // Refresh attendance records
      const updatedRecords = await teacherApi.attendance({}, token);
      setRecords(updatedRecords || []);
    } catch (error) {
      alert("Failed to save attendance: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setMarking(false);
    }
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setStudentStatuses({
      ...studentStatuses,
      [studentId]: status
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Attendance control</p>
            <h2 className="mt-2 text-3xl font-semibold">Attendance reports</h2>
            <p className="mt-1 text-sm text-slate-500">Class/date filters are scoped to attendance only and do not persist across modules.</p>
          </div>
          <Button onClick={() => setShowMarkDialog(true)}><CalendarCheck className="mr-2 h-4 w-4" />Mark attendance</Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
            <option value="">All classes</option>
            {classes.map((klass) => (
              <option key={klass._id} value={klass._id}>{klass.name}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
            <option value="">All statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </select>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Total records</CardTitle></CardHeader>
          <CardContent>{filteredRecords.length}</CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Classes tracked</CardTitle></CardHeader>
          <CardContent>{new Set(filteredRecords.map((record) => record.classSectionId?._id)).size}</CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Absent count</CardTitle></CardHeader>
          <CardContent>{filteredRecords.filter((record) => record.status === "absent").length}</CardContent>
        </Card>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading attendance history…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={`${record._id}-${record.date}`}>
                  <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell>{record.studentId?.fullName || record.studentId?.username || "Unknown"}</TableCell>
                  <TableCell>{record.classSectionId?.name || "—"}</TableCell>
                  <TableCell><Badge variant={record.status === "present" ? "default" : "secondary"}>{record.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Mark Attendance Dialog */}
      <Dialog open={showMarkDialog} onOpenChange={setShowMarkDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                >
                  <option value="">Select a class...</option>
                  {classes.map((klass) => (
                    <option key={klass._id} value={klass._id}>{klass.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <Input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                />
              </div>
            </div>

            {selectedClass && (
              <div>
                {classStudents.length > 0 ? (
                  <>
                    <label className="block text-sm font-medium mb-3">Student Attendance</label>
                    <div className="space-y-2 max-h-96 overflow-y-auto border border-slate-200 rounded-xl p-4 dark:border-slate-800">
                      {classStudents.map((student) => (
                        <div key={student._id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                          <div>
                            <p className="font-medium text-sm">{student.fullName || student.username}</p>
                            <p className="text-xs text-slate-500">{student.studentId || student.rollNumber || "N/A"}</p>
                          </div>
                          <select
                            value={studentStatuses[student._id] || "present"}
                            onChange={(e) => handleStatusChange(student._id, e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
                          >
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    Loading students...
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSaveAttendance}
              disabled={!selectedClass || classStudents.length === 0 || marking}
            >
              {marking ? "Saving..." : "Save Attendance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
