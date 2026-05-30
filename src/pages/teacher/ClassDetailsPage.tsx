import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Activity, BarChart3, BookOpen, CalendarCheck, ClipboardList, Code, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { teacherApi } from "@/services/teacherApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ClassDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [klass, setKlass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("students");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    Promise.all([teacherApi.classes(token), teacherApi.students(token)]).then(([classes, studentsData]) => {
      const selected = classes.find((item: any) => item._id === id);
      setKlass(selected);
      setStudents((studentsData || []).filter((student: any) => (student.classSectionIds || []).some((klassRef: any) => String(klassRef._id || klassRef) === id)));
      return selected;
    }).then((selectedClass) => {
      const classGrade = selectedClass?.grade;
      return Promise.all([
        teacherApi.assignments({ classSectionId: id }, token),
        teacherApi.attendance({ classSectionId: id }, token),
        teacherApi.materials({ grade: classGrade }, token)
      ]);
    }).then(([assignmentRows, attendanceRows, materialRows]) => {
      setAssignments(assignmentRows || []);
      setAttendance(attendanceRows || []);
      setMaterials(materialRows || []);
    }).catch(() => {
      setStudents([]);
      setAssignments([]);
      setAttendance([]);
      setMaterials([]);
    }).finally(() => setLoading(false));
  }, [token, id]);

  const summary = useMemo(() => ({
    students: students.length,
    assignments: assignments.length,
    materials: materials.length,
    attendanceEntries: attendance.length
  }), [students.length, assignments.length, materials.length, attendance.length]);

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">Loading class details…</div>;
  }

  if (!klass) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">Class not found or you do not have access to this class.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Class details</p>
            <h2 className="mt-2 text-3xl font-semibold">{klass.name}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Grade {klass.grade} • Section {klass.section} • {klass.subjects?.join(", ") || "No subject assigned"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{klass.active ? "Active" : "Inactive"}</Badge>
            <Button variant="outline" onClick={() => navigate("/teacher/classes")}>Back to classes</Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-4">
          <Card className="rounded-3xl">
            <CardHeader className="flex items-center justify-between gap-2"><CardTitle>Students</CardTitle><Users className="h-4 w-4" /></CardHeader>
            <CardContent>{summary.students}</CardContent>
          </Card>
          <Card className="rounded-3xl">
            <CardHeader className="flex items-center justify-between gap-2"><CardTitle>Attendance</CardTitle><CalendarCheck className="h-4 w-4" /></CardHeader>
            <CardContent>{summary.attendanceEntries}</CardContent>
          </Card>
          <Card className="rounded-3xl">
            <CardHeader className="flex items-center justify-between gap-2"><CardTitle>Assignments</CardTitle><ClipboardList className="h-4 w-4" /></CardHeader>
            <CardContent>{summary.assignments}</CardContent>
          </Card>
          <Card className="rounded-3xl">
            <CardHeader className="flex items-center justify-between gap-2"><CardTitle>Materials</CardTitle><BookOpen className="h-4 w-4" /></CardHeader>
            <CardContent>{summary.materials}</CardContent>
          </Card>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 gap-2 md:grid-cols-6">
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="coding">Coding</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="students" className="mt-4">
            <div className="space-y-4">
              {students.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Roll</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student._id}>
                        <TableCell>{student.fullName || student.username}</TableCell>
                        <TableCell>{student.rollNumber || "—"}</TableCell>
                        <TableCell><Badge variant={student.active ? "default" : "secondary"}>{student.active ? "Active" : "Inactive"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-slate-500">No students are currently assigned to this class.</p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="attendance" className="mt-4">
            <div className="space-y-4">
              {attendance.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow key={`${record._id}-${record.date}`}>
                        <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                        <TableCell>{record.studentId?.fullName || record.studentId?.username || "Unknown"}</TableCell>
                        <TableCell><Badge variant={record.status === "present" ? "default" : "secondary"}>{record.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-slate-500">No attendance records available for this class.</p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="assignments" className="mt-4">
            <div className="space-y-4">
              {assignments.length ? (
                assignments.map((item) => (
                  <Card key={item._id} className="rounded-3xl">
                    <CardHeader>
                      <CardTitle>{item.title}</CardTitle>
                      <div className="text-sm text-slate-500">Due {new Date(item.dueDate).toLocaleDateString()}</div>
                    </CardHeader>
                    <CardContent>{item.description || "No description provided."}</CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-slate-500">No assignments have been published for this class yet.</p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="materials" className="mt-4">
            <div className="space-y-4">
              {materials.length ? (
                materials.map((item) => (
                  <Card key={item._id} className="rounded-3xl">
                    <CardHeader>
                      <CardTitle>{item.title || item.name || "Untitled material"}</CardTitle>
                      <Badge>{item.type || item.category || "Resource"}</Badge>
                    </CardHeader>
                    <CardContent>{item.description || item.courseId?.name || "Material available for class."}</CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-slate-500">No materials match the class query.</p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="coding" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="rounded-3xl">
                <CardHeader className="flex items-center justify-between gap-2"><CardTitle>Track metrics</CardTitle><Code className="h-4 w-4" /></CardHeader>
                <CardContent>{(klass.courseTrackIds || []).map((track: any) => <div key={track._id} className="mb-2 last:mb-0"><p className="font-semibold">{track.trackName || track.trackCode}</p><p className="text-sm text-slate-500">Grade {track.grade || "—"}</p></div>)}</CardContent>
              </Card>
              <Card className="rounded-3xl">
                <CardHeader className="flex items-center justify-between gap-2"><CardTitle>Recent student activity</CardTitle><Activity className="h-4 w-4" /></CardHeader>
                <CardContent>{students.slice(0, 5).map((student) => <div key={student._id} className="mb-3 last:mb-0"><div className="font-semibold">{student.fullName || student.username}</div><div className="text-sm text-slate-500">{student.progress?.codeRunCount ?? 0} code runs</div></div>)}</CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="analytics" className="mt-4">
            <Card className="rounded-3xl">
              <CardHeader className="flex items-center justify-between gap-2"><CardTitle>Class performance</CardTitle><BarChart3 className="h-4 w-4" /></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">Review student completion, assignment history and participation in the same class.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
