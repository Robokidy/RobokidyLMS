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

const emptyForm = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  studentId: "",
  rollNumber: "",
  parentName: "",
  parentContact: "",
  grade: "",
  feeStructure: "",
  profilePhotoUrl: "",
  active: true,
  classSectionIds: [] as string[]
};

export default function StudentsPage() {
  const { token } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([teacherApi.students(token), teacherApi.classes(token)])
      .then(([studentRows, classRows]) => {
        setStudents(studentRows || []);
        setClasses(classRows || []);
      })
      .catch(() => {
        setStudents([]);
        setClasses([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const query = debouncedSearch.toLowerCase();
      const matchesSearch = [student.fullName, student.username, student.email, student.studentId, student.parentName].some((value) => String(value || "").toLowerCase().includes(query));
      const statusMatch = statusFilter === "all" || (statusFilter === "active" ? student.active : !student.active);
      return matchesSearch && statusMatch;
    });
  }, [students, debouncedSearch, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (student: any) => {
    setEditing(student);
    setForm({
      ...emptyForm,
      ...student,
      classSectionIds: (student.classSectionIds || []).map((klass: any) => String(klass._id || klass))
    });
    setDialogOpen(true);
  };

  const saveStudent = async () => {
    try {
      const payload = { ...form, active: Boolean(form.active) };
      if (editing) {
        await teacherApi.updateStudent(editing._id, payload, token);
      } else {
        await teacherApi.createStudent(payload, token);
      }
      setDialogOpen(false);
      const refreshed = await teacherApi.students(token);
      setStudents(refreshed || []);
    } catch {
      // ignore for now
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Students management</p>
            <h2 className="mt-2 text-3xl font-semibold">Student directory</h2>
            <p className="mt-1 text-sm text-slate-500">Each student workspace has independent search, filters and record state.</p>
          </div>
          <Button onClick={openCreate}>Add student</Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-emerald-500 dark:focus:ring-emerald-800">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Classes: {classes.length}</div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading students…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student._id}>
                  <TableCell>
                    <div className="font-medium">{student.fullName || student.username}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{student.studentId || student.email}</div>
                  </TableCell>
                  <TableCell>{(student.classSectionIds || []).map((klass: any) => klass.name || klass).join(", ") || "—"}</TableCell>
                  <TableCell>{student.email || "—"}</TableCell>
                  <TableCell><Badge variant={student.active ? "default" : "secondary"}>{student.active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(student)}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!loading && !filteredStudents.length && (
          <div className="py-10 text-center text-sm text-slate-500">No student records match the current filters.</div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Student" : "Add a new student"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
            <div>
              <Label>Student ID</Label>
              <Input value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })} />
            </div>
            <div>
              <Label>Class</Label>
              <select value={form.classSectionIds[0] || ""} onChange={(event) => setForm({ ...form, classSectionIds: event.target.value ? [event.target.value] : [] })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                <option value="">Select a class</option>
                {classes.map((klass) => (
                  <option key={klass._id} value={klass._id}>{klass.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.feeStructure} onChange={(event) => setForm({ ...form, feeStructure: event.target.value })} />
            </div>
            <Button className="md:col-span-2" onClick={saveStudent}>{editing ? "Save changes" : "Create student"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
