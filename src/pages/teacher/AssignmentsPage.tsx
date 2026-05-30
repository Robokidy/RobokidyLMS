import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { teacherApi } from "@/services/teacherApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const emptyAssignment = {
  title: "",
  description: "",
  classSectionId: "",
  courseId: "",
  dueDate: "",
  maxMarks: 100
};

export default function AssignmentsPage() {
  const { token } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyAssignment);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([teacherApi.assignments({}, token), teacherApi.classes(token), teacherApi.courses(token)])
      .then(([assignmentRows, classRows, courseRows]) => {
        setAssignments(assignmentRows || []);
        setClasses(classRows || []);
        setCourses(courseRows || []);
      })
      .catch(() => {
        setAssignments([]);
        setClasses([]);
        setCourses([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const query = debouncedSearch.toLowerCase();
      const matchSearch = [assignment.title, assignment.description, assignment.classSectionId?.name, assignment.courseId?.name].some((value) => String(value || "").toLowerCase().includes(query));
      if (!matchSearch) return false;
      if (!statusFilter) return true;
      if (statusFilter === "open") return new Date(assignment.dueDate) >= new Date();
      return new Date(assignment.dueDate) < new Date();
    });
  }, [assignments, debouncedSearch, statusFilter]);

  const createAssignment = async () => {
    try {
      await teacherApi.createAssignment(form, token);
      setDialogOpen(false);
      const refreshed = await teacherApi.assignments({}, token);
      setAssignments(refreshed || []);
    } catch {
      // ignore for now
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Assignments center</p>
            <h2 className="mt-2 text-3xl font-semibold">Manage assignments</h2>
            <p className="mt-1 text-sm text-slate-500">Assignment workflow is isolated from other teacher modules.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>New assignment</Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Input placeholder="Search assignments" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
            <option value="">Any due date</option>
            <option value="open">Open</option>
            <option value="past">Past due</option>
          </select>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Classes: {classes.length}</div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading assignments…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((assignment) => (
                <TableRow key={assignment._id}>
                  <TableCell>{assignment.title}</TableCell>
                  <TableCell>{assignment.classSectionId?.name || "—"}</TableCell>
                  <TableCell>{new Date(assignment.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell><Badge variant={new Date(assignment.dueDate) >= new Date() ? "default" : "secondary"}>{new Date(assignment.dueDate) >= new Date() ? "Open" : "Past due"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create assignment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
            </div>
            <div>
              <Label>Class</Label>
              <select value={form.classSectionId} onChange={(event) => setForm({ ...form, classSectionId: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                <option value="">Select a class</option>
                {classes.map((klass) => <option key={klass._id} value={klass._id}>{klass.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Course</Label>
              <select value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                <option value="">Scan all courses</option>
                {courses.map((course) => <option key={course._id} value={course._id}>{course.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Max marks</Label>
              <Input type="number" value={form.maxMarks} onChange={(event) => setForm({ ...form, maxMarks: Number(event.target.value) })} />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </div>
            <Button className="md:col-span-2" onClick={createAssignment}>Save assignment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
