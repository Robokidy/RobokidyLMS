import { useEffect, useState } from "react";
import { CheckCircle2, GraduationCap, Trophy } from "lucide-react";
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

  useEffect(() => {
    apiFetch("/student/lessons", {}, token).then((lessonData) => {
      setLessons(lessonData);
      if (lessonData[0]) setLessonId(lessonData[0]._id);
    });
  }, [token]);

  useEffect(() => {
    if (!lessonId) return;
    setScore(null);
    setAnswers([]);
    apiFetch(`/student/quizzes/${lessonId}`, {}, token).then(setQuiz);
  }, [lessonId, token]);

  const submit = async () => {
    const res = await apiFetch(`/student/quizzes/${lessonId}/submit`, { method: "POST", body: JSON.stringify({ answers }) }, token);
    setScore(res.score);
  };

  return (
    <StudentLmsShell title="Quiz Practice" subtitle="Test your understanding with clean assessments and instant scoring.">
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <Card className="border-white/60 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-cyan-600" /> Select Lesson</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lessons.map((lesson) => (
              <button
                key={lesson._id}
                onClick={() => setLessonId(lesson._id)}
                className={`w-full rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${
                  lessonId === lesson._id ? "border-cyan-300 bg-cyan-50 text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-100" : "border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/40"
                }`}
              >
                <p className="font-semibold">{lesson.title}</p>
                <p className="mt-1 text-xs text-slate-500">Knowledge check</p>
              </button>
            ))}
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
            {quiz?.questions?.map((question, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-100 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="font-semibold">{idx + 1}. {question.question}</p>
                <div className="mt-3 grid gap-2">
                  {question.options.map((option, optionIndex) => (
                    <label key={optionIndex} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition hover:border-cyan-300 ${answers[idx] === optionIndex ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/40" : "border-slate-200 dark:border-slate-800"}`}>
                      <input type="radio" name={`q-${idx}`} checked={answers[idx] === optionIndex} onChange={() => { const next = [...answers]; next[idx] = optionIndex; setAnswers(next); }} />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <Button className="rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white" onClick={submit} disabled={!quiz || answers.length < (quiz?.questions?.length || 0)}>
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
