import { Bot } from "lucide-react";
import AdminShell from "@/components/layout/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminAiTutorPage() {
  return (
    <AdminShell title="AI Tutor" subtitle="Configure AI tutor support and learning assistance.">
      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <CardTitle>AI Tutor</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          AI tutor controls will appear here.
        </CardContent>
      </Card>
    </AdminShell>
  );
}
