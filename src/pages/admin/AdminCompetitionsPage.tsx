import { Medal } from "lucide-react";
import AdminShell from "@/components/layout/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminCompetitionsPage() {
  return (
    <AdminShell title="Competitions" subtitle="Manage coding contests, robotics events, and school challenges.">
      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-center gap-2">
          <Medal className="h-5 w-5 text-blue-600" />
          <CardTitle>Competitions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Competition management controls will appear here.
        </CardContent>
      </Card>
    </AdminShell>
  );
}
