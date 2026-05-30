import { useEffect, useMemo, useState } from "react";
import { GripVertical, Lock, Plus, Save, Search, Sparkles } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import AdminShell from "@/components/layout/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Course } from "@/types";
import { adminCapabilityMap, learningTracks } from "@/data/stemEcosystem";

type Student = {
  _id: string;
  username: string;
  active: boolean;
  assignedCourses: Course[];
};

export default function AdminCoursesPage() {
  const { token } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string[]>>({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [savingStudentId, setSavingStudentId] = useState("");

  const load = async () => {
    const [courseData, studentData] = await Promise.all([
      apiFetch("/admin/courses", {}, token),
      apiFetch("/admin/students", {}, token)
    ]);

    setCourses(courseData);
    setStudents(studentData);
    setDraftAssignments(Object.fromEntries(
      studentData.map((student: Student) => [student._id, (student.assignedCourses || []).map((course) => course._id)])
    ));
  };

  useEffect(() => { load(); }, [token]);

  const activeCourses = courses.filter((course) => course.active);

  const filteredStudents = useMemo(
    () => students.filter((student) => student.username.toLowerCase().includes(search.toLowerCase())),
    [students, search]
  );

  const createCourse = async () => {
    await apiFetch("/admin/courses", { method: "POST", body: JSON.stringify({ name, description }) }, token);
    setName("");
    setDescription("");
    load();
  };

  const toggleAssignment = (studentId: string, courseId: string) => {
    setDraftAssignments((prev) => {
      const current = prev[studentId] || [];
      return {
        ...prev,
        [studentId]: current.includes(courseId) ? current.filter((id) => id !== courseId) : [...current, courseId]
      };
    });
  };

  const saveAssignment = async (studentId: string) => {
    setSavingStudentId(studentId);
    await apiFetch(
      `/admin/students/${studentId}/courses`,
      { method: "PUT", body: JSON.stringify({ assignedCourses: draftAssignments[studentId] || [] }) },
      token
    );
    setSavingStudentId("");
    load();
  };

  return (
    <AdminShell title="Learning Track Management" subtitle="Create tracks, modules, prerequisites, XP rewards, certificates, and student access">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr] mb-4">
        <Card className="overflow-hidden rounded-2xl border-0 bg-slate-950 text-white shadow-2xl">
          <CardContent className="relative p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.28),transparent_36%)]" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-200" />
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Robokidy LMS Architecture</p>
              </div>
              <h2 className="mt-3 text-2xl font-bold">Track &rarr; Module &rarr; Chapter &rarr; Lesson &rarr; Quiz &rarr; Project &rarr; Assessment &rarr; Certificate</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                The existing course allocation stays active, now expanded into a modular STEM track system ready for robotics, AI, IoT, competitions, parent dashboards, and teacher workflows.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {adminCapabilityMap.map((capability) => (
                  <span key={capability} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-cyan-50">
                    {capability}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader><CardTitle>Curriculum Builder</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {learningTracks.slice(1, 7).map((track) => {
              const Icon = track.icon;
              return (
                <div key={track.title} className="rounded-xl border bg-white/70 p-3 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Icon className="h-4 w-4 text-cyan-600" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{track.title}</span>
                    {track.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground">{track.lessons} lessons</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500" style={{ width: `${track.progress}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader><CardTitle>Add Course</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Course name, e.g. LEGO" />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
            <Button onClick={createCourse} disabled={!name.trim()} className="w-full bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />Add Course
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm xl:col-span-2">
          <CardHeader><CardTitle>Available Courses</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {courses.map((course) => (
                <Badge key={course._id} variant={course.active ? "secondary" : "outline"} className="px-3 py-1">
                  {course.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-sm mt-4">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Student Course Access</CardTitle>
          <div className="relative md:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student" className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Allocated Courses</TableHead>
                <TableHead className="text-right">Save</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student._id}>
                  <TableCell className="font-medium">
                    {student.username}
                    <div className="mt-1">
                      <Badge variant={student.active ? "secondary" : "outline"}>{student.active ? "Active" : "Inactive"}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      {activeCourses.map((course) => (
                        <label key={course._id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                          <Checkbox
                            checked={(draftAssignments[student._id] || []).includes(course._id)}
                            onCheckedChange={() => toggleAssignment(student._id, course._id)}
                          />
                          <span>{course.name}</span>
                        </label>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => saveAssignment(student._id)} disabled={savingStudentId === student._id}>
                      <Save className="h-4 w-4 mr-1" />Save
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
