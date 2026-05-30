import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { teacherApi } from "@/services/teacherApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function MessagesPage() {
  const { token } = useAuth();
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payload, setPayload] = useState({ title: "", body: "", classSectionId: "" });
  const [sent, setSent] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    teacherApi.classes(token).then((classes) => setClassOptions(classes || [])).catch(() => setClassOptions([]));
  }, [token]);

  const sendAnnouncement = async () => {
    try {
      const announcement = await teacherApi.announcement(payload, token);
      setSent((prev) => [announcement, ...prev]);
      setPayload({ title: "", body: "", classSectionId: "" });
      setDialogOpen(false);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Messaging workflow</p>
          <h2 className="mt-2 text-3xl font-semibold">Student announcements</h2>
          <p className="mt-1 text-sm text-slate-500">Send announcements to students or class groups with a lightweight publish form.</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => setDialogOpen(true)}>Publish announcement</Button>
          <p className="text-sm text-slate-500">Announcements are scoped to the teacher's assigned classes.</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {sent.length ? sent.map((item) => (
          <Card key={item._id || item.title} className="rounded-3xl">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400">{item.body}</p>
            </CardContent>
          </Card>
        )) : (
          <Card className="rounded-3xl border-dashed border-slate-300 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <CardContent className="py-16">No announcements sent yet. Start by composing a new message.</CardContent>
          </Card>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Publish announcement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Title</Label>
              <Input value={payload.title} onChange={(event) => setPayload({ ...payload, title: event.target.value })} />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={payload.body} onChange={(event) => setPayload({ ...payload, body: event.target.value })} />
            </div>
            <div>
              <Label>Target class</Label>
              <select value={payload.classSectionId} onChange={(event) => setPayload({ ...payload, classSectionId: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                <option value="">All students</option>
                {classOptions.map((klass) => <option key={klass._id} value={klass._id}>{klass.name}</option>)}
              </select>
            </div>
            <Button onClick={sendAnnouncement}>Send announcement</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
