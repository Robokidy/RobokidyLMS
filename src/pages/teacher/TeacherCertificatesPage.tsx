import { useEffect, useState } from "react";
import { Download, Medal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { teacherApi } from "@/services/teacherApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function TeacherCertificatesPage() {
  const { token } = useAuth();
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    teacherApi.students(token).then((rows) => setStudents(rows || [])).catch(() => setStudents([]));
  }, [token]);

  const eligible = students.filter((student) => (student.progress?.progressPercentage || student.progress?.completionPercentage || 0) >= 80);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric title="Assigned Students" value={students.length} />
        <Metric title="Eligible" value={eligible.length} />
        <Metric title="Issued" value={students.reduce((sum, row) => sum + ((row.progress?.earnedCertificates || []).length), 0)} />
      </div>
      <Card className="rounded-lg">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Certificate Manager</CardTitle>
          <Medal className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Completion</TableHead><TableHead>Certificates</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student._id}>
                  <TableCell className="font-medium">{student.fullName || student.username}</TableCell>
                  <TableCell>{(student.classSectionIds || []).map((klass: any) => klass.name || klass).join(", ") || "-"}</TableCell>
                  <TableCell>{student.progress?.progressPercentage || student.progress?.completionPercentage || 0}%</TableCell>
                  <TableCell>{student.progress?.earnedCertificates?.length || 0}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline"><Download className="mr-2 h-4 w-4" />Issue</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value }: any) {
  return <Card className="rounded-lg"><CardContent className="p-4"><p className="text-sm text-slate-500">{title}</p><p className="text-2xl font-bold">{value}</p></CardContent></Card>;
}
