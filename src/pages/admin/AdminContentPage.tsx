import { useEffect, useMemo, useState } from "react";
import { FilePenLine, Plus, Search, Trash2, ListChecks } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import AdminShell from "@/components/layout/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Course } from "@/types";

type Lesson = { _id: string; title: string; courseId?: Course | string; content: string };
type QuizMap = Record<string, { _id: string; questions: Array<{ question: string; options: string[]; correctAnswer: number }> } | null>;
type QuizQuestion = { question: string; options: string[]; correctAnswer: number };

export default function AdminContentPage() {
  const { token } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizByLesson, setQuizByLesson] = useState<QuizMap>({});
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [quizLesson, setQuizLesson] = useState<Lesson | null>(null);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [content, setContent] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  const load = async () => {
    const courseData = await apiFetch("/admin/courses", {}, token);
    setCourses(courseData);

    const data = await apiFetch("/admin/lessons", {}, token);
    setLessons(data);
    const entries = await Promise.all(
      data.map(async (l: Lesson) => {
        try {
          const q = await apiFetch(`/admin/quizzes/${l._id}`, {}, token);
          return [l._id, q] as const;
        } catch {
          return [l._id, null] as const;
        }
      })
    );
    setQuizByLesson(Object.fromEntries(entries));
  };

  useEffect(() => { load(); }, [token]);

  const filtered = useMemo(() => lessons.filter((l) => l.title.toLowerCase().includes(search.toLowerCase())), [lessons, search]);

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setCourseId(courses.find((course) => course.active)?._id || "");
    setContent("");
    setOpen(true);
  };

  const openEdit = (lesson: Lesson) => {
    setEditing(lesson);
    setTitle(lesson.title);
    setCourseId(typeof lesson.courseId === "string" ? lesson.courseId : lesson.courseId?._id || "");
    setContent(lesson.content);
    setOpen(true);
  };

  const saveLesson = async () => {
    if (editing) {
      await apiFetch(`/admin/lessons/${editing._id}`, { method: "PUT", body: JSON.stringify({ title, courseId, content, examples: [] }) }, token);
    } else {
      const lesson = await apiFetch(`/admin/lessons`, { method: "POST", body: JSON.stringify({ title, courseId, content, examples: [] }) }, token);
      await apiFetch(`/admin/quizzes`, {
        method: "POST",
        body: JSON.stringify({
          lessonId: lesson._id,
          questions: [1, 2, 3, 4, 5].map((i) => ({
            question: `${title}: Question ${i}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: 0
          }))
        })
      }, token);
    }
    setOpen(false);
    load();
  };

  const deleteLesson = async (id: string) => {
    await apiFetch(`/admin/lessons/${id}`, { method: "DELETE" }, token);
    load();
  };

  const openQuizEditor = (lesson: Lesson) => {
    const existing = quizByLesson[lesson._id];
    const initialQuestions = existing?.questions?.length
      ? existing.questions
      : [1, 2, 3, 4, 5].map((i) => ({
          question: `${lesson.title}: Question ${i}`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: 0
        }));

    setQuizLesson(lesson);
    setQuizQuestions(initialQuestions);
    setQuizOpen(true);
  };

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setQuizQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuizQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, oi) => (oi === oIndex ? value : o)) } : q
      )
    );
  };

  const addQuestion = () => {
    setQuizQuestions((prev) => [
      ...prev,
      {
        question: `New question ${prev.length + 1}`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: 0
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuizQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const saveQuiz = async () => {
    if (!quizLesson) return;

    const payload = {
      lessonId: quizLesson._id,
      questions: quizQuestions.map((q) => ({
        question: q.question.trim() || "Untitled question",
        options: q.options.map((o) => o.trim() || "Option"),
        correctAnswer: q.correctAnswer
      }))
    };

    const existing = quizByLesson[quizLesson._id];
    if (existing?._id) {
      await apiFetch(`/admin/quizzes/${existing._id}`, { method: "PUT", body: JSON.stringify(payload) }, token);
    } else {
      await apiFetch(`/admin/quizzes`, { method: "POST", body: JSON.stringify(payload) }, token);
    }

    setQuizOpen(false);
    setQuizLesson(null);
    setQuizQuestions([]);
    load();
  };

  return (
    <AdminShell title="Content Management" subtitle="Organize lessons and associated quiz packs">
      {!open && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-col md:flex-row gap-3 md:justify-between md:items-center">
            <CardTitle>Lessons & Quizzes</CardTitle>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search lesson" />
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Lesson</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lesson Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Content Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lesson) => {
                  const quiz = quizByLesson[lesson._id];
                  return (
                    <TableRow key={lesson._id}>
                      <TableCell className="font-medium">{lesson.title}</TableCell>
                      <TableCell>{typeof lesson.courseId === "string" ? "Course" : lesson.courseId?.name || "Unassigned"}</TableCell>
                      <TableCell>
                        {quiz ? <Badge className="bg-emerald-100 text-emerald-700">{quiz.questions.length} Questions</Badge> : <Badge variant="secondary">Not Set</Badge>}
                      </TableCell>
                      <TableCell>{lesson.content.length} chars</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          <Button variant="outline" size="icon" onClick={() => openQuizEditor(lesson)} title="Manage Quiz">
                            <ListChecks className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => openEdit(lesson)}><FilePenLine className="h-4 w-4" /></Button>
                          <Button variant="destructive" size="icon" onClick={() => deleteLesson(lesson._id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {open && (
        <Card className="rounded-3xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-none">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>{editing ? "Edit Lesson" : "Create Lesson"}</CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400">Use the full editor below to compose lesson content and save when ready.</p>
            </div>
            <Button variant="outline" onClick={() => setOpen(false)}>Back to lesson list</Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" />
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.filter((course) => course.active).map((course) => (
                    <SelectItem key={course._id} value={course._id}>{course.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/80">
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Lesson content editor</p>
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                placeholder="Write your lesson content with headings, code blocks, images, tables, links, and videos"
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ color: [] }, { background: [] }],
                    [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
                    ["blockquote", "code-block"],
                    ["link", "image", "video"],
                    ["clean"]
                  ]
                }}
                className="min-h-[420px]"
              />
            </div>
            <Button onClick={saveLesson} disabled={!title.trim() || !courseId} className="w-full sm:w-auto">
              {editing ? "Save Changes" : "Create Lesson + Starter Quiz"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Quiz: {quizLesson?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-auto pr-2">
            {quizQuestions.map((q, qIndex) => (
              <div key={qIndex} className="rounded-xl border p-4 space-y-3 bg-white/70 dark:bg-slate-950/40">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">Question {qIndex + 1}</p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeQuestion(qIndex)}
                    disabled={quizQuestions.length <= 1}
                  >
                    Remove
                  </Button>
                </div>

                <Textarea
                  value={q.question}
                  onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                  placeholder="Enter question text"
                />

                <div className="grid md:grid-cols-2 gap-2">
                  {q.options.map((opt, oIndex) => (
                    <Input
                      key={oIndex}
                      value={opt}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                    />
                  ))}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Correct Answer</p>
                  <div className="flex flex-wrap gap-2">
                    {[0, 1, 2, 3].map((optIndex) => (
                      <Button
                        key={optIndex}
                        type="button"
                        size="sm"
                        variant={q.correctAnswer === optIndex ? "default" : "outline"}
                        onClick={() => updateQuestion(qIndex, { correctAnswer: optIndex })}
                      >
                        Option {String.fromCharCode(65 + optIndex)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={addQuestion}>Add Question</Button>
            <Button className="sm:ml-auto" onClick={saveQuiz}>Save Quiz</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
