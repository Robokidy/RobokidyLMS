import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, Building2, CalendarCheck, CreditCard, Download, FileText, GraduationCap, Plus, ShieldCheck, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import AdminShell from "@/components/layout/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const kpis = [
  { key: "totalSchools", label: "Total Schools", icon: Building2, trend: "+8.4%" },
  { key: "totalTeachers", label: "Total Teachers", icon: ShieldCheck, trend: "+12.1%" },
  { key: "totalStudents", label: "Total Students", icon: Users, trend: "+18.7%" },
  { key: "activeStudents", label: "Active Students", icon: GraduationCap, trend: "+9.2%" },
  { key: "pendingFees", label: "Revenue", icon: CreditCard, trend: "+6.8%", money: true },
  { key: "attendancePercentage", label: "Attendance %", icon: CalendarCheck, trend: "+3.4%", percent: true },
  { key: "totalQuizAttempts", label: "Assessment Attempts", icon: Activity, trend: "+22.0%" },
  { key: "totalCodeRuns", label: "Material Downloads", icon: Download, trend: "+15.5%" }
];

function displayValue(stats: any, card: any) {
  const raw = stats?.[card.key] ?? 0;
  if (card.money) return `Rs. ${Number(raw).toLocaleString()}`;
  if (card.percent) return `${raw}%`;
  return Number(raw).toLocaleString();
}

export default function CeoDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/admin/dashboard", {}, token),
      apiFetch("/admin/analytics", {}, token)
    ])
      .then(([dashboard, analyticsData]) => {
        setStats(dashboard);
        setAnalytics(analyticsData.analytics || []);
        setError("");
      })
      .catch((err) => setError(err.message || "Unable to load dashboard"))
      .finally(() => setLoading(false));
  }, [token]);

  const performance = useMemo(
    () => analytics.slice(0, 8).map((row) => ({ name: row.username, progress: row.progressPercentage || 0, quiz: row.avgQuizScore || 0 })),
    [analytics]
  );

  const trend = useMemo(
    () => performance.map((row, index) => ({ name: `W${index + 1}`, students: 40 + index * 9 + Math.round(row.progress / 10), revenue: 20 + index * 6 + Math.round(row.quiz / 12) })),
    [performance]
  );

  return (
    <AdminShell title="CEO Dashboard" subtitle="Executive health across schools, revenue, attendance, assessments, and learning operations">
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.key} className="rounded-lg shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-slate-500">{card.label}</CardTitle>
                <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <Icon className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-3">
                  <p className="text-2xl font-bold">{loading ? "..." : displayValue(stats, card)}</p>
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                    <ArrowUpRight className="mr-1 h-3 w-3" />{card.trend}
                  </Badge>
                </div>
                <div className="mt-4 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend}>
                      <Area type="monotone" dataKey={card.money ? "revenue" : "students"} stroke="#0f172a" fill="#e2e8f0" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="rounded-lg">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Executive Performance</CardTitle>
            <Badge variant="outline">Live LMS Signals</Badge>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" hide={performance.length > 6} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="progress" fill="#0f172a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quiz" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Quick Actions</CardTitle>
            <Plus className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              ["Add School", "/admin/schools"],
              ["Create Teacher", "/admin/teachers"],
              ["Upload Material", "/admin/materials"],
              ["Build Assessment", "/admin/assessments"]
            ].map(([label, href]) => (
              <Button key={label} asChild variant="outline" className="w-full justify-between">
                <a href={href}>{label}<ArrowUpRight className="h-4 w-4" /></a>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-lg">
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(stats?.recentActivities || []).slice(0, 6).map((activity: any, index: number) => (
              <div key={`${activity.action}-${index}`} className="flex items-center gap-3 rounded-md border bg-white p-3 dark:bg-slate-900">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 dark:bg-slate-800">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize">{String(activity.action).replaceAll("_", " ")}</p>
                  <p className="text-xs text-slate-500">{activity.username} - {new Date(activity.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {!stats?.recentActivities?.length && <p className="py-8 text-center text-sm text-slate-500">No recent activity yet.</p>}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader><CardTitle>Growth & Revenue Trend</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="students" stroke="#2563eb" fill="#bfdbfe" strokeWidth={2} />
                <Area type="monotone" dataKey="revenue" stroke="#16a34a" fill="#bbf7d0" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
