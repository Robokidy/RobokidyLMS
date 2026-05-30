import { useEffect, useMemo, useState } from "react";
import { Activity, Building2, CalendarCheck, Code, CreditCard, GraduationCap, ShieldCheck, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import AdminShell from "@/components/layout/AdminShell";
import GlobalFilters, { filtersToQuery, readStoredFilters, type GlobalFilterState } from "@/components/admin/GlobalFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const cardDefs = [
  { key: "totalSchools", label: "Schools", icon: Building2 },
  { key: "totalTeachers", label: "Teachers", icon: ShieldCheck },
  { key: "totalStudents", label: "Students", icon: Users },
  { key: "activeStudents", label: "Active Students", icon: GraduationCap },
  { key: "pendingFees", label: "Pending Fees", icon: CreditCard },
  { key: "attendancePercentage", label: "Attendance", icon: CalendarCheck },
  { key: "totalQuizAttempts", label: "Quiz Attempts", icon: Activity },
  { key: "totalCodeRuns", label: "Code Runs", icon: Code }
];

export default function CeoDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [options, setOptions] = useState<any>({});
  const [filters, setFilters] = useState<GlobalFilterState>(() => readStoredFilters("learnpy-ceo-dashboard-filters"));

  useEffect(() => {
    const query = filtersToQuery(filters);
    apiFetch(`/admin/dashboard${query}`, {}, token).then(setStats);
    apiFetch(`/admin/analytics${query}`, {}, token).then((data) => setAnalytics(data.analytics || []));
  }, [token, filters]);

  useEffect(() => {
    apiFetch("/admin/filter-options", {}, token).then(setOptions).catch(() => undefined);
  }, [token]);

  const chartData = useMemo(
    () => analytics.slice(0, 8).map((row) => ({ name: row.username, progress: row.progressPercentage, quiz: row.avgQuizScore })),
    [analytics]
  );

  return (
    <AdminShell title="CEO Dashboard" subtitle="Central command for schools, teachers, students, fees, attendance, coding, and secure learning">
      <GlobalFilters filters={filters} setFilters={setFilters} options={options} storageKey="learnpy-ceo-dashboard-filters" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cardDefs.map((card) => {
          const Icon = card.icon;
          const raw = stats?.[card.key];
          const value = card.key === "pendingFees" ? `Rs. ${Number(raw || 0).toLocaleString()}` : card.key === "attendancePercentage" ? `${raw ?? 0}%` : raw ?? "-";
          return (
            <Card key={card.key} className="rounded-lg shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">{card.label}</CardTitle>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  <Icon className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="rounded-lg xl:col-span-2">
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
                <Bar dataKey="progress" fill="#2563eb" radius={[6, 6, 0, 0]} />
                <Bar dataKey="quiz" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Recent Audit Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats?.recentActivities || []).map((activity: any, index: number) => (
              <div key={`${activity.action}-${index}`} className="rounded-lg border bg-white/60 p-3 dark:bg-slate-900/40">
                <p className="font-medium capitalize">{String(activity.action).replaceAll("_", " ")}</p>
                <p className="text-xs text-muted-foreground">{activity.username} - {new Date(activity.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
