import { useEffect, useMemo, useState } from "react";
import { Award, Download, RotateCcw, ShieldCheck } from "lucide-react";
import AdminShell from "@/components/layout/AdminShell";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function Metric({ title, value }: { title: string; value: number }) {
  return <Card className="rounded-lg"><CardContent className="p-4"><p className="text-sm text-slate-500">{title}</p><p className="text-2xl font-bold">{value}</p></CardContent></Card>;
}

export default function AdminCertificatesPage() {
  const { token } = useAuth();
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/admin/students", {}, token).then((rows) => setStudents(rows || [])).catch(() => setStudents([]));
  }, [token]);

  const eligible = useMemo(
    () => students.filter((student) => (student.progress?.progressPercentage || student.progress?.completionPercentage || student.performanceScore || 0) >= 80),
    [students]
  );
  const issued = students.reduce((sum, student) => sum + (student.progress?.earnedCertificates?.length || 0), 0);

  return (
    <AdminShell title="Certificates" subtitle="Generate, verify, reissue, and review student certificate readiness">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric title="Students" value={students.length} />
          <Metric title="Eligible" value={eligible.length} />
          <Metric title="Issued" value={issued} />
        </div>

        <Card className="rounded-lg">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Certificate Manager</CardTitle>
            <Award className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Certificates</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student._id}>
                    <TableCell className="font-medium">{student.fullName || student.username}</TableCell>
                    <TableCell>{student.grade || "-"}</TableCell>
                    <TableCell>{(student.classSectionIds || []).map((klass: any) => klass.name || klass).join(", ") || "-"}</TableCell>
                    <TableCell>{student.progress?.progressPercentage || student.progress?.completionPercentage || student.performanceScore || 0}%</TableCell>
                    <TableCell>{student.progress?.earnedCertificates?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline"><Download className="mr-2 h-4 w-4" />Generate</Button>
                        <Button size="sm" variant="outline"><ShieldCheck className="mr-2 h-4 w-4" />Verify</Button>
                        <Button size="sm" variant="outline"><RotateCcw className="mr-2 h-4 w-4" />Reissue</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
