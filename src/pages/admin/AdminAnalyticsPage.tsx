import { useEffect, useMemo, useState } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import AdminShell from "@/components/layout/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const COLORS = ["#2563eb", "#16a34a", "#9333ea", "#ea580c"];

export default function AdminAnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<any>({ analytics: [], logs: [] });
  const [search, setSearch] = useState("");

  useEffect(() => { apiFetch("/admin/analytics", {}, token).then(setData); }, [token]);

  const filtered = useMemo(
    () => data.analytics.filter((a: any) => a.username.toLowerCase().includes(search.toLowerCase())),
    [data.analytics, search]
  );

  const distData = useMemo(() => [
    { name: "Low (<40%)", value: filtered.filter((a: any) => a.progressPercentage < 40).length },
    { name: "Medium (40-75%)", value: filtered.filter((a: any) => a.progressPercentage >= 40 && a.progressPercentage < 75).length },
    { name: "High (>=75%)", value: filtered.filter((a: any) => a.progressPercentage >= 75).length }
  ], [filtered]);

  const lineData = useMemo(
    () => filtered.slice(0, 10).map((a: any) => ({ name: a.username, quiz: a.avgQuizScore, progress: a.progressPercentage })),
    [filtered]
  );

  return (
    <AdminShell title="Analytics" subtitle="Track performance, weak topics, and engagement signals">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 rounded-2xl">
          <CardHeader><CardTitle>Performance Trend</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide={lineData.length > 7} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="progress" stroke="#2563eb" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="quiz" stroke="#9333ea" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle>Progress Distribution</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {distData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl mt-4">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <CardTitle>Student Performance Table</CardTitle>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student" className="md:w-64" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Average Quiz</TableHead>
                <TableHead>Code Runs</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a: any) => (
                <TableRow key={a.studentId}>
                  <TableCell className="font-medium">{a.username}</TableCell>
                  <TableCell>
                    <p className="text-sm mb-1">{a.progressPercentage}%</p>
                    <Progress value={a.progressPercentage} className="h-2" />
                  </TableCell>
                  <TableCell>{a.avgQuizScore}%</TableCell>
                  <TableCell>{a.codeRunCount}</TableCell>
                  <TableCell>
                    {a.avgQuizScore < 60 ? <Badge variant="destructive">Low Performance</Badge> : <Badge className="bg-emerald-100 text-emerald-700">Healthy</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="rounded-2xl mt-4">
        <CardHeader><CardTitle>Recent Activity Logs</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-72 overflow-auto">
          {data.logs.slice(0, 80).map((l: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900">
              <span>{l.username} performed <span className="font-medium">{l.action}</span></span>
              <span className="text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
