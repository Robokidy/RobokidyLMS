import { useEffect, useState } from "react";
import { BookOpen, Code, CreditCard, GraduationCap, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import StudentLmsShell from "@/components/layout/StudentLmsShell";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

function formatCurrency(amount: any, currency = "INR") {
  return `${currency === "INR" ? "Rs." : currency} ${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function feeLabel(status?: string) {
  return (status || "pending").split("-").map((part) => part.replace(/^\w/, (value) => value.toUpperCase())).join(" ");
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

  return (
    <StudentLmsShell title="Student Dashboard" subtitle="Your learning activity, progress, and practice summary in one place.">
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
    </StudentLmsShell>
  );
}
