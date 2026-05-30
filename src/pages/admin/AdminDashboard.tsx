import { useEffect, useMemo, useState } from "react";
import { Activity, Code, GraduationCap, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import AdminShell from "@/components/layout/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const cardDefs = [
  { key: "totalStudents", label: "Total Students", icon: Users },
  { key: "activeStudents", label: "Active Students", icon: GraduationCap },
  { key: "totalQuizAttempts", label: "Quiz Attempts", icon: Activity },
  { key: "totalCodeRuns", label: "Code Runs", icon: Code }
];

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/admin/dashboard", {}, token).then(setStats);
    apiFetch("/admin/analytics", {}, token).then((d) => setAnalytics(d.analytics || []));
  }, [token]);

  const chartData = useMemo(
    () => analytics.slice(0, 8).map((a) => ({ name: a.username, progress: a.progressPercentage, quiz: a.avgQuizScore })),
    [analytics]
  );

  return (
    <AdminShell title="Admin Dashboard" subtitle="Overview of learners, engagement, and assessment activity">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cardDefs.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.key} className="rounded-2xl shadow-sm border-blue-100/60 dark:border-slate-800">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground">{card.label}</CardTitle>
                <span className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 grid place-items-center">
                  <Icon className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats?.[card.key] ?? "-"}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3 mt-4">
        <Card className="xl:col-span-2 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Student Performance Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide={chartData.length > 6} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="progress" fill="#2563eb" radius={[8, 8, 0, 0]} />
                <Bar dataKey="quiz" fill="#7c3aed" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>Top Focus List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics
              .slice()
              .sort((a, b) => a.progressPercentage - b.progressPercentage)
              .slice(0, 6)
              .map((s) => (
                <div key={s.studentId} className="p-3 rounded-xl border bg-white/60 dark:bg-slate-900/40">
                  <p className="font-medium">{s.username}</p>
                  <p className="text-sm text-muted-foreground">Progress {s.progressPercentage}% � Avg Quiz {s.avgQuizScore}%</p>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
