import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Code, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import StudentLmsShell from "@/components/layout/StudentLmsShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Lesson } from "@/types";

export default function LessonsPage() {
  const { token } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [search, setSearch] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch("/student/lessons", {}, token),
      apiFetch("/student/progress", {}, token)
    ]).then(([lessonData, progress]) => {
      setLessons(lessonData);
      setCompleted((progress?.completedLessons || []).map((id: string) => String(id)));
    });
  }, [token]);

  const filtered = useMemo(
    () => lessons.filter((lesson) => `${lesson.title} ${lesson.content}`.toLowerCase().includes(search.toLowerCase())),
    [lessons, search]
  );

  const complete = async (id: string) => {
    await apiFetch(`/student/lessons/${id}/complete`, { method: "POST" }, token);
    setCompleted((prev) => Array.from(new Set([...prev, id])));
  };

  return (
    <StudentLmsShell title="Lessons" subtitle="Explore assigned lessons with guided examples, progress tracking, and clean study cards.">
      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">Assigned Lessons</p>
          <p className="text-sm text-slate-500">{filtered.length} lessons available</p>
        </div>
        <div className="relative md:w-96">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lessons" className="h-12 rounded-2xl bg-white/90 pl-11 dark:bg-slate-950/70" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {filtered.map((lesson, index) => {
          const isCompleted = completed.includes(String(lesson._id));
          return (
            <Card key={lesson._id} className="group overflow-hidden border-white/60 bg-white/80 shadow-lg shadow-slate-200/50 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-cyan-50/70 dark:border-slate-800 dark:from-slate-900 dark:to-cyan-950/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant={isCompleted ? "secondary" : "outline"} className="mb-3">
                      {isCompleted ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <BookOpen className="mr-1 h-3 w-3" />}
                      Lesson {String(index + 1).padStart(2, "0")}
                    </Badge>
                    <CardTitle className="text-xl">{lesson.title}</CardTitle>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                    <BookOpen className="h-6 w-6" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <p className="mb-4 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{lesson.content}</p>
                {lesson.examples?.[0] && (
                  <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm text-emerald-300">
                    <code>{lesson.examples[0].code}{"\n"}# Output: {lesson.examples[0].output}</code>
                  </pre>
                )}
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Button asChild className="rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                    <Link to={`/student/lessons/${lesson._id}`}>View Lesson</Link>
                  </Button>
                  <Button className="rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white" onClick={() => complete(lesson._id)} disabled={isCompleted}>
                  <Code className="mr-2 h-4 w-4" />
                  {isCompleted ? "Completed" : "Mark Complete"}
                </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </StudentLmsShell>
  );
}
