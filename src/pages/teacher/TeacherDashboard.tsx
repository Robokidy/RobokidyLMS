import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, BookMarked, Building2, CalendarCheck, ClipboardList, CreditCard, FileQuestion, GraduationCap, Medal, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/context/AuthContext";
import { teacherApi } from "@/services/teacherApi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const kpis = [
  { key: "assignedSchools", label: "Assigned Schools", icon: Building2 },
  { key: "assignedClasses", label: "Assigned Classes", icon: GraduationCap },
  { key: "assignedStudents", label: "Assigned Students", icon: Users },
  { key: "activeStudents", label: "Active Students", icon: Activity },
  { key: "attendancePercentage", label: "Attendance %", icon: CalendarCheck, percent: true },
  { key: "pendingFees", label: "Pending Fees", icon: CreditCard, money: true },
  { key: "totalMaterialsAssigned", label: "Materials", icon: BookMarked },
  { key: "totalQuizzesAssigned", label: "Quizzes", icon: FileQuestion },
  { key: "totalAssessmentsAssigned", label: "Assessments", icon: ClipboardList },
  { key: "courseCompletionRate", label: "Completion", icon: GraduationCap, percent: true },
  { key: "certificatesIssued", label: "Certificates", icon: Medal },
];

function display(stats: any, card: any) {
  const raw = stats?.[card.key] ?? 0;
  if (card.money) return `Rs. ${Number(raw).toLocaleString()}`;
  if (card.percent) return `${Number(raw).toLocaleString()}%`;
  return Number(raw).toLocaleString();
}

export default function TeacherDashboard() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    teacherApi.dashboard(token)
      .then((data) => {
        setDashboard(data);
        setError("");
      })
      .catch((err) => setError(err.message || "Unable to load teacher dashboard"))
      .finally(() => setLoading(false));
  }, [token]);

  const trend = useMemo(() => dashboard?.charts?.attendanceTrend || [], [dashboard]);
  const performance = useMemo(() => dashboard?.charts?.assessmentPerformance || [], [dashboard]);
  const activity = dashboard?.recentActivity || [];

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

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
                  <p className="text-2xl font-bold">{loading ? "..." : display(dashboard, card)}</p>
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                    <ArrowUpRight className="mr-1 h-3 w-3" />Live
                  </Badge>
                </div>
                <div className="mt-4 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend}>
                      <Area type="monotone" dataKey="value" stroke="#0f172a" fill="#e2e8f0" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="rounded-lg">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Assessment Performance</CardTitle>
            <Badge variant="outline">Assigned Students</Badge>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#0f172a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quiz" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activity.slice(0, 7).map((row: any, index: number) => (
              <div key={`${row.action}-${index}`} className="flex items-center gap-3 rounded-md border bg-white p-3 dark:bg-slate-900">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 dark:bg-slate-800">
                  <Activity className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize">{String(row.action || "").replaceAll("_", " ")}</p>
                  <p className="text-xs text-slate-500">{row.username || "System"} - {row.createdAt ? new Date(row.createdAt).toLocaleString() : "Recent"}</p>
                </div>
              </div>
            ))}
            {!activity.length && <p className="py-8 text-center text-sm text-slate-500">No recent activity yet.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader><CardTitle>Attendance Trend</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#bfdbfe" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader><CardTitle>Operational Mix</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard?.charts?.operations || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
