import { useEffect, useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { teacherApi } from "@/services/teacherApi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function TeacherFeesPage() {
  const { token } = useAuth();
  const [fees, setFees] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    teacherApi.fees({}, token).then((rows) => setFees(rows || [])).catch(() => setFees([]));
  }, [token]);

  const totals = useMemo(() => ({
    total: fees.reduce((sum, row) => sum + Number(row.totalFees || row.total || 0), 0),
    paid: fees.reduce((sum, row) => sum + Number(row.paidAmount || row.paid || 0), 0),
    pending: fees.reduce((sum, row) => sum + Number(row.pendingAmount || row.balance || 0), 0),
  }), [fees]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Metric title="Total Fee" value={`Rs. ${totals.total.toLocaleString()}`} />
        <Metric title="Paid" value={`Rs. ${totals.paid.toLocaleString()}`} />
        <Metric title="Balance" value={`Rs. ${totals.pending.toLocaleString()}`} />
      </div>
      <Card className="rounded-lg">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Assigned Student Fees</CardTitle>
          <CreditCard className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Status</TableHead><TableHead>Paid</TableHead><TableHead>Pending</TableHead></TableRow></TableHeader>
            <TableBody>
              {fees.map((row) => (
                <TableRow key={row._id || row.studentId?._id}>
                  <TableCell className="font-medium">{row.studentName || row.studentId?.fullName || row.studentId?.username}</TableCell>
                  <TableCell>{row.className || row.classSectionId?.name || "-"}</TableCell>
                  <TableCell><Badge>{row.status || row.feeStatus || "pending"}</Badge></TableCell>
                  <TableCell>Rs. {Number(row.paidAmount || 0).toLocaleString()}</TableCell>
                  <TableCell>Rs. {Number(row.pendingAmount || 0).toLocaleString()}</TableCell>
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
