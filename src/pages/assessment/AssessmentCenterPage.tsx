/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, ClipboardList, FileQuestion, Plus, Search } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import AdminShell from "@/components/layout/AdminShell";
import StudentLmsShell from "@/components/layout/StudentLmsShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const testTypes = [
  { value: "quiz", label: "Quiz" },
  { value: "assignment", label: "Assignment Test" },
  { value: "practice", label: "Practice Test" },
  { value: "mock-exam", label: "Mock Exam" },
  { value: "coding", label: "Coding Assessment" }
];

const questionTypes = [
  { value: "mcq", label: "MCQ" },
  { value: "multi-select", label: "Multi-select" },
  { value: "true-false", label: "True/False" },
  { value: "fill-blank", label: "Fill blank" },
  { value: "coding", label: "Coding" },
  { value: "descriptive", label: "Descriptive" },
  { value: "image-based", label: "Image-based" },
  { value: "match-following", label: "Match following" }
];

const emptyQuestionForm = {
  questionText: "",
  type: "mcq",
  difficulty: "medium",
  marks: "1",
  tags: "",
  topic: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "A",
  blankAnswer: "",
  matchLeft: "",
  matchRight: "",
  templateCode: "",
  sampleInput: "",
  sampleOutput: "",
  hiddenInput: "",
  hiddenOutput: ""
};

function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role === "admin") {
    return <AdminShell title="Assessment Center" subtitle="Question bank, tests, secure exam mode, results, and analytics in one place.">{children}</AdminShell>;
  }
  if (user?.role === "student") {
    return <StudentLmsShell title="Assessment Center" subtitle="View assigned quizzes, tests, coding assessments, and approved results.">{children}</StudentLmsShell>;
  }
  return <div className="space-y-6">{children}</div>;
}

