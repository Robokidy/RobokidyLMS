import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, BookOpen, Code, FileText, GraduationCap, LogOut, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import DarkModeToggle from "@/components/layout/DarkModeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getStudentNavItems, studentDefaultModules } from "@/lib/studentNav";

type Stats = { totalLessons: number; completedLessons: number; quizAttempts: number; codeRunCount: number };

const gradeLabels: Record<string, string> = {
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

export default function StudentLmsShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { token, user, logout } = useAuth();
  const location = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [enabledModules, setEnabledModules] = useState<string[]>(studentDefaultModules);

  useEffect(() => {
    if (!token) {
      setStats(null);
      setEnabledModules(studentDefaultModules);
      return;
    }

    apiFetch("/student/dashboard", {}, token)
      .then((data) => {
        setStats(data);
        setEnabledModules(Array.isArray(data?.enabledModules) && data.enabledModules.length ? data.enabledModules : studentDefaultModules);
      })
      .catch(() => {
        setStats(null);
        setEnabledModules(studentDefaultModules);
      });
  }, [token]);

  const completion = stats?.totalLessons ? Math.round(((stats.completedLessons || 0) / stats.totalLessons) * 100) : 0;
  const currentGrade = gradeLabels[user?.grade || "grade1"] || "Grade 1";

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_32%)]" />
      <header className="sticky top-0 z-40 border-b border-white/30 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold">Robokidy Learn</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Premium student workspace</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {getStudentNavItems(enabledModules).map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-950"
                      : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70 md:flex">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-bold text-white">
                {user?.username?.slice(0, 2).toUpperCase() || "ST"}
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight">{user?.username}</p>
                <p className="text-[11px] text-slate-500">{currentGrade}</p>
              </div>
            </div>
            <Button variant="outline" size="icon" className="rounded-full bg-white/70 dark:bg-slate-900/70">
              <Bell className="h-4 w-4" />
            </Button>
            <DarkModeToggle />
            <Button variant="destructive" size="icon" className="rounded-full" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <section className="mb-6 overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Student Workspace</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
            </div>
            <div className="grid min-w-72 gap-2 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Course completion</span>
                <span className="font-bold">{completion}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500" style={{ width: `${completion}%` }} />
              </div>
            </div>
          </div>
        </section>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "Lessons", value: stats?.totalLessons ?? "-", icon: BookOpen },
            { label: "Completed", value: stats?.completedLessons ?? "-", icon: ShieldCheck },
            { label: "Quiz Attempts", value: stats?.quizAttempts ?? "-", icon: GraduationCap },
            { label: "Code Runs", value: stats?.codeRunCount ?? "-", icon: Code }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-white/60 bg-white/80 shadow-lg shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
                <CardContent className="p-5">
                  <Icon className="mb-3 h-5 w-5 text-cyan-600" />
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {children}
      </main>
    </div>
  );
}
