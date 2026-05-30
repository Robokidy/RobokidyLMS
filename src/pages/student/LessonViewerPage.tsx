import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CheckCircle2, ExternalLink, Play, Tag } from "lucide-react";
import DOMPurify from "dompurify";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import StudentLmsShell from "@/components/layout/StudentLmsShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lesson } from "@/types";

export default function LessonViewerPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/student/lessons/${id}`, {}, token)
      .then((data) => {
        setLesson(data);
        setError("");
      })
      .catch((err) => setError(err.message || "Unable to load lesson"))
      .finally(() => setLoading(false));
  }, [id, token]);

  const sanitizedContent = lesson?.content ? DOMPurify.sanitize(lesson.content, { USE_PROFILES: { html: true } }) : "";

  return (
    <StudentLmsShell title={lesson?.title || "Lesson Viewer"} subtitle="Read the lesson, review examples, and continue learning with course materials.">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link to="/student/lessons"><ArrowLeft className="mr-2 h-4 w-4" />Back to Lessons</Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Course-aligned</Badge>
            <Badge variant="outline" className="flex items-center gap-1"><Play className="h-3.5 w-3.5" /> Interactive content</Badge>
          </div>
        </div>

        {loading && (
          <Card>
            <CardContent className="p-8 text-center text-slate-600 dark:text-slate-300">Loading lesson content...</CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardContent className="p-8 text-center text-red-600 dark:text-red-400">{error}</CardContent>
          </Card>
        )}

        {lesson && !loading && !error && (
          <div className="space-y-6">
            <Card className="rounded-3xl border-white/60 bg-white/90 shadow-xl shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
              <CardHeader className="border-b border-slate-200/80 dark:border-slate-800">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                    <Badge variant="outline">{lesson.courseId?.name || "Assigned course"}</Badge>
                    <span>Lesson ID: {lesson._id}</span>
                  </div>
                  <CardTitle className="text-3xl">{lesson.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div className="prose max-w-none prose-slate dark:prose-invert">
                  <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
                </div>

                {lesson.examples?.length ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>Example walkthrough</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {lesson.examples.map((example, index) => (
                        <div key={index} className="rounded-3xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                          <div className="mb-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Tag className="h-4 w-4" /> Example {index + 1}
                          </div>
                          <pre className="whitespace-pre-wrap rounded-2xl bg-slate-900 p-4 text-xs text-emerald-200 overflow-x-auto"><code>{example.code}</code></pre>
                          <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                            <p><strong>Output</strong>: {example.output}</p>
                            {example.explanation && <p>{example.explanation}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="secondary" size="sm">
                    <Link to="/student/materials">Open Materials</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/student/quizzes">View Quizzes</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </StudentLmsShell>
  );
}
