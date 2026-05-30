import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, GraduationCap, Layers, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { teacherApi } from "@/services/teacherApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ClassesPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebouncedValue(search, 250);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    teacherApi.classes(token).then((data) => setClasses(data)).catch(() => setClasses([])).finally(() => setLoading(false));
  }, [token]);

  const tracks = useMemo(() => {
    return Array.from(new Set(classes.flatMap((klass) => (klass.courseTrackIds || []).map((track: any) => track.trackName || track.trackCode))));
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter((klass) => {
      const searchTerm = debouncedSearch.toLowerCase();
      const title = `${klass.name || ""} ${klass.grade || ""} ${klass.section || ""}`.toLowerCase();
      const inTrack = (klass.courseTrackIds || []).some((track: any) => String(track.trackName || track.trackCode).toLowerCase().includes(searchTerm));
      if (trackFilter && !tracks.includes(trackFilter)) return false;
      if (trackFilter && !(klass.courseTrackIds || []).some((track: any) => (track.trackName || track.trackCode) === trackFilter)) return false;
      if (!searchTerm) return true;
      return title.includes(searchTerm) || inTrack;
    });
  }, [classes, debouncedSearch, trackFilter, tracks]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Classes workspace</p>
            <h2 className="mt-2 text-2xl font-semibold">Assigned Classes</h2>
            <p className="mt-1 text-sm text-slate-500">Browse every class you manage in one independent workspace.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:w-96">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search classes"
              className="w-full"
              type="search"
            />
            <select value={trackFilter} onChange={(event) => setTrackFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-emerald-500 dark:focus:ring-emerald-800">
              <option value="">All tracks</option>
              {tracks.map((track) => (
                <option key={track} value={track}>{track}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-3xl">
          <CardHeader className="flex items-center justify-between gap-2">
            <CardTitle>Class count</CardTitle>
            <Badge>{classes.length}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400">Number of classes assigned to your profile.</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader className="flex items-center justify-between gap-2">
            <CardTitle>Active tracks</CardTitle>
            <Badge>{tracks.length}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400">Unique curriculum tracks configured in your classes.</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader className="flex items-center justify-between gap-2">
            <CardTitle>Search</CardTitle>
            <Badge>{filteredClasses.length}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400">Filtered classes currently visible in the table below.</p>
          </CardContent>
        </Card>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Layers className="h-4 w-4" />
            <span className="text-sm font-semibold">Class list</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Filter className="h-4 w-4" />
            {trackFilter || "No active filters"}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 py-10 text-center text-sm text-slate-500">Loading classes…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Tracks</TableHead>
                <TableHead>Students</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.map((klass) => (
                <TableRow key={klass._id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900" onClick={() => navigate(`/teacher/classes/${klass._id}`)}>
                  <TableCell>
                    <div className="font-semibold">{klass.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Grade {klass.grade} • Section {klass.section}</div>
                  </TableCell>
                  <TableCell>{(klass.subjects || []).join(", ") || "—"}</TableCell>
                  <TableCell>{(klass.courseTrackIds || []).map((track: any) => track.trackName || track.trackCode).join(", ") || "—"}</TableCell>
                  <TableCell>{klass.studentCount ?? 0} / {klass.capacity || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!loading && !filteredClasses.length && (
          <div className="py-10 text-center text-sm text-slate-500">No classes match your current search and filters.</div>
        )}
      </section>
    </div>
  );
}
