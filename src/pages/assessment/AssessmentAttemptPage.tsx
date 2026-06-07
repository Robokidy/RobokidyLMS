/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StudentLmsShell from "@/components/layout/StudentLmsShell";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AssessmentAttemptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [test, setTest] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [runOutput, setRunOutput] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submit = async (method = "manual") => {
    if (!attempt || submitted) return;
    setSubmitted(true);
    await apiFetch(`/assessments/attempts/${attempt._id}/submit`, { method: "POST", body: JSON.stringify({ submissionMethod: method }) }, token);
    navigate("/student/tests");
  };

  const logViolation = async (violationType: string, description: string) => {
    if (!attempt || submitted) return;
    const data = await apiFetch(`/assessments/attempts/${attempt._id}/violations`, {
      method: "POST",
      body: JSON.stringify({ violationType, description })
    }, token);
    setViolations(data.violationCount || 0);
    if (data.autoSubmitted) {
      setSubmitted(true);
      navigate("/student/tests");
    }
  };

  useEffect(() => {
    if (!token || !id) return;
    apiFetch(`/assessments/tests/${id}/start`, { method: "POST" }, token).then((data) => {
      setTest(data.test);
      setAttempt(data.attempt);
      setQuestions(data.questions || []);
      setSecondsLeft(Number(data.test?.timeLimit || 30) * 60);
      document.documentElement.requestFullscreen?.().catch(() => undefined);
    }).catch((err) => {
      setError(err instanceof Error ? err.message : "Could not start assessment");
      window.setTimeout(() => navigate("/student/tests"), 1600);
    });
  }, [token, id]);

  useEffect(() => {
    if (!secondsLeft || submitted) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft, submitted]);

  useEffect(() => {
    if (secondsLeft === 0 && attempt && !submitted) submit("auto-timeout");
  }, [secondsLeft, attempt, submitted]);

  useEffect(() => {
    const onBlur = () => logViolation("window-blur", "Window lost focus");
    const onVisibility = () => document.hidden && logViolation("tab-switch", "Student switched tabs");
    const onFullscreenChange = () => !document.fullscreenElement && logViolation("window-minimize", "Student exited fullscreen");
    const block = (event: Event) => {
      event.preventDefault();
      logViolation(event.type === "contextmenu" ? "right-click" : "copy-paste", `${event.type} blocked`);
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("copy", block);
    document.addEventListener("paste", block);
    document.addEventListener("contextmenu", block);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("copy", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("contextmenu", block);
    };
  }, [attempt, submitted]);

  const timeLabel = useMemo(() => `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`, [secondsLeft]);

  const saveAnswer = async (question: any, answer: any) => {
    setAnswers((prev) => ({ ...prev, [question._id]: answer }));
    if (!attempt) return;
    await apiFetch(`/assessments/attempts/${attempt._id}/save`, {
      method: "POST",
      body: JSON.stringify({ questionId: question._id, questionType: question.type, answer })
    }, token);
  };

  const runCode = async (question: any) => {
    try {
      const data = await apiFetch("/code/run", {
        method: "POST",
        body: JSON.stringify({ code: answers[question._id] || question.codingConfig?.templateCode || "" })
      }, token);
      setRunOutput((prev) => ({ ...prev, [question._id]: data.output || "" }));
    } catch (error: any) {
      setRunOutput((prev) => ({ ...prev, [question._id]: error.message || "Code run failed" }));
    }
  };

  const toggleMultiAnswer = (question: any, value: string) => {
    const current = Array.isArray(answers[question._id]) ? answers[question._id] : [];
    const next = current.includes(value) ? current.filter((item: string) => item !== value) : [...current, value];
    saveAnswer(question, next);
  };

  return (
    <StudentLmsShell title={test?.title || "Assessment"} subtitle={`Secure mode active - Time left ${timeLabel} - Violations ${violations}/3`}>
      <div className="space-y-4">
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {questions.map((question, index) => (
          <Card key={question._id} className="rounded-lg">
            <CardHeader><CardTitle className="text-base">{index + 1}. {question.questionText}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {["mcq", "true-false"].includes(question.type) ? (
                (question.options || []).map((option: any) => (
                  <label key={option.optionId || option.text} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <input type="radio" name={question._id} checked={answers[question._id] === (option.optionId || option.text)} onChange={() => saveAnswer(question, option.optionId || option.text)} />
                    {option.text}
                  </label>
                ))
              ) : question.type === "multi-select" ? (
                (question.options || []).map((option: any) => {
                  const value = option.optionId || option.text;
                  const selected = Array.isArray(answers[question._id]) && answers[question._id].includes(value);
                  return (
                    <label key={value} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <input type="checkbox" checked={selected} onChange={() => toggleMultiAnswer(question, value)} />
                      {option.text}
                    </label>
                  );
                })
              ) : question.type === "coding" ? (
                <div className="space-y-2">
                  <textarea className="h-48 w-full rounded-md border bg-slate-950 p-3 font-mono text-sm text-slate-50" value={answers[question._id] || question.codingConfig?.templateCode || ""} onChange={(event) => saveAnswer(question, event.target.value)} />
                  <Button type="button" variant="outline" onClick={() => runCode(question)}>Run Code</Button>
                  {runOutput[question._id] && <pre className="rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-900">{runOutput[question._id]}</pre>}
                </div>
              ) : (
                <textarea className="h-32 w-full rounded-md border p-3 text-sm" value={answers[question._id] || ""} onChange={(event) => saveAnswer(question, event.target.value)} />
              )}
            </CardContent>
          </Card>
        ))}
        <Button className="w-full" onClick={() => submit("manual")}>Submit Assessment</Button>
      </div>
    </StudentLmsShell>
  );
}
