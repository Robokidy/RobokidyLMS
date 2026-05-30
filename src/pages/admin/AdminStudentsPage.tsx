import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, KeyRound, Plus, Search, Trash2 } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import AdminShell from "@/components/layout/AdminShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Course } from "@/types";

type Student = {
  _id: string;
  username: string;
  active: boolean;
  progress: {
    completedLessons: string[];
    quizAttempts: Array<{ bestScore: number; attempts: number }>;
    codeRunCount: number;
  };
  assignedCourses: Course[];
};

const PAGE_SIZE = 8;

export default function AdminStudentsPage() {
  const { token } = useAuth();
  const [username, setUsername] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [temp, setTemp] = useState("");
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"username" | "progress" | "codeRunCount">("username");
  const [removingStudent, setRemovingStudent] = useState<Student | null>(null);
  const [actionStudentId, setActionStudentId] = useState("");

  const load = () => apiFetch("/admin/students", {}, token).then(setStudents);
  useEffect(() => {
    load();
    apiFetch("/admin/courses", {}, token).then(setCourses);
  }, [token]);

  const create = async () => {
    const res = await apiFetch("/admin/students", { method: "POST", body: JSON.stringify({ username, assignedCourses: selectedCourses }) }, token);
    setTemp(`${res.username} temporary password: ${res.tempPassword}`);
    setUsername("");
    setSelectedCourses([]);
    setOpen(false);
    load();
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses((prev) => prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]);
  };

  const resetPassword = async (student: Student) => {
    setActionStudentId(student._id);
    try {
      const res = await apiFetch(`/admin/students/${student._id}/reset-password`, { method: "POST" }, token);
      setTemp(`${res.username} temporary password: ${res.tempPassword}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to reset password");
    } finally {
      setActionStudentId("");
    }
  };



  const removeStudent = async () => {
    if (!removingStudent) return;

    setActionStudentId(removingStudent._id);
    try {
      await apiFetch(`/admin/students/${removingStudent._id}`, { method: "DELETE" }, token);
      setTemp(`${removingStudent.username} removed from student accounts.`);
      setRemovingStudent(null);
      load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to remove student");
    } finally {
      setActionStudentId("");
    }
  };

  const tableData = useMemo(() => {
    const normalized = students
      .filter((s) => s.username.toLowerCase().includes(search.toLowerCase()))
      .map((s) => {
        const avgQuiz = s.progress.quizAttempts.length
          ? Math.round(s.progress.quizAttempts.reduce((a, q) => a + q.bestScore, 0) / s.progress.quizAttempts.length)
          : 0;
        return {
          ...s,
          progressPct: Math.min(100, s.progress.completedLessons.length * 12.5),
          avgQuiz
        };
      });

    normalized.sort((a, b) => {
      if (sortBy === "username") return a.username.localeCompare(b.username);
      if (sortBy === "progress") return b.progressPct - a.progressPct;
      return b.progress.codeRunCount - a.progress.codeRunCount;
    });

    return normalized;
  }, [students, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(tableData.length / PAGE_SIZE));
  const paged = tableData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AdminShell title="Student Management" subtitle="Create student accounts and monitor learning activity">
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Card className="rounded-2xl"><CardHeader><CardTitle className="text-sm text-muted-foreground">Students</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{students.length}</CardContent></Card>
        <Card className="rounded-2xl"><CardHeader><CardTitle className="text-sm text-muted-foreground">Active Students</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{students.filter((s) => s.active).length}</CardContent></Card>
        <Card className="rounded-2xl"><CardHeader><CardTitle className="text-sm text-muted-foreground">Need Attention</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{tableData.filter((s) => s.avgQuiz < 60).length}</CardContent></Card>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Students Table</CardTitle>
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search student" className="pl-9 w-full md:w-64" />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-1" />Create Student</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Student Account</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Student username" />
                  <div className="rounded-xl border p-3 space-y-2">
                    <p className="text-sm font-medium">Assign Courses</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {courses.filter((course) => course.active).map((course) => (
                        <label key={course._id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                          <Checkbox checked={selectedCourses.includes(course._id)} onCheckedChange={() => toggleCourse(course._id)} />
                          <span>{course.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full" onClick={create} disabled={!username.trim() || !selectedCourses.length}>Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {temp && <div className="mb-3 p-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-sm">{temp}</div>}

          <div className="flex gap-2 mb-3">
            <Button variant="outline" size="sm" onClick={() => setSortBy("username")}>Name <ArrowUpDown className="h-3 w-3 ml-1" /></Button>
            <Button variant="outline" size="sm" onClick={() => setSortBy("progress")}>Progress <ArrowUpDown className="h-3 w-3 ml-1" /></Button>
            <Button variant="outline" size="sm" onClick={() => setSortBy("codeRunCount")}>Code Runs <ArrowUpDown className="h-3 w-3 ml-1" /></Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead>Lessons</TableHead>
                <TableHead>Quiz Performance</TableHead>
                <TableHead>Code Runs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="font-medium">{s.username}</TableCell>
                  <TableCell>{s.active ? <Badge className="bg-emerald-100 text-emerald-700">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {s.assignedCourses?.length ? s.assignedCourses.map((course) => (
                        <Badge key={course._id} variant="outline">{course.name}</Badge>
                      )) : <Badge variant="secondary">No courses</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm mb-1">{s.progress.completedLessons.length} completed</p>
                    <Progress value={s.progressPct} className="h-2" />
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">Avg best score: {s.avgQuiz}%</p>
                    <Badge variant={s.avgQuiz < 60 ? "destructive" : "secondary"}>{s.avgQuiz < 60 ? "Low Performance" : "On Track"}</Badge>
                  </TableCell>
                  <TableCell>{s.progress.codeRunCount}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetPassword(s)}
                        disabled={actionStudentId === s._id}
                        title={`Reset password for ${s.username}`}
                      >
                        <KeyRound className="h-4 w-4" />
                        <span className="sr-only">Reset password</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setRemovingStudent(s)}
                        disabled={actionStudentId === s._id}
                        title={`Remove ${s.username}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove student</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(removingStudent)} onOpenChange={(isOpen) => !isOpen && setRemovingStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {removingStudent?.username} and their saved progress. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={removeStudent}
            >
              Remove Student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
