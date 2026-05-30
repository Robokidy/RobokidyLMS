import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/context/AuthContext";
import { teacherApi } from "@/services/teacherApi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TeacherDashboard() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    teacherApi.dashboard(token)
      .then((data) => setDashboard(data))
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Teacher overview</p>
            <h1 className="mt-2 text-3xl font-semibold">Teacher dashboard</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">High level analytics for your assigned classes, without student tables or cross-module filter bleed.</p>
          </div>
          <Button variant="outline">Refresh</Button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Total classes</CardTitle></CardHeader>
          <CardContent>{dashboard?.totalClasses ?? "-"}</CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Total students</CardTitle></CardHeader>
          <CardContent>{dashboard?.totalStudents ?? "-"}</CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Active assignments</CardTitle></CardHeader>
          <CardContent>{dashboard?.activeAssignments ?? "-"}</CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Attendance %</CardTitle></CardHeader>
          <CardContent>{dashboard?.attendancePercentage ?? "-"}%</CardContent>
        </Card>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Upcoming classes</h2>
            <p className="text-sm text-slate-500">Your assigned classes are shown with the latest participation metrics.</p>
          </div>
          <Badge variant="secondary">{dashboard?.classes?.length ?? 0} classes</Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-32 rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"></div>
            ))
          ) : dashboard?.classes?.length ? (
            dashboard.classes.map((klass: any) => (
              <Card key={klass._id} className="rounded-3xl border-slate-200">
                <CardHeader>
                  <CardTitle>{klass.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">Grade {klass.grade} - Section {klass.section}</p>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <div>Tracks: {(klass.courseTrackIds || []).map((track: any) => track.trackName || track.trackCode).join(", ") || "None"}</div>
                    <div>Subjects: {(klass.subjects || []).join(", ") || "Not defined"}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">No class metadata available yet.</div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Performance snapshot</h2>
            <p className="text-sm text-slate-500">Attendance and assignment activity for your teacher workspace.</p>
          </div>
        </div>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: "Attend", value: dashboard?.attendancePercentage ?? 0 },
              { name: "Assignments", value: dashboard?.activeAssignments ?? 0 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
