import { useEffect, useState } from "react";
import { BarChart3, BookOpen, CalendarCheck, Code, CreditCard, GraduationCap, ShieldCheck, Users } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import StudentLmsShell from "@/components/layout/StudentLmsShell";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatCurrency(amount: any, currency = "INR") {
  return `${currency === "INR" ? "Rs." : currency} ${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function feeLabel(status?: string) {
  return (status || "pending").split("-").map((part) => part.replace(/^\w/, (value) => value.toUpperCase())).join(" ");
}

function displayGrade(value?: string) {
  const labels: Record<string, string> = {
    grade1: "Grade 1",
    grade2: "Grade 2",
    grade3: "Grade 3",
    grade4: "Grade 4",
    grade5: "Grade 5",
    grade6: "Grade 6",
    grade7: "Grade 7",
    grade8: "Grade 8",
    grade9: "Grade 9",
    grade10: "Grade 10"
  };
  return value ? labels[value] || value : "-";
}

export default function StudentDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => { apiFetch("/student/dashboard", {}, token).then(setStats); }, [token]);

  const pct = stats ? Math.round((stats.completedLessons / Math.max(stats.totalLessons, 1)) * 100) : 0;
  const cards = [
    { label: "Total Lessons", value: stats?.totalLessons ?? "-", icon: BookOpen },
    { label: "Completed", value: stats?.completedLessons ?? "-", icon: ShieldCheck },
    { label: "Quiz Attempts", value: stats?.quizAttempts ?? "-", icon: GraduationCap },
    { label: "Code Runs", value: stats?.codeRunCount ?? "-", icon: Code }
  ];
  const fee = stats?.feeAccount;
  const attendance = stats?.attendance;
  const reports = stats?.assessmentReports;
  const profile = stats?.studentProfile;

  return (
    <StudentLmsShell title="Student Dashboard" subtitle="Your learning activity, progress, and practice summary in one place.">
      <Card className="mb-5 border-white/60 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
        <CardContent className="grid gap-4 p-6 md:grid-cols-3">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-cyan-600" />
            <div><p className="text-sm text-slate-500">Grade</p><p className="text-xl font-bold">{displayGrade(profile?.grade)}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-cyan-600" />
            <div><p className="text-sm text-slate-500">Class</p><p className="text-xl font-bold">{profile?.className || "-"}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-cyan-600" />
            <div><p className="text-sm text-slate-500">Teacher</p><p className="text-xl font-bold">{profile?.teacherNames?.join(", ") || "-"}</p></div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-white/60 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
              <CardContent className="p-6">
                <Icon className="mb-4 h-6 w-6 text-cyan-600" />
                <p className="text-3xl font-bold">{card.value}</p>
                <p className="text-sm text-slate-500">{card.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="mt-5 border-white/60 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
        <CardContent className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Overall Progress</p>
            <p className="text-sm font-bold text-cyan-600">{pct}%</p>
          </div>
          <Progress value={pct} />
        </CardContent>
      </Card>
      {attendance && (
        <Card className="mt-5 border-white/60 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-cyan-600" />
                <p className="font-semibold">My Attendance</p>
              </div>
              <Badge>{attendance.percentage || 0}%</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div><p className="text-sm text-slate-500">Total Records</p><p className="text-xl font-bold">{attendance.total || 0}</p></div>
              <div><p className="text-sm text-slate-500">Present</p><p className="text-xl font-bold text-emerald-600">{attendance.present || 0}</p></div>
              <div><p className="text-sm text-slate-500">Absent</p><p className="text-xl font-bold text-red-600">{attendance.absent || 0}</p></div>
              <div><p className="text-sm text-slate-500">Late</p><p className="text-xl font-bold text-orange-600">{attendance.late || 0}</p></div>
            </div>
          </CardContent>
        </Card>
      )}
      {fee && (
        <Card className="mt-5 border-white/60 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-cyan-600" />
                <p className="font-semibold">My Fees</p>
              </div>
              <Badge variant={fee.status === "paid" ? "default" : "secondary"}>{feeLabel(fee.status)}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div><p className="text-sm text-slate-500">Total Fee</p><p className="text-xl font-bold">{formatCurrency(fee.totalFees, fee.currency)}</p></div>
              <div><p className="text-sm text-slate-500">Paid Amount</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(fee.paidAmount, fee.currency)}</p></div>
              <div><p className="text-sm text-slate-500">Pending Amount</p><p className="text-xl font-bold text-orange-600">{formatCurrency(fee.pendingAmount, fee.currency)}</p></div>
              <div><p className="text-sm text-slate-500">Due Date</p><p className="text-xl font-bold">{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : "-"}</p></div>
            </div>
            {!!fee.payments?.length && (
              <div className="mt-5 space-y-2">
                <p className="text-sm font-semibold">Payment History</p>
                {fee.payments.map((payment: any, index: number) => (
                  <div key={payment._id || index} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <span>{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : "-"}</span>
                    <span>{formatCurrency(payment.amount, fee.currency)}</span>
                    <span className="capitalize text-slate-500">{payment.method || "cash"}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {reports && (
        <Card className="mt-5 border-white/60 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-cyan-600" />
                <p className="font-semibold">Assessment Reports</p>
              </div>
              <Badge>{reports.averageScore || 0}% average</Badge>
            </div>
            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <div><p className="text-sm text-slate-500">Attempts</p><p className="text-xl font-bold">{reports.attempts || 0}</p></div>
              <div><p className="text-sm text-slate-500">Passed</p><p className="text-xl font-bold text-emerald-600">{reports.passed || 0}</p></div>
              <div><p className="text-sm text-slate-500">Average Score</p><p className="text-xl font-bold">{reports.averageScore || 0}%</p></div>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Assessment</TableHead><TableHead>Type</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {(reports.rows || []).map((row: any) => (
                  <TableRow key={row._id}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.score} / {row.total} ({row.percentage}%)</TableCell>
                    <TableCell><Badge variant={row.passed ? "default" : "secondary"}>{row.status}</Badge></TableCell>
                    <TableCell>{row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </StudentLmsShell>
  );
}