export default function AssessmentCenterPage() {
  const { token, user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [reports, setReports] = useState<any>({ rows: [], summary: {} });
  const [meta, setMeta] = useState<any>({ courses: [], classes: [] });
  const [summary, setSummary] = useState<any>({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [testForm, setTestForm] = useState({ title: "", testType: "quiz", courseId: "", classSectionId: "", duration: "30", passingMarks: "", status: "draft" });
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const isStaff = user?.role === "admin" || user?.role === "teacher";

  const load = async () => {
    const [questionRows, testRows, reportData, metaData, summaryData] = await Promise.all([
      apiFetch("/assessments/questions", {}, token),
      apiFetch("/assessments/tests", {}, token),
      apiFetch("/assessments/reports", {}, token),
      apiFetch("/assessments/meta", {}, token),
      apiFetch("/assessments/summary", {}, token)
    ]);
    setQuestions(questionRows || []);
    setTests(testRows || []);
    setReports(reportData || { rows: [], summary: {} });
    setMeta(metaData || { courses: [], classes: [] });
    setSummary(summaryData || {});
  };

  useEffect(() => {
    if (token) load().catch(() => undefined);
  }, [token]);

  const filteredQuestions = useMemo(() => {
    const query = search.toLowerCase();
    return questions.filter((question) => `${question.questionText} ${question.type} ${question.topic} ${(question.tags || []).join(" ")}`.toLowerCase().includes(query));
  }, [questions, search]);

  const createQuestion = async () => {
    setError("");
    const optionFields = [questionForm.optionA, questionForm.optionB, questionForm.optionC, questionForm.optionD];
    if (!questionForm.questionText.trim()) {
      setError("Question is required.");
      return;
    }
    if (questionForm.type === "mcq") {
      const missingOption = optionFields.some((option) => !option.trim());
      if (missingOption) {
        setError("MCQ questions require Option A, Option B, Option C, and Option D.");
        return;
      }
      if (!questionForm.correctOption) {
        setError("MCQ questions require a correct answer.");
        return;
      }
    }
    const objectiveOptions = optionFields
      .map((text, index) => ({ optionId: String.fromCharCode(65 + index), text: text.trim(), isCorrect: questionForm.correctOption === String.fromCharCode(65 + index) }))
      .filter((option) => option.text);
    try {
      await apiFetch("/assessments/questions", {
        method: "POST",
        body: JSON.stringify({
          ...questionForm,
          marks: Number(questionForm.marks || 1),
          tags: questionForm.tags,
          options: ["mcq", "multi-select", "true-false"].includes(questionForm.type) ? objectiveOptions : [],
          blanks: questionForm.type === "fill-blank" && questionForm.blankAnswer.trim()
            ? [{ blankId: "blank-1", correctAnswer: questionForm.blankAnswer.trim(), acceptableVariations: [] }]
            : [],
          matchingPairs: questionForm.type === "match-following" && questionForm.matchLeft.trim() && questionForm.matchRight.trim()
            ? [{ leftId: "left-1", leftText: questionForm.matchLeft.trim(), rightId: "right-1", rightText: questionForm.matchRight.trim() }]
            : [],
          codingConfig: questionForm.type === "coding" ? {
            language: "python",
            templateCode: questionForm.templateCode || "def solve():\n    pass\n",
            testCases: [
              ...(questionForm.sampleInput || questionForm.sampleOutput ? [{ input: questionForm.sampleInput, expectedOutput: questionForm.sampleOutput, isHidden: false }] : []),
              ...(questionForm.hiddenInput || questionForm.hiddenOutput ? [{ input: questionForm.hiddenInput, expectedOutput: questionForm.hiddenOutput, isHidden: true }] : [])
            ]
          } : undefined
        })
      }, token);
      setQuestionForm(emptyQuestionForm);
      load();
    } catch (err: any) {
      setError(err.message || "Could not create question");
    }
  };

  const createTest = async () => {
    setError("");
    try {
      await apiFetch("/assessments/tests", {
        method: "POST",
        body: JSON.stringify({
          ...testForm,
          duration: Number(testForm.duration || 30),
          classSectionIds: testForm.classSectionId ? [testForm.classSectionId] : [],
          questionIds: selectedQuestionIds
        })
      }, token);
      setTestForm({ title: "", testType: "quiz", courseId: "", classSectionId: "", duration: "30", passingMarks: "", status: "draft" });
      setSelectedQuestionIds([]);
      load();
    } catch (err: any) {
      setError(err.message || "Could not create test");
    }
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Questions", value: summary.questions || 0, icon: FileQuestion },
            { label: "Tests", value: summary.tests || 0, icon: ClipboardList },
            { label: "Attempts", value: summary.attempts || 0, icon: BarChart3 },
            { label: "Violations", value: summary.violations || 0, icon: Search }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="rounded-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">{item.label}</CardTitle>
                  <Icon className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent className="text-3xl font-bold">{item.value}</CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue={user?.role === "student" ? "tests" : "bank"} className="space-y-4">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <TabsList>
            {isStaff && <TabsTrigger value="bank">Assessment Bank</TabsTrigger>}
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          {isStaff && (
            <TabsContent value="bank" className="space-y-4">
              <Card className="rounded-lg">
                <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle>Question Bank</CardTitle>
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions" className="md:w-72" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-6">
                    <Input className="md:col-span-2" value={questionForm.questionText} onChange={(event) => setQuestionForm({ ...questionForm, questionText: event.target.value })} placeholder="Question text" />
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={questionForm.type} onChange={(event) => setQuestionForm({ ...questionForm, type: event.target.value })}>{questionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={questionForm.difficulty} onChange={(event) => setQuestionForm({ ...questionForm, difficulty: event.target.value })}>{["easy", "medium", "hard"].map((item) => <option key={item} value={item}>{item}</option>)}</select>
                    <Input value={questionForm.marks} onChange={(event) => setQuestionForm({ ...questionForm, marks: event.target.value })} placeholder="Marks" />
                    <Button disabled={!questionForm.questionText.trim() || (questionForm.type === "mcq" && (!questionForm.optionA.trim() || !questionForm.optionB.trim() || !questionForm.optionC.trim() || !questionForm.optionD.trim() || !questionForm.correctOption))} onClick={createQuestion}><Plus className="mr-2 h-4 w-4" />Add</Button>
                  </div>
                  {["mcq", "multi-select", "true-false"].includes(questionForm.type) && (
                    <div className="grid gap-3 md:grid-cols-5">
                      {["A", "B", "C", "D"].map((key) => (
                        <Input
                          key={key}
                          value={(questionForm as any)[`option${key}`]}
                          onChange={(event) => setQuestionForm({ ...questionForm, [`option${key}`]: event.target.value })}
                          placeholder={`Option ${key}`}
                        />
                      ))}
                      <select className="h-10 rounded-md border bg-background px-3 text-sm" value={questionForm.correctOption} onChange={(event) => setQuestionForm({ ...questionForm, correctOption: event.target.value })}>
                        {["A", "B", "C", "D"].map((key) => <option key={key} value={key}>Correct {key}</option>)}
                      </select>
                    </div>
                  )}
                  {questionForm.type === "fill-blank" && (
                    <Input value={questionForm.blankAnswer} onChange={(event) => setQuestionForm({ ...questionForm, blankAnswer: event.target.value })} placeholder="Correct blank answer" />
                  )}
                  {questionForm.type === "match-following" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input value={questionForm.matchLeft} onChange={(event) => setQuestionForm({ ...questionForm, matchLeft: event.target.value })} placeholder="Left item" />
                      <Input value={questionForm.matchRight} onChange={(event) => setQuestionForm({ ...questionForm, matchRight: event.target.value })} placeholder="Matching right item" />
                    </div>
                  )}
                  {questionForm.type === "coding" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <textarea className="h-32 rounded-md border bg-slate-950 p-3 font-mono text-sm text-slate-50" value={questionForm.templateCode} onChange={(event) => setQuestionForm({ ...questionForm, templateCode: event.target.value })} placeholder="Python starter code" />
                      <div className="grid gap-2">
                        <Input value={questionForm.sampleInput} onChange={(event) => setQuestionForm({ ...questionForm, sampleInput: event.target.value })} placeholder="Visible test input" />
                        <Input value={questionForm.sampleOutput} onChange={(event) => setQuestionForm({ ...questionForm, sampleOutput: event.target.value })} placeholder="Visible expected output" />
                        <Input value={questionForm.hiddenInput} onChange={(event) => setQuestionForm({ ...questionForm, hiddenInput: event.target.value })} placeholder="Hidden test input" />
                        <Input value={questionForm.hiddenOutput} onChange={(event) => setQuestionForm({ ...questionForm, hiddenOutput: event.target.value })} placeholder="Hidden expected output" />
                      </div>
                    </div>
                  )}
                  <Table>
                    <TableHeader><TableRow><TableHead className="w-10">Use</TableHead><TableHead>Question</TableHead><TableHead>Type</TableHead><TableHead>Difficulty</TableHead><TableHead>Marks</TableHead><TableHead>Tags</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredQuestions.map((question) => (
                        <TableRow key={question._id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedQuestionIds.includes(question._id)}
                              onChange={(event) => setSelectedQuestionIds((current) => event.target.checked ? [...current, question._id] : current.filter((id) => id !== question._id))}
                              aria-label={`Select ${question.questionText}`}
                            />
                          </TableCell>
                          <TableCell>{question.questionText}</TableCell>
                          <TableCell><Badge variant="secondary">{question.type}</Badge></TableCell>
                          <TableCell>{question.difficulty}</TableCell>
                          <TableCell>{question.marks}</TableCell>
                          <TableCell>{(question.tags || []).join(", ") || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="tests" className="space-y-4">
            <Card className="rounded-lg">
              <CardHeader><CardTitle>{isStaff ? "Test Management" : "Assigned Tests"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {isStaff && (
                  <div className="grid gap-3 md:grid-cols-6">
                    <Input className="md:col-span-2" value={testForm.title} onChange={(event) => setTestForm({ ...testForm, title: event.target.value })} placeholder="Test title" />
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={testForm.testType} onChange={(event) => setTestForm({ ...testForm, testType: event.target.value })}>{testTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={testForm.courseId} onChange={(event) => setTestForm({ ...testForm, courseId: event.target.value })}><option value="">Course</option>{meta.courses.map((course: any) => <option key={course._id} value={course._id}>{course.name}</option>)}</select>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={testForm.classSectionId} onChange={(event) => setTestForm({ ...testForm, classSectionId: event.target.value })}><option value="">Class</option>{meta.classes.map((klass: any) => <option key={klass._id} value={klass._id}>{klass.name}</option>)}</select>
                    <Button disabled={!testForm.title.trim()} onClick={createTest}><Plus className="mr-2 h-4 w-4" />Create</Button>
                    <div className="md:col-span-6 text-xs text-muted-foreground">{selectedQuestionIds.length} selected from the Assessment Bank.</div>
                  </div>
                )}
                <Table>
                  <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Course</TableHead><TableHead>Class</TableHead><TableHead>Status</TableHead><TableHead>Questions</TableHead>{!isStaff && <TableHead className="text-right">Action</TableHead>}</TableRow></TableHeader>
                  <TableBody>
                    {tests.map((test) => (
                      <TableRow key={test._id}>
                        <TableCell className="font-medium">{test.title}</TableCell>
                        <TableCell>{testTypes.find((type) => type.value === test.testType)?.label || test.testType}</TableCell>
                        <TableCell>{test.courseId?.name || "-"}</TableCell>
                        <TableCell>{(test.classSectionIds || []).map((klass: any) => klass.name).join(", ") || "-"}</TableCell>
                        <TableCell><Badge>{test.status}</Badge></TableCell>
                        <TableCell>{test.questions?.length || 0}</TableCell>
                        {!isStaff && <TableCell className="text-right"><Button asChild size="sm"><Link to={`/student/tests/${test._id}`}>Attempt</Link></Button></TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card className="rounded-lg">
              <CardHeader><CardTitle>Reports & Analytics</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <Badge className="justify-center py-2">Attempts: {reports.summary?.attempts || 0}</Badge>
                  <Badge className="justify-center py-2">Average: {reports.summary?.averageScore || 0}%</Badge>
                  <Badge className="justify-center py-2">Passed: {reports.summary?.passed || 0}</Badge>
                  <Badge className="justify-center py-2">Violations: {reports.summary?.violations || 0}</Badge>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Assessment</TableHead><TableHead>Type</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead>Violations</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(reports.rows || []).map((row: any) => (
                      <TableRow key={row._id}>
                        <TableCell>{row.student}</TableCell>
                        <TableCell>{row.test}</TableCell>
                        <TableCell>{row.type}</TableCell>
                        <TableCell>{row.score} / {row.total} ({row.percentage}%)</TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{row.violations}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}
