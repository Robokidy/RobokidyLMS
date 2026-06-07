import { useEffect, useState } from "react";
import { CheckCircle2, GraduationCap, Lock, Trophy } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import StudentLmsShell from "@/components/layout/StudentLmsShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lesson, Quiz } from "@/types";

export default function QuizPage() {
  const { token } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonId, setLessonId] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/student/lessons", {}, token).then((lessonData) => {
      setLessons(lessonData);
      const firstQuizLesson = lessonData.find((lesson: Lesson) => lesson.quizAvailable);
      if (firstQuizLesson) setLessonId(firstQuizLesson._id);
    });
  }, [token]);

  useEffect(() => {
    if (!lessonId) return;
    setScore(null);
    setError("");
    setAnswers([]);
    apiFetch(`/student/quizzes/${lessonId}`, {}, token).then(setQuiz);
  }, [lessonId, token]);

  const submit = async () => {
    try {
      const res = await apiFetch(`/student/quizzes/${lessonId}/submit`, { method: "POST", body: { answers } }, token);
      setScore(res.score);
      setQuiz((current) => current ? { ...current, alreadyAttempted: true, attempt: { attempts: 1, lastAttemptScore: res.score, bestScore: res.score } } : current);
      setLessons((current) => current.map((lesson) => lesson._id === lessonId ? { ...lesson, quizAttempted: true, quizScore: res.score } : lesson));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit quiz");
    }
  };

  const quizLessons = lessons.filter((lesson) => lesson.quizAvailable);
  const selectedLesson = lessons.find((lesson) => lesson._id === lessonId);
  const isAttempted = Boolean(quiz?.alreadyAttempted || selectedLesson?.quizAttempted);

  return (
    <StudentLmsShell title="Quiz Practice" subtitle="Test your understanding with clean assessments and instant scoring.">
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <Card className="border-white/60 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-cyan-600" /> Select Lesson</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quizLessons.map((lesson) => (
              <button
                key={lesson._id}
                onClick={() => setLessonId(lesson._id)}
                className={`w-full rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${
                  lessonId === lesson._id ? "border-cyan-300 bg-cyan-50 text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-100" : "border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{lesson.title}</p>
                  {lesson.quizAttempted && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {lesson.quizQuestionCount || 0} questions
                  {lesson.quizAttempted ? ` | Score ${lesson.quizScore || 0}%` : ""}
                </p>
              </button>
            ))}
            {!quizLessons.length && <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">No lesson quizzes are available yet.</p>}
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between gap-4">
              <CardTitle>{lessons.find((lesson) => lesson._id === lessonId)?.title || "Quiz"}</CardTitle>
              <Badge variant="outline"><Trophy className="mr-1 h-3 w-3" /> {quiz?.questions?.length || 0} Questions</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            {isAttempted && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                <Lock className="h-4 w-4" /> This quiz has already been attempted.
              </div>
            )}
            {quiz?.questions?.map((question, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-100 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="font-semibold">{idx + 1}. {question.question}</p>
                <div className="mt-3 grid gap-2">
                  {question.options.map((option, optionIndex) => (
                    <label key={optionIndex} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition hover:border-cyan-300 ${answers[idx] === optionIndex ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/40" : "border-slate-200 dark:border-slate-800"}`}>
                      <input type="radio" name={`q-${idx}`} checked={answers[idx] === optionIndex} disabled={isAttempted} onChange={() => { const next = [...answers]; next[idx] = optionIndex; setAnswers(next); }} />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <Button className="rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white" onClick={submit} disabled={!quiz || isAttempted || answers.length < (quiz?.questions?.length || 0)}>
                Submit Quiz
              </Button>
              {score !== null && <p className="flex items-center gap-2 font-semibold text-emerald-600"><CheckCircle2 className="h-5 w-5" /> Score: {score}%</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </StudentLmsShell>
  );
}
