import { useEffect, useState } from "react";
import { BookOpen, Code, GraduationCap, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import StudentLmsShell from "@/components/layout/StudentLmsShell";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
    </StudentLmsShell>
  );
}
