import { useEffect, useMemo, useState } from "react";
import type { SelectHTMLAttributes } from 'react';
import * as XLSX from 'xlsx';
import { BarChart3, CheckSquare, ClipboardList, FileQuestion, Plus, FileSpreadsheet, Trash2 } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const questionTypes = [
  { value: "mcq", label: "MCQ" },
  { value: "multi-select", label: "Multiple Correct" },
  { value: "true-false", label: "True / False" },
  { value: "fill-blank", label: "Fill Blank" },
  { value: "descriptive", label: "Short Answer" },
  { value: "image-based", label: "Image Based" },
];

const emptyQuestion = {
  questionText: "",
  type: "mcq",
  difficulty: "medium",
  marks: "1",
  negativeMarks: "0",
  topic: "",
  tags: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "A",
  fillAnswer: "",
  imageUrl: "",
  expectedKeywords: "",
};

const emptyAssessment = {
  title: "",
  description: "",
  instructions: "",
  testType: "quiz",
  courseId: "",
  schoolIds: [] as string[],
  classSectionIds: [] as string[],
  grades: [] as string[],
  timeLimit: "30",
  passingMarks: "",
  status: "draft",
  shuffleQuestions: false,
  shuffleOptions: false,
  showResultImmediately: true,
  allowReview: true,
  negativeMarking: false,
};

