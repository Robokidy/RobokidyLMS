import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BookMarked, Plus, Search, Trash2 } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Lesson, Course } from "@/types";
import { CurriculumService } from "@/services/curriculumService";

export default function TeacherCurriculumPage() {
  const { token } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    courseId: "",
    objectives: ""
  });
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [courseData, lessonData] = await Promise.all([
        apiFetch("/teacher/courses", {}, token),
        CurriculumService.getTeacherLessons(token)
      ]);
      setCourses(courseData || []);
      setLessons(lessonData || []);
      if (!form.courseId && courseData?.[0]) {
        setForm((prev) => ({ ...prev, courseId: courseData[0]._id }));
      }
    } catch (error) {
      console.error("Error loading curriculum data:", error);
      toast({ title: "Error", description: "Failed to load curriculum data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const createLesson = async () => {
    if (!form.title.trim() || !form.courseId) {
      toast({ title: "Error", description: "Title and course are required", variant: "destructive" });
      return;
    }

    try {
      await CurriculumService.createLesson(
        {
          title: form.title,
          content: form.content,
          courseId: form.courseId,
          objectives: form.objectives ? form.objectives.split("\n").filter((o) => o.trim()) : []
        },
        token,
        "teacher"
      );
      toast({ title: "Success", description: "Lesson created successfully" });
      setForm({ title: "", content: "", courseId: form.courseId, objectives: "" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create lesson", variant: "destructive" });
    }
  };

  const deleteLesson = async (id: string) => {
    try {
      await CurriculumService.deleteLesson(id, token, "teacher");
      toast({ title: "Success", description: "Lesson deleted successfully", variant: "destructive" });
      setDeletingLesson(null);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete lesson", variant: "destructive" });
    }
  };

  const filteredLessons = useMemo(() => {
    const query = search.toLowerCase();
    return lessons.filter((lesson) => {
      const matchText = lesson.title.toLowerCase().includes(query) || lesson.content.toLowerCase().includes(query);
      const lessonCourseId = typeof lesson.courseId === "object" ? lesson.courseId._id : lesson.courseId;
      const matchCourse = !courseFilter || lessonCourseId === courseFilter;
      return matchText && matchCourse;
    });
  }, [lessons, search, courseFilter]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Curriculum Management</p>
            <h2 className="mt-2 text-3xl font-semibold">Create Lessons & Topics</h2>
            <p className="mt-1 text-sm text-slate-500">Build and organize your course curriculum with lessons, topics, and learning objectives.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Lesson
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Lesson title" />
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Lesson content (markdown supported)"
              className="h-24 rounded-md border bg-background px-3 py-2 text-sm resize-none"
            />
            <textarea
              value={form.objectives}
              onChange={(e) => setForm({ ...form, objectives: e.target.value })}
              placeholder="Learning objectives (one per line)"
              className="h-20 rounded-md border bg-background px-3 py-2 text-sm resize-none"
            />
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
              <option value="">Select a course</option>
              {courses.filter((course) => course.active).map((course) => (
                <option key={course._id} value={course._id}>
                  {course.name}
                </option>
              ))}
            </select>
            <Button className="w-full" onClick={createLesson} disabled={loading || !form.title.trim() || !form.courseId}>
              <BookMarked className="h-4 w-4 mr-2" />
              Create Lesson
            </Button>
            <p className="text-xs text-muted-foreground">Lessons will be assigned to students in the course.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Lesson Library</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lessons" className="pl-9" />
              </div>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="rounded-md border bg-background px-3 text-sm"
              >
                <option value="">All courses</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-slate-500">Loading lessons…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLessons.map((lesson) => (
                    <TableRow key={lesson._id}>
                      <TableCell className="font-medium">{lesson.title}</TableCell>
                      <TableCell>
                        {typeof lesson.courseId === "object"
                          ? lesson.courseId.name
                          : typeof lesson.courseTrackId === "object"
                            ? lesson.courseTrackId.trackName
                            : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingLesson(lesson)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!loading && filteredLessons.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-500">No lessons found. Create your first lesson to get started.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingLesson} onOpenChange={(open) => !open && setDeletingLesson(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingLesson?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingLesson && deleteLesson(deletingLesson._id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
