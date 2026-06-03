import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TeacherProfilePage() {
  const { user } = useAuth();
  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="rounded-lg">
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Info label="Name" value={user?.fullName || user?.username} />
          <Info label="Username" value={user?.username} />
          <Info label="Email" value={user?.email || "-"} />
          <Info label="Role" value={user?.role} />
        </CardContent>
      </Card>
      <Card className="rounded-lg">
        <CardHeader><CardTitle>Access Summary</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(user?.permissions || ["Academic Library", "Assigned Schools", "Assigned Classes", "Assigned Students"]).map((item: string) => (
            <Badge key={item} variant="secondary">{item}</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: any) {
  return <div className="flex justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900"><span className="text-slate-500">{label}</span><span className="font-medium">{value}</span></div>;
}
