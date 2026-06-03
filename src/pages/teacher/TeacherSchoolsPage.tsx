import { useEffect, useState } from "react";
import { Building2, CalendarCheck, CreditCard, GraduationCap, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { teacherApi } from "@/services/teacherApi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeacherSchoolsPage() {
  const { token } = useAuth();
  const [schools, setSchools] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    teacherApi.schools(token).then((rows) => setSchools(rows || [])).catch(() => setSchools([]));
  }, [token]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Assigned Schools" value={schools.length} icon={Building2} />
        <Metric title="Classes" value={schools.reduce((sum, row) => sum + (row.classCount || 0), 0)} icon={GraduationCap} />
        <Metric title="Students" value={schools.reduce((sum, row) => sum + (row.studentCount || 0), 0)} icon={Users} />
        <Metric title="Pending Fees" value={`Rs. ${schools.reduce((sum, row) => sum + (row.pendingFees || 0), 0).toLocaleString()}`} icon={CreditCard} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {schools.map((school) => (
          <Card key={school._id} className="rounded-lg">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>{school.name}</CardTitle>
                <p className="text-sm text-slate-500">{school.code || "No code"} | Principal: {school.principalName || "-"}</p>
              </div>
              <Badge>{school.active === false ? "Inactive" : "Active"}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Signal label="Teachers" value={school.teacherCount || 0} />
              <Signal label="Classes" value={school.classCount || 0} />
              <Signal label="Students" value={school.studentCount || 0} />
              <Signal label="Attendance" value={`${school.attendancePercentage || 0}%`} icon={CalendarCheck} />
              <Signal label="Pending Fees" value={`Rs. ${Number(school.pendingFees || 0).toLocaleString()}`} />
            </CardContent>
          </Card>
        ))}
      </div>
      {!schools.length && <div className="rounded-lg border bg-white p-10 text-center text-sm text-slate-500">No assigned schools found.</div>}
    </div>
  );
}

function Metric({ title, value, icon: Icon }: any) {
  return (
    <Card className="rounded-lg">
      <CardContent className="flex items-center justify-between p-4">
        <div><p className="text-sm text-slate-500">{title}</p><p className="text-2xl font-bold">{value}</p></div>
        <Icon className="h-5 w-5 text-blue-600" />
      </CardContent>
    </Card>
  );
}

function Signal({ label, value, icon: Icon }: any) {
  return (
    <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900">
      <span className="flex items-center gap-2 text-slate-500">{Icon && <Icon className="h-4 w-4" />}{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
