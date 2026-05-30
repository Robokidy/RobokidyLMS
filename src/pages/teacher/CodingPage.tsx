import { useEffect, useMemo, useState } from "react";
import { Cpu, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { teacherApi } from "@/services/teacherApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CodingPage() {
  const { token } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    teacherApi.students(token)
      .then((studentRows) => setStudents(studentRows || []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [token]);

  const tracks = useMemo(() => {
    return Array.from(new Set(students.flatMap((student) => (student.assignedTrackIds || []).map((track: any) => track.trackName || track.trackCode))));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase();
    return students.filter((student) => {
      const matchesQuery = [student.fullName, student.username, student.email].some((value) => String(value || "").toLowerCase().includes(query));
      const matchesTrack = !track || (student.assignedTrackIds || []).some((trackItem: any) => (trackItem.trackName || trackItem.trackCode) === track);
      return matchesQuery && matchesTrack;
    });
  }, [students, search, track]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Coding workspace</p>
            <h2 className="mt-2 text-3xl font-semibold">Code review & student analytics</h2>
            <p className="mt-1 text-sm text-slate-500">Coding page state is isolated from the broader dashboard experience.</p>
          </div>
          <Button variant="outline"><Cpu className="mr-2 h-4 w-4" />Create problem</Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Input placeholder="Search students" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select value={track} onChange={(event) => setTrack(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
            <option value="">All tracks</option>
            {tracks.map((trackName) => <option key={trackName} value={trackName}>{trackName}</option>)}
          </select>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Students: {students.length}</div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader className="flex items-center justify-between gap-2"><CardTitle>Top performers</CardTitle><TrendingUp className="h-4 w-4" /></CardHeader>
          <CardContent>
            {students
              .slice()
              .sort((a, b) => (b.progress?.codeRunCount || 0) - (a.progress?.codeRunCount || 0))
              .slice(0, 4)
              .map((student) => (
                <div key={student._id} className="mb-4 last:mb-0">
                  <div className="font-semibold">{student.fullName || student.username}</div>
                  <div className="text-sm text-slate-500">{student.progress?.codeRunCount || 0} code runs</div>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader><CardTitle>Track overview</CardTitle></CardHeader>
          <CardContent>
            {(tracks.length ? tracks : ["No active tracks"]).map((trackName) => (
              <div key={trackName} className="mb-3 last:mb-0">
                <div className="font-semibold">{trackName}</div>
                <div className="text-sm text-slate-500">{filteredStudents.filter((student) => (student.assignedTrackIds || []).some((trackItem: any) => (trackItem.trackName || trackItem.trackCode) === trackName)).length} students</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading coding analytics…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Code runs</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student._id}>
                  <TableCell>{student.fullName || student.username}</TableCell>
                  <TableCell>{(student.assignedTrackIds || []).map((trackItem: any) => trackItem.trackName || trackItem.trackCode).join(", ") || "—"}</TableCell>
                  <TableCell>{student.progress?.codeRunCount ?? 0}</TableCell>
                  <TableCell>{student.progress?.completedLessons?.length ?? 0} lessons</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
