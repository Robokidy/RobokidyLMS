import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/context/AuthContext";
import { teacherApi } from "@/services/teacherApi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([teacherApi.dashboard(token), teacherApi.attendance({}, token)])
      .then(([dashboardData, attendanceRows]) => {
        setDashboard(dashboardData || {});
        setAttendance(attendanceRows || []);
      })
      .catch(() => {
        setDashboard(null);
        setAttendance([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const chartData = useMemo(() => {
    return attendance.slice(0, 6).map((row) => ({
      date: new Date(row.date).toLocaleDateString(),
      present: row.status === "present" ? 1 : 0,
      absent: row.status === "absent" ? 1 : 0
    }));
  }, [attendance]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Analytics hub</p>
          <h2 className="mt-2 text-3xl font-semibold">Classroom analytics</h2>
          <p className="mt-1 text-sm text-slate-500">Actionable performance insights from each independent teacher module.</p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Total classes</CardTitle></CardHeader>
          <CardContent>{dashboard?.totalClasses ?? "—"}</CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Total students</CardTitle></CardHeader>
          <CardContent>{dashboard?.totalStudents ?? "—"}</CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Assignments active</CardTitle></CardHeader>
          <CardContent>{dashboard?.activeAssignments ?? "—"}</CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Attendance %</CardTitle></CardHeader>
          <CardContent>{dashboard?.attendancePercentage ?? "—"}%</CardContent>
        </Card>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Recent attendance</h3>
            <p className="text-sm text-slate-500">A quick glance at the latest attendance records across your assigned classes.</p>
          </div>
          <Badge variant="secondary">{attendance.length} records</Badge>
        </div>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="present" fill="#22c55e" stackId="a" />
              <Bar dataKey="absent" fill="#ef4444" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Fee pressure</CardTitle></CardHeader>
          <CardContent>{dashboard?.pendingFees ? `₹ ${dashboard.pendingFees.toLocaleString()}` : "No data"}</CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Coding runs</CardTitle></CardHeader>
          <CardContent>{dashboard?.codeRuns ?? "—"}</CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Upcoming classes</CardTitle></CardHeader>
          <CardContent>{(dashboard?.classes || []).length || "—"}</CardContent>
        </Card>
      </div>
    </div>
  );
}