function toTags(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function shortText(value = "", length = 84) {
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
}

export default function QuizAssessmentManager() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [reports, setReports] = useState<any>({ rows: [], summary: {} });
  const [meta, setMeta] = useState<any>({ courses: [], classes: [], schools: [], lessons: [] });
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [assessmentForm, setAssessmentForm] = useState(emptyAssessment);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({ search: "", courseId: "", lessonId: "", difficulty: "", type: "" });
  const [reportFilters, setReportFilters] = useState({ testId: "", studentId: "", classId: "" });
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const reportQuery = (next = reportFilters) => {
    const params = new URLSearchParams();
    if (next.testId) params.set("testId", next.testId);
    if (next.studentId) params.set("studentId", next.studentId);
    if (next.classId) params.set("classId", next.classId);
    const query = params.toString();
    return query ? `?${query}` : "";
  };

  const load = async () => {
    const [questionRows, testRows, reportData, metaData] = await Promise.all([
      apiFetch("/assessments/questions", {}, token),
      apiFetch("/assessments/tests", {}, token),
      apiFetch(`/assessments/reports${reportQuery()}`, {}, token),
      apiFetch("/assessments/meta", {}, token),
    ]);
    setQuestions(questionRows || []);
    setAssessments(testRows || []);
    setReports(reportData || { rows: [], summary: {} });
    setMeta(metaData || { courses: [], classes: [], schools: [], lessons: [] });
  };

  useEffect(() => {
    if (token) load().catch(() => undefined);
  }, [token, reportFilters.testId, reportFilters.studentId, reportFilters.classId]);

  const filteredQuestions = useMemo(() => {
    const query = filters.search.toLowerCase();
    return questions.filter((question) => {
      if (filters.courseId && String(question.courseId?._id || question.courseId || "") !== filters.courseId) return false;
      if (filters.lessonId && String(question.lessonId?._id || question.lessonId || "") !== filters.lessonId) return false;
      if (filters.difficulty && question.difficulty !== filters.difficulty) return false;
      if (filters.type && question.type !== filters.type) return false;
      return `${question.questionText} ${question.topic || ""} ${(question.tags || []).join(" ")}`.toLowerCase().includes(query);
    });
  }, [questions, filters]);

  const selectedQuestions = selectedQuestionIds
    .map((id) => questions.find((question) => question._id === id))
    .filter(Boolean);
  const totalMarks = selectedQuestions.reduce((sum, question) => sum + Number(question.marks || 0), 0);
  const reportRows = useMemo(() => [...(reports.rows || [])].sort((a: any, b: any) => (b.percentage - a.percentage) || (b.score - a.score)), [reports.rows]);
  const selectedAssessment = assessments.find((assessment) => assessment._id === reportFilters.testId);

  const createQuestion = async () => {
    setError("");
    setActionLoading("question");
    try {
      const optionValues = [questionForm.optionA, questionForm.optionB, questionForm.optionC, questionForm.optionD];
      const options = questionForm.type === "true-false"
        ? [
          { optionId: "true", text: "True", isCorrect: questionForm.correctOption === "true" },
          { optionId: "false", text: "False", isCorrect: questionForm.correctOption === "false" },
        ]
        : optionValues
          .map((text, index) => ({ optionId: String.fromCharCode(65 + index), text: text.trim(), isCorrect: questionForm.correctOption === String.fromCharCode(65 + index) }))
          .filter((option) => option.text);

      await apiFetch("/assessments/questions", {
        method: "POST",
        body: {
          questionText: questionForm.questionText,
          type: questionForm.type,
          difficulty: questionForm.difficulty,
          marks: Number(questionForm.marks || 1),
          negativeMarks: Number(questionForm.negativeMarks || 0),
          topic: questionForm.topic,
          tags: toTags(questionForm.tags),
          options: ["mcq", "multi-select", "true-false"].includes(questionForm.type) ? options : [],
          blanks: questionForm.type === "fill-blank" ? [{ blankId: "blank-1", correctAnswer: questionForm.fillAnswer, acceptableVariations: [] }] : [],
          imageData: questionForm.imageUrl ? { imageUrl: questionForm.imageUrl } : undefined,
          description: questionForm.type === "descriptive" ? questionForm.expectedKeywords : "",
          courseId: filters.courseId || undefined,
          lessonId: filters.lessonId || undefined,
        }
      }, token);
      setQuestionForm(emptyQuestion);
      toast({ title: "Question added", description: "The question bank has been updated." });
      await load();
    } catch (err: any) {
      setError(err.message || "Could not add question");
    } finally {
      setActionLoading("");
    }
  };

  const deleteQuestion = async (id: string) => {
    await apiFetch(`/assessments/questions/${id}`, { method: "DELETE" }, token);
    setSelectedQuestionIds((current) => current.filter((item) => item !== id));
    await load();
  };

  const createAssessment = async (status = assessmentForm.status) => {
    setError("");
    setActionLoading(status === "published" ? "publish-new" : "draft");
    try {
      await apiFetch("/assessments/tests", {
        method: "POST",
        body: {
          ...assessmentForm,
          status,
          duration: Number(assessmentForm.timeLimit || 30),
          timeLimit: Number(assessmentForm.timeLimit || 30),
          passingMarks: Number(assessmentForm.passingMarks || Math.ceil(totalMarks * 0.6)),
          courseId: assessmentForm.courseId || undefined,
          schoolIds: assessmentForm.schoolIds,
          classSectionIds: assessmentForm.classSectionIds,
          grades: assessmentForm.grades,
          questionIds: selectedQuestionIds,
          totalMarks,
        }
      }, token);
      setAssessmentForm(emptyAssessment);
      setSelectedQuestionIds([]);
      toast({ title: status === "published" ? "Assessment published" : "Draft saved" });
      await load();
    } catch (err: any) {
      setError(err.message || "Could not create assessment");
    } finally {
      setActionLoading("");
    }
  };

  const publishAssessment = async (id: string) => {
    setActionLoading(`publish-${id}`);
    try {
      await apiFetch(`/assessments/tests/${id}/publish`, { method: "POST" }, token);
      await load();
    } finally {
      setActionLoading("");
    }
  };

  const deleteAssessment = async (id: string) => {
    await apiFetch(`/assessments/tests/${id}`, { method: "DELETE" }, token);
    await load();
  };

  const viewAssessmentReport = (id: string) => {
    setReportFilters({ testId: id, studentId: "", classId: "" });
    setTimeout(() => document.getElementById("assessment-report-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };


  const exportReportXlsx = () => {
    const rows = reportRows.map((row: any) => ({
      "Student Name": row.student || "-",
      Class: row.className || "-",
      "Assessment Name": row.test || selectedAssessment?.title || "Assessment",
      Score: Number(row.percentage ?? row.score ?? 0),
      "Status (Pass/Fail)": row.passed ? "Pass" : "Fail",
      "Date Attempted": row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "Student Name": "No attempts found", Class: "", "Assessment Name": "", Score: "", "Status (Pass/Fail)": "", "Date Attempted": "" }]), "Assessment Report");
    const name = (selectedAssessment?.title || "all-assessments").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "assessment";
    XLSX.writeFile(workbook, `assessment-report-${name}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  const printReport = () => {
    const title = selectedAssessment?.title || "Assessment Report";
    const classAverage = reports.summary?.averageScore || 0;
    const rowsHtml = reportRows.map((row: any, index: number) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.student)}</td>
        <td>${escapeHtml(row.className || "-")}</td>
        <td>${escapeHtml(row.test)}</td>
        <td>${escapeHtml(row.score)} / ${escapeHtml(row.total)}</td>
        <td>${escapeHtml(row.percentage)}%</td>
        <td>${row.passed ? "Passed" : escapeHtml(row.status)}</td>
      </tr>
    `).join("");
    const printWindow = window.open("", "_blank", "width=1000,height=700");
    if (!printWindow) return window.print();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 28px; }
            h1 { margin: 0 0 6px; font-size: 24px; }
            .muted { color: #64748b; margin: 0 0 18px; }
            .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
            .metric { border: 1px solid #dbe3ef; border-radius: 8px; padding: 10px; }
            .metric span { display: block; color: #64748b; font-size: 12px; }
            .metric strong { display: block; margin-top: 4px; font-size: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #dbe3ef; padding: 8px; text-align: left; font-size: 13px; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <p class="muted">Students sorted by marks in descending order</p>
          <div class="metrics">
            <div class="metric"><span>Total Attempts</span><strong>${reports.summary?.attempts || 0}</strong></div>
            <div class="metric"><span>Class Average</span><strong>${classAverage}%</strong></div>
            <div class="metric"><span>Passed</span><strong>${reports.summary?.passed || 0}</strong></div>
            <div class="metric"><span>Violations</span><strong>${reports.summary?.violations || 0}</strong></div>
          </div>
          <table>
            <thead><tr><th>Rank</th><th>Student</th><th>Class</th><th>Assessment</th><th>Marks</th><th>Percentage</th><th>Status</th></tr></thead>
            <tbody>${rowsHtml || `<tr><td colspan="7">No attempts found</td></tr>`}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Question Bank" value={questions.length} icon={FileQuestion} />
        <Metric label="Assessments" value={assessments.length} icon={ClipboardList} />
        <Metric label="Selected" value={selectedQuestionIds.length} icon={CheckSquare} />
        <Metric label="Total Marks" value={totalMarks} icon={BarChart3} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.25fr_0.85fr]">
        <Card className="rk-card">
          <CardHeader>
            <CardTitle>Question Builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={questionForm.questionText} onChange={(event) => setQuestionForm({ ...questionForm, questionText: event.target.value })} placeholder="Question text" />
            <div className="grid gap-2 md:grid-cols-2">
              <NativeSelect value={questionForm.type} onChange={(event) => setQuestionForm({ ...questionForm, type: event.target.value, correctOption: event.target.value === "true-false" ? "true" : "A" })}>
                {questionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </NativeSelect>
              <NativeSelect value={questionForm.difficulty} onChange={(event) => setQuestionForm({ ...questionForm, difficulty: event.target.value })}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </NativeSelect>
            </div>
            {["mcq", "multi-select"].includes(questionForm.type) && (
              <div className="grid gap-2">
                {["A", "B", "C", "D"].map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-[#1a56db]">{key}</span>
                    <Input value={(questionForm as any)[`option${key}`]} onChange={(event) => setQuestionForm({ ...questionForm, [`option${key}`]: event.target.value })} placeholder={`Option ${key}`} />
                  </div>
                ))}
                <NativeSelect value={questionForm.correctOption} onChange={(event) => setQuestionForm({ ...questionForm, correctOption: event.target.value })}>
                  {["A", "B", "C", "D"].map((key) => <option key={key} value={key}>Correct {key}</option>)}
                </NativeSelect>
              </div>
            )}
            {questionForm.type === "true-false" && (
              <NativeSelect value={questionForm.correctOption} onChange={(event) => setQuestionForm({ ...questionForm, correctOption: event.target.value })}>
                <option value="true">True</option>
                <option value="false">False</option>
              </NativeSelect>
            )}
            {questionForm.type === "fill-blank" && <Input value={questionForm.fillAnswer} onChange={(event) => setQuestionForm({ ...questionForm, fillAnswer: event.target.value })} placeholder="Accepted answer" />}
            {questionForm.type === "descriptive" && <Textarea value={questionForm.expectedKeywords} onChange={(event) => setQuestionForm({ ...questionForm, expectedKeywords: event.target.value })} placeholder="Expected keywords or evaluation notes" rows={2} />}
            {questionForm.type === "image-based" && <Input value={questionForm.imageUrl} onChange={(event) => setQuestionForm({ ...questionForm, imageUrl: event.target.value })} placeholder="Image URL" />}
            <div className="grid gap-2 md:grid-cols-2">
              <Input value={questionForm.marks} onChange={(event) => setQuestionForm({ ...questionForm, marks: event.target.value })} placeholder="Marks" />
              <Input value={questionForm.negativeMarks} onChange={(event) => setQuestionForm({ ...questionForm, negativeMarks: event.target.value })} placeholder="Negative marks" />
            </div>
            <Input value={questionForm.topic} onChange={(event) => setQuestionForm({ ...questionForm, topic: event.target.value })} placeholder="Topic tag" />
            <Input value={questionForm.tags} onChange={(event) => setQuestionForm({ ...questionForm, tags: event.target.value })} placeholder="Tags, comma separated" />
            <NativeSelect value={filters.lessonId} onChange={(event) => setFilters({ ...filters, lessonId: event.target.value })}>
              <option value="">Lesson for this quiz</option>
              {meta.lessons.map((lesson: any) => <option key={lesson._id} value={lesson._id}>{lesson.title}</option>)}
            </NativeSelect>
            <Button className="w-full" onClick={createQuestion} disabled={!questionForm.questionText.trim() || actionLoading === "question"}>
              <Plus className="mr-2 h-4 w-4" />{actionLoading === "question" ? "Adding..." : "Add Question"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rk-card">
          <CardHeader>
            <CardTitle>Assessment Builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2">
              <Input value={assessmentForm.title} onChange={(event) => setAssessmentForm({ ...assessmentForm, title: event.target.value })} placeholder="Assessment title" />
              <NativeSelect value={assessmentForm.courseId} onChange={(event) => setAssessmentForm({ ...assessmentForm, courseId: event.target.value })}>
                <option value="">Course</option>
                {meta.courses.map((course: any) => <option key={course._id} value={course._id}>{course.name}</option>)}
              </NativeSelect>
              <Input value={assessmentForm.timeLimit} onChange={(event) => setAssessmentForm({ ...assessmentForm, timeLimit: event.target.value })} placeholder="Time limit minutes" />
              <Input value={assessmentForm.passingMarks} onChange={(event) => setAssessmentForm({ ...assessmentForm, passingMarks: event.target.value })} placeholder="Passing marks" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <CheckboxGroup
                title="Schools"
                items={meta.schools.map((school: any) => ({ value: school._id, label: school.name }))}
                selected={assessmentForm.schoolIds}
                onToggle={(value: string) => setAssessmentForm({ ...assessmentForm, schoolIds: toggleValue(assessmentForm.schoolIds, value) })}
              />
              <CheckboxGroup
                title="Classes"
                items={meta.classes.map((klass: any) => ({ value: klass._id, label: klass.name || [klass.grade, klass.section].filter(Boolean).join(" - ") }))}
                selected={assessmentForm.classSectionIds}
                onToggle={(value: string) => setAssessmentForm({ ...assessmentForm, classSectionIds: toggleValue(assessmentForm.classSectionIds, value) })}
              />
              <CheckboxGroup
                title="Grades"
                items={Array.from({ length: 12 }, (_, index) => ({ value: `Grade ${index + 1}`, label: `Grade ${index + 1}` }))}
                selected={assessmentForm.grades}
                onToggle={(value: string) => setAssessmentForm({ ...assessmentForm, grades: toggleValue(assessmentForm.grades, value) })}
              />
            </div>
            <Textarea value={assessmentForm.instructions} onChange={(event) => setAssessmentForm({ ...assessmentForm, instructions: event.target.value })} placeholder="Instructions shown before attempt" rows={2} />

            <div className="grid gap-2 md:grid-cols-5">
              <Input className="md:col-span-2" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search quiz questions" />
              <NativeSelect value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}><option value="">All types</option>{questionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</NativeSelect>
              <NativeSelect value={filters.lessonId} onChange={(event) => setFilters({ ...filters, lessonId: event.target.value })}><option value="">All lessons</option>{meta.lessons.map((lesson: any) => <option key={lesson._id} value={lesson._id}>{lesson.title}</option>)}</NativeSelect>
              <Button variant="outline" onClick={() => setSelectedQuestionIds(filteredQuestions.map((question) => question._id))}>Select All</Button>
            </div>

            <div className="max-h-[430px] overflow-auto rounded-[14px] border border-black/[0.08]">
              <Table>
                <TableHeader><TableRow><TableHead className="w-10">Use</TableHead><TableHead>Question</TableHead><TableHead>Type</TableHead><TableHead>Diff</TableHead><TableHead>Marks</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredQuestions.map((question) => (
                    <TableRow key={question._id} className={selectedQuestionIds.includes(question._id) ? "bg-blue-50/70" : "hover:bg-[#f8f7f4]"}>
                      <TableCell><input type="checkbox" checked={selectedQuestionIds.includes(question._id)} onChange={(event) => setSelectedQuestionIds((current) => event.target.checked ? [...current, question._id] : current.filter((id) => id !== question._id))} /></TableCell>
                      <TableCell>{shortText(question.questionText)}</TableCell>
                      <TableCell><Badge variant="outline">{question.type}</Badge></TableCell>
                      <TableCell>{question.difficulty}</TableCell>
                      <TableCell>{question.marks}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteQuestion(question._id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button disabled={!assessmentForm.title.trim() || !selectedQuestionIds.length || actionLoading === "draft"} onClick={() => createAssessment("draft")}>{actionLoading === "draft" ? "Saving..." : "Save Draft"}</Button>
              <Button disabled={!assessmentForm.title.trim() || !selectedQuestionIds.length || actionLoading === "publish-new"} onClick={() => createAssessment("published")}>{actionLoading === "publish-new" ? "Publishing..." : "Publish"}</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rk-card">
          <CardHeader>
            <CardTitle>Selected Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-semibold">{selectedQuestions.length} Questions | {totalMarks} Marks</p>
              <p className="text-slate-500">These questions will appear in the assessment.</p>
            </div>
            <div className="max-h-[360px] space-y-2 overflow-auto">
              {selectedQuestions.map((question, index) => (
                <div key={question._id} className="rounded-lg border border-black/[0.08] bg-white p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p><span className="font-semibold">Q{index + 1}.</span> {shortText(question.questionText, 72)}</p>
                    <button className="text-red-600" onClick={() => setSelectedQuestionIds((current) => current.filter((id) => id !== question._id))}>x</button>
                  </div>
                  <div className="mt-2 flex gap-2 text-xs text-slate-500"><Badge variant="secondary">{question.type}</Badge><span>{question.marks}m</span></div>
                </div>
              ))}
              {!selectedQuestions.length && <div className="rounded-lg border border-dashed border-black/[0.12] py-10 text-center text-sm text-slate-500"><FileQuestion className="mx-auto mb-2 h-6 w-6 text-slate-300" />Select questions from the middle panel.</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rk-card">
        <CardHeader><CardTitle>Assessments</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Course</TableHead><TableHead>Classes</TableHead><TableHead>Status</TableHead><TableHead>Questions</TableHead><TableHead>Attempts</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {assessments.map((assessment) => (
                <TableRow key={assessment._id}>
                  <TableCell className="font-medium">{assessment.title}</TableCell>
                  <TableCell>{assessment.courseId?.name || "-"}</TableCell>
                  <TableCell>{(assessment.classSectionIds || []).map((klass: any) => klass.name).join(", ") || "-"}</TableCell>
                  <TableCell><Badge>{assessment.status}</Badge></TableCell>
                  <TableCell>{assessment.questions?.length || 0}</TableCell>
                  <TableCell>{assessment.totalAttempts || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {assessment.status !== "published" && <Button size="sm" variant="outline" disabled={actionLoading === `publish-${assessment._id}`} onClick={() => publishAssessment(assessment._id)}>{actionLoading === `publish-${assessment._id}` ? "Publishing..." : "Publish"}</Button>}
                      <Button size="sm" variant="outline" onClick={() => viewAssessmentReport(assessment._id)}>Report</Button>
                      <Button size="sm" variant="destructive" disabled={actionLoading === `delete-assessment-${assessment._id}`} onClick={() => deleteAssessment(assessment._id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card id="assessment-report-section" className="rk-card">
        <CardHeader><CardTitle>Reports</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-4 print:hidden">
            <NativeSelect value={reportFilters.testId} onChange={(event) => setReportFilters({ ...reportFilters, testId: event.target.value })}>
              <option value="">All assessments</option>
              {assessments.map((assessment) => <option key={assessment._id} value={assessment._id}>{assessment.title}</option>)}
            </NativeSelect>
            <NativeSelect value={reportFilters.classId} onChange={(event) => setReportFilters({ ...reportFilters, classId: event.target.value })}>
              <option value="">All classes</option>
              {meta.classes.map((klass: any) => <option key={klass._id} value={klass._id}>{klass.name}</option>)}
            </NativeSelect>
            <NativeSelect value={reportFilters.studentId} onChange={(event) => setReportFilters({ ...reportFilters, studentId: event.target.value })}>
              <option value="">All students</option>
              {(reports.studentSummary || []).map((student: any) => <option key={student.studentId || student.student} value={student.studentId}>{student.student}</option>)}
            </NativeSelect>
            <Button variant="outline" onClick={exportReportXlsx}><FileSpreadsheet className="mr-2 h-4 w-4" />Export XLSX</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <Badge className="justify-center py-2">Attempts: {reports.summary?.attempts || 0}</Badge>
            <Badge className="justify-center py-2">Class Average: {reports.summary?.averageScore || 0}%</Badge>
            <Badge className="justify-center py-2">Passed: {reports.summary?.passed || 0}</Badge>
            <Badge className="justify-center py-2">Violations: {reports.summary?.violations || 0}</Badge>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <ReportTable title="Class Wise" rows={reports.classSummary || []} columns={["className", "attempts", "averageScore", "passed"]} />
            <ReportTable title="Student Wise" rows={reports.studentSummary || []} columns={["student", "attempts", "averageScore", "passed"]} />
          </div>
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Assessment</TableHead><TableHead>Marks</TableHead><TableHead>Status</TableHead><TableHead>Violations</TableHead></TableRow></TableHeader>
              <TableBody>
                {reportRows.map((row: any, index: number) => (
                  <TableRow key={row._id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{row.student}</TableCell>
                    <TableCell>{row.className || "-"}</TableCell>
                    <TableCell>{row.test}</TableCell>
                    <TableCell>{row.score} / {row.total} ({row.percentage}%)</TableCell>
                    <TableCell>{row.passed ? "Passed" : row.status}</TableCell>
                    <TableCell>{row.violations}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: any) {
  return (
    <Card className="rk-card">
      <CardContent className="flex items-center justify-between p-4">
        <div><p className="rk-label">{label}</p><p className="text-[28px] font-extrabold tracking-tight">{value}</p></div>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[#1a56db]"><Icon className="h-5 w-5" /></span>
      </CardContent>
    </Card>
  );
}

function CheckboxGroup({ title, items, selected, onToggle }: any) {
  return (
    <div className="rounded-lg border border-black/[0.08] bg-slate-50/80 p-3">
      <p className="rk-label mb-2">{title}</p>
      <div className="max-h-36 space-y-2 overflow-auto pr-1">
        {items.map((item: any) => (
          <label key={item.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(item.value)}
              onChange={() => onToggle(item.value)}
            />
            <span>{item.label}</span>
          </label>
        ))}
        {!items.length && <p className="text-sm text-slate-500">No options found</p>}
      </div>
    </div>
  );
}

function ReportTable({ title, rows, columns }: any) {
  return (
    <div className="rounded-md border">
      <div className="border-b px-3 py-2 text-sm font-semibold">{title}</div>
      <Table>
        <TableHeader><TableRow>{columns.map((column: string) => <TableHead key={column}>{column.replace(/([A-Z])/g, " $1")}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {rows.map((row: any, index: number) => (
            <TableRow key={row.studentId || row.classId || index}>
              {columns.map((column: string) => <TableCell key={column}>{column === "averageScore" ? `${row[column] || 0}%` : row[column] ?? "-"}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function NativeSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`h-[38px] rounded-lg border border-black/[0.12] bg-white px-3 text-sm ${props.className || ""}`} />;
}
