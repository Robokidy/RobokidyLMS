import { useEffect, useMemo, useState } from "react";
import type { SelectHTMLAttributes } from "react";
import { AlertTriangle, BookOpenCheck, CalendarCheck, Clock, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Field({ label, children }: any) {
  return <div className="space-y-1.5"><Label className="text-xs text-slate-500">{label}</Label>{children}</div>;
}

function NativeSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-10 w-full rounded-md border border-input bg-background px-3 text-sm ${props.className || ""}`} />;
}

function relationName(value: any) {
  if (!value) return "-";
  if (Array.isArray(value)) return value.map(relationName).filter(Boolean).join(", ") || "-";
  return value.name || value.title || value.fullName || value.username || String(value);
}

export default function DailyWorkLogPage() {
  const { token } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [classes, setClasses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [status, setStatus] = useState<any>({ submittedToday: false, entriesToday: 0, reminderDue: false, mustSubmit: true });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ date: today, schoolId: "", classSectionId: "", grade: "", subject: "", courseId: "", lessonId: "", topicCovered: "", materialIds: [] as string[], materialsUsed: "", assessmentConducted: false, assessmentId: "", assessmentSummary: "", homeworkGiven: "", durationMinutes: 45, remarks: "" });

  const selectedClass = classes.find((klass) => String(klass._id) === String(form.classSectionId));
  const filteredLessons = useMemo(() => lessons.filter((lesson) => !form.courseId || String(lesson.courseId?._id || lesson.courseId) === String(form.courseId)), [lessons, form.courseId]);
  const filteredMaterials = useMemo(() => materials.filter((material) => !form.courseId || String(material.courseId?._id || material.courseId) === String(form.courseId)), [materials, form.courseId]);
  const submittedToday = logs.some((row) => row.date?.slice?.(0, 10) === today);

  const load = async () => {
    const [classRows, courseRows, lessonRows, materialRows, testRows, logRows, statusData] = await Promise.all([
      apiFetch("/teacher/classes", {}, token),
      apiFetch("/teacher/courses", {}, token),
      apiFetch("/teacher/lessons", {}, token),
      apiFetch("/teacher/materials", {}, token),
      apiFetch("/teacher/tests", {}, token),
      apiFetch("/teacher/work-logs", {}, token),
      apiFetch("/teacher/work-logs/status", {}, token)
    ]);
    setClasses(classRows || []);
    setCourses(courseRows || []);
    setLessons(lessonRows || []);
    setMaterials(materialRows || []);
    setTests(testRows || []);
    setLogs(logRows || []);
    setStatus(statusData || { submittedToday: false, entriesToday: 0, reminderDue: false, mustSubmit: true });
  };

  useEffect(() => {
    load().catch((error) => toast.error(error.message || "Unable to load work log data"));
  }, [token]);

  const updateClass = (classSectionId: string) => {
    const klass = classes.find((row) => String(row._id) === String(classSectionId));
    setForm({
      ...form,
      classSectionId,
      schoolId: klass?.schoolId?._id || klass?.schoolId || "",
      grade: klass?.grade || "",
      subject: (klass?.subjects || [])[0] || "",
      courseId: (klass?.courseIds || [])[0]?._id || (klass?.courseIds || [])[0] || ""
    });
  };

  const updateLesson = (lessonId: string) => {
    const lesson = lessons.find((row) => String(row._id) === String(lessonId));
    setForm({ ...form, lessonId, lessonConducted: lesson?.title || "", durationMinutes: lesson?.duration || form.durationMinutes, topicCovered: lesson?.title || form.topicCovered });
  };

  const toggleMaterial = (id: string) => {
    const materialIds = form.materialIds.includes(id) ? form.materialIds.filter((item: string) => item !== id) : [...form.materialIds, id];
    setForm({ ...form, materialIds, materialsUsed: materials.filter((item) => materialIds.includes(String(item._id))).map((item) => item.title).join(", ") });
  };

  const submit = async () => {
    if (!form.schoolId || !form.classSectionId || !form.lessonId) return toast.error("Select school, class, and curriculum lesson");
    setSaving(true);
    try {
      await apiFetch("/teacher/work-logs", { method: "POST", body: form }, token);
      toast.success("Daily work log submitted");
      setForm({ ...form, topicCovered: "", materialsUsed: "", materialIds: [], assessmentConducted: false, assessmentId: "", assessmentSummary: "", homeworkGiven: "", remarks: "" });
      await load();
    } catch (error: any) {
      toast.error(error.message || "Unable to submit work log");
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div><p className="text-xs uppercase tracking-[0.24em] text-slate-500">Daily Work Log</p><h2 className="mt-2 text-3xl font-semibold">Teaching activity submission</h2></div>
      <Badge variant={submittedToday ? "default" : "secondary"}>{submittedToday ? "Submitted today" : "Pending today"}</Badge>
    </div>

    {status.mustSubmit && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Daily submission required</div><p className="mt-1">{status.reminderDue ? "Please submit today's teaching activity before closing the day." : "Today's teaching activity is pending."}</p></div>}

    <div className="grid gap-3 md:grid-cols-4">
      <Card className="rounded-lg"><CardContent className="p-4"><CalendarCheck className="mb-2 h-4 w-4 text-slate-500" /><p className="text-sm text-slate-500">Entries Today</p><p className="text-2xl font-bold">{logs.filter((row) => row.date?.slice?.(0, 10) === today).length}</p></CardContent></Card>
      <Card className="rounded-lg"><CardContent className="p-4"><BookOpenCheck className="mb-2 h-4 w-4 text-slate-500" /><p className="text-sm text-slate-500">Lessons Logged</p><p className="text-2xl font-bold">{logs.length}</p></CardContent></Card>
      <Card className="rounded-lg"><CardContent className="p-4"><Clock className="mb-2 h-4 w-4 text-slate-500" /><p className="text-sm text-slate-500">Teaching Hours</p><p className="text-2xl font-bold">{Math.round((logs.reduce((sum, row) => sum + Number(row.durationMinutes || 0), 0) / 60) * 10) / 10}</p></CardContent></Card>
      <Card className="rounded-lg"><CardContent className="p-4"><FileText className="mb-2 h-4 w-4 text-slate-500" /><p className="text-sm text-slate-500">Assessments</p><p className="text-2xl font-bold">{logs.filter((row) => row.assessmentConducted).length}</p></CardContent></Card>
    </div>

    <Card className="rounded-lg"><CardHeader><CardTitle>New Entry</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">
      <Field label="Date"><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
      <Field label="Class"><NativeSelect value={form.classSectionId} onChange={(event) => updateClass(event.target.value)}><option value="">Select class</option>{classes.map((klass) => <option key={klass._id} value={klass._id}>{klass.name}</option>)}</NativeSelect></Field>
      <Field label="School"><Input value={relationName(selectedClass?.schoolId)} readOnly /></Field>
      <Field label="Grade"><Input value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })} /></Field>
      <Field label="Subject"><Input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></Field>
      <Field label="Course"><NativeSelect value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value, lessonId: "" })}><option value="">Select course</option>{courses.map((course) => <option key={course._id} value={course._id}>{course.name}</option>)}</NativeSelect></Field>
      <Field label="Lesson Conducted"><NativeSelect value={form.lessonId} onChange={(event) => updateLesson(event.target.value)}><option value="">Select from curriculum</option>{filteredLessons.map((lesson) => <option key={lesson._id} value={lesson._id}>{lesson.title}</option>)}</NativeSelect></Field>
      <Field label="Duration Minutes"><Input type="number" min={0} value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} /></Field>
      <div className="md:col-span-2"><Field label="Topics Covered"><Textarea value={form.topicCovered} onChange={(event) => setForm({ ...form, topicCovered: event.target.value })} /></Field></div>
      <div className="md:col-span-2"><Field label="Materials Used"><div className="grid gap-2 rounded-md border p-2 md:grid-cols-2">{filteredMaterials.length ? filteredMaterials.map((material) => <label key={material._id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.materialIds.includes(String(material._id))} onChange={() => toggleMaterial(String(material._id))} />{material.title}</label>) : <p className="p-2 text-sm text-slate-500">No linked materials found for this course.</p>}</div></Field></div>
      <Field label="Assessment Conducted"><NativeSelect value={form.assessmentConducted ? "yes" : "no"} onChange={(event) => setForm({ ...form, assessmentConducted: event.target.value === "yes", assessmentId: event.target.value === "yes" ? form.assessmentId : "" })}><option value="no">No</option><option value="yes">Yes</option></NativeSelect></Field>
      <Field label="Linked Assessment"><NativeSelect disabled={!form.assessmentConducted} value={form.assessmentId} onChange={(event) => setForm({ ...form, assessmentId: event.target.value })}><option value="">Select assessment</option>{tests.map((test) => <option key={test._id} value={test._id}>{test.title}</option>)}</NativeSelect></Field>
      <div className="md:col-span-2"><Field label="Assessment Score Summary"><Input value={form.assessmentSummary} onChange={(event) => setForm({ ...form, assessmentSummary: event.target.value })} placeholder="Average score, pass count, or short observation" /></Field></div>
      <div className="md:col-span-2"><Field label="Homework Given"><Textarea value={form.homeworkGiven} onChange={(event) => setForm({ ...form, homeworkGiven: event.target.value })} /></Field></div>
      <div className="md:col-span-2"><Field label="Remarks"><Textarea value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} /></Field></div>
      <Button className="md:col-span-2" disabled={saving} onClick={submit}><Plus className="mr-2 h-4 w-4" />{saving ? "Submitting..." : "Submit Work Log"}</Button>
    </CardContent></Card>

    <Card className="rounded-lg"><CardHeader><CardTitle>Recent Submissions</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr>{["Date", "School", "Class", "Course", "Lesson", "Duration", "Status"].map((head) => <th key={head} className="px-3 py-2">{head}</th>)}</tr></thead><tbody>{logs.map((row) => <tr key={row._id} className="border-t"><td className="px-3 py-2">{row.date ? new Date(row.date).toLocaleDateString() : "-"}</td><td className="px-3 py-2">{relationName(row.schoolId)}</td><td className="px-3 py-2">{relationName(row.classSectionId)}</td><td className="px-3 py-2">{relationName(row.courseId)}</td><td className="px-3 py-2">{row.lessonConducted || relationName(row.lessonId)}</td><td className="px-3 py-2">{row.durationMinutes || 0} min</td><td className="px-3 py-2"><Badge variant="outline">{row.status}</Badge></td></tr>)}</tbody></table></CardContent></Card>
  </div>;
}
