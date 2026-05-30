import { useEffect, useMemo, useState } from "react";
import { Code, Search, Trophy } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import AdminShell from "@/components/layout/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LessonReport = {
  lessonId: string;
  title: string;
  questionCount: number;
  completedStudents: number;
  totalStudents: number;
  attempts: number;
  avgBestScore: number;
};

type LessonProgress = {
  lessonId: string;
  lessonTitle: string;
  completed: boolean;
  quizAvailable: boolean;
  questionCount: number;
  attempts: number;
  bestScore: number;
  lastAttemptScore: number;
};

type StudentReport = {
  studentId: string;
  username: string;
  active: boolean;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  avgQuizScore: number;
  quizAttempts: number;
  codeRunCount: number;
  lessonProgress: LessonProgress[];
};

type ProgressReport = {
  lessons: LessonReport[];
  students: StudentReport[];
  summary: {
    totalStudents: number;
    totalLessons: number;
    totalCodeRuns: number;
    totalQuizAttempts: number;
  };
};

const emptyReport: ProgressReport = {
  lessons: [],
  students: [],
  summary: { totalStudents: 0, totalLessons: 0, totalCodeRuns: 0, totalQuizAttempts: 0 }
};

function scoreBadge(score: number, attempts: number) {
  if (!attempts) return <Badge variant="secondary">Not attempted</Badge>;
  if (score < 60) return <Badge variant="destructive">{score}%</Badge>;
  if (score < 85) return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{score}%</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{score}%</Badge>;
}

export default function AdminProgressPage() {
  const { token } = useAuth();
  const [report, setReport] = useState<ProgressReport>(emptyReport);
  const [search, setSearch] = useState("");
  const [lessonFilter, setLessonFilter] = useState("all");

  useEffect(() => {
    apiFetch("/admin/progress", {}, token).then(setReport);
  }, [token]);

  const selectedLesson = useMemo(
    () => report.lessons.find((lesson) => lesson.lessonId === lessonFilter),
    [report.lessons, lessonFilter]
  );

  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase();
    return report.students
      .filter((student) => student.username.toLowerCase().includes(query))
      .map((student) => ({
        ...student,
        visibleLessons:
          lessonFilter === "all"
            ? student.lessonProgress
            : student.lessonProgress.filter((lesson) => lesson.lessonId === lessonFilter)
      }));
  }, [report.students, search, lessonFilter]);

  const focusCount = useMemo(
    () => filteredStudents.filter((student) => student.visibleLessons.some((lesson) => lesson.attempts > 0 && lesson.bestScore < 60)).length,
    [filteredStudents]
  );

  return (
    <AdminShell title="Lesson Progress" subtitle="Review each student's lesson completion, quiz scores, and code runs">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Students</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{report.summary.totalStudents}</CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Lessons</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{report.summary.totalLessons}</CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Quiz Attempts</CardTitle>
            <Trophy className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="text-3xl font-bold">{report.summary.totalQuizAttempts}</CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Code Runs</CardTitle>
            <Code className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="text-3xl font-bold">{report.summary.totalCodeRuns}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3 mt-4">
        <Card className="rounded-2xl shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Student Lesson Tracker</CardTitle>
            <div className="flex flex-col gap-2 md:flex-row md:w-auto w-full">
              <div className="relative md:w-64">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student" className="pl-9" />
              </div>
              <Select value={lessonFilter} onValueChange={setLessonFilter}>
                <SelectTrigger className="md:w-64">
                  <SelectValue placeholder="All lessons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All lessons</SelectItem>
                  {report.lessons.map((lesson) => (
                    <SelectItem key={lesson.lessonId} value={lesson.lessonId}>{lesson.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Lesson Progress</TableHead>
                  <TableHead>Quiz Performance By Section</TableHead>
                  <TableHead>Code Runs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell className="font-medium">
                      <div>{student.username}</div>
                      <Badge variant={student.active ? "secondary" : "outline"} className="mt-1">
                        {student.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-48">
                      <p className="text-sm mb-1">{student.completedLessons}/{student.totalLessons} completed</p>
                      <Progress value={student.progressPercentage} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">Overall {student.progressPercentage}%</p>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {student.visibleLessons.map((lesson) => (
                          <div key={lesson.lessonId} className="rounded-lg border p-2 bg-white/60 dark:bg-slate-950/30">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-medium">{lesson.lessonTitle}</span>
                              {scoreBadge(lesson.bestScore, lesson.attempts)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {lesson.completed ? "Completed" : "Not completed"} · {lesson.attempts} attempts · Last {lesson.lastAttemptScore}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{student.codeRunCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{selectedLesson ? "Selected Lesson Summary" : "Lesson Summary"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(selectedLesson ? [selectedLesson] : report.lessons).map((lesson) => {
              const completion = lesson.totalStudents ? Math.round((lesson.completedStudents / lesson.totalStudents) * 100) : 0;
              return (
                <div key={lesson.lessonId} className="rounded-xl border p-3 bg-white/60 dark:bg-slate-950/30">
                  <p className="font-medium">{lesson.title}</p>
                  <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                    <p>{lesson.completedStudents}/{lesson.totalStudents} students completed</p>
                    <Progress value={completion} className="h-2" />
                    <p>{lesson.questionCount} questions · {lesson.attempts} attempts · Avg best score {lesson.avgBestScore}%</p>
                  </div>
                </div>
              );
            })}
            <div className="rounded-xl border p-3 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
              <p className="text-sm font-medium">Needs attention</p>
              <p className="text-2xl font-bold">{focusCount}</p>
              <p className="text-xs">Students have at least one visible lesson quiz score below 60%.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
