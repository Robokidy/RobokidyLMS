import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Code,
  FileText,
  GraduationCap,
  Languages,
  LockKeyhole,
  LogOut,
  Search,
  ShieldCheck,
  Video
} from "lucide-react";
import { apiFetch } from "@/api/client";
import { getStudentNavItems, studentDefaultModules } from "@/lib/studentNav";
import DarkModeToggle from "@/components/layout/DarkModeToggle";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Material, MaterialType } from "@/types";

const PAGE_SIZE = 6;

const gradeLabels: Record<string, string> = {
  grade1: "Grade 1",
  grade2: "Grade 2",
  grade3: "Grade 3",
  grade4: "Grade 4",
  grade5: "Grade 5",
  grade6: "Grade 6",
  grade7: "Grade 7",
  grade8: "Grade 8",
  grade9: "Grade 9",
  grade10: "Grade 10"
};

type DashboardStats = {
  totalLessons: number;
  completedLessons: number;
  quizAttempts: number;
  codeRunCount: number;
};


function formatDate(value?: string) {
  if (!value) return "Recently added";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function getMaterialIcon(type: MaterialType) {
  if (type === "video") return Video;
  if (type === "book") return BookOpen;
  return FileText;
}

export default function MaterialsPage() {
  const { token, user, logout } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [enabledModules, setEnabledModules] = useState<string[]>(studentDefaultModules);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<MaterialType | "all">("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!token) return;
    document.body.style.userSelect = "";
    Promise.all([
      apiFetch("/student/materials", {}, token),
      apiFetch("/student/dashboard", {}, token)
    ]).then(([materialData, dashboardData]) => {
      setMaterials(materialData);
      setStats(dashboardData);
      setEnabledModules(Array.isArray(dashboardData?.enabledModules) && dashboardData.enabledModules.length ? dashboardData.enabledModules : studentDefaultModules);
    });
  }, [token]);

  const courses = useMemo(
    () => Array.from(new Map(materials.map((material) => [material.courseId?._id, material.courseId])).values()).filter(Boolean),
    [materials]
  );

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return materials.filter((material) => {
      const matchesSearch = `${material.title} ${material.description} ${material.courseId?.name || ""}`.toLowerCase().includes(query);
      const matchesGrade = true; // grade-based filtering removed; access controlled by assigned courses
      const matchesCourse = courseFilter === "all" || material.courseId?._id === courseFilter;
      const matchesLanguage = languageFilter === "all" || material.language === languageFilter || material.language === "both";
      const matchesType = typeFilter === "all" || material.type === typeFilter;
      return matchesSearch && matchesGrade && matchesCourse && matchesLanguage && matchesType;
    });
  }, [materials, search, gradeFilter, courseFilter, languageFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedMaterials = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const recentMaterials = materials.slice(0, 4);
  const completion = stats?.totalLessons ? Math.round(((stats.completedLessons || 0) / stats.totalLessons) * 100) : 0;
  const currentGrade = gradeLabels[user?.grade || "grade1"] || "Grade 1";

  const resetPage = (change: () => void) => {
    change();
    setPage(1);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_32%)]" />

      <header className="sticky top-0 z-40 border-b border-white/30 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold">Robokidy Learn</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Protected student library</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {getStudentNavItems(enabledModules).map((item) => {
              const Icon = item.icon;
              const active = item.href === "/student/materials";
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`relative z-10 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-950"
                      : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70 md:flex">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-bold text-white">
                {user?.username?.slice(0, 2).toUpperCase() || "ST"}
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight">{user?.username}</p>
                <p className="text-[11px] text-slate-500">{currentGrade}</p>
              </div>
            </div>
            <Button variant="outline" size="icon" className="relative z-10 rounded-full bg-white/70 dark:bg-slate-900/70">
              <Bell className="h-4 w-4" />
            </Button>
            <DarkModeToggle />
            <Button variant="destructive" size="icon" className="relative z-10 rounded-full" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 xl:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <Card className="overflow-hidden border-white/50 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Learning Progress</p>
                  <p className="text-2xl font-bold">{completion}%</p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500" style={{ width: `${completion}%` }} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
            {[
              { label: "Materials", value: materials.length, icon: FileText },
              { label: "Completed", value: stats?.completedLessons ?? 0, icon: CheckCircle2 },
              { label: "Quizzes", value: stats?.quizAttempts ?? 0, icon: GraduationCap },
              { label: "Code Runs", value: stats?.codeRunCount ?? 0, icon: Code }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
                  <Icon className="mb-3 h-5 w-5 text-cyan-600" />
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </div>
              );
            })}
          </div>

          <Card className="border-white/50 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-semibold">Recent Materials</p>
                <ClockBadge />
              </div>
              <div className="space-y-3">
                {recentMaterials.map((material) => (
                  <Link key={material._id} to={`/student/materials/${material._id}`} className="relative z-10 block rounded-xl border border-slate-100 bg-white/70 p-3 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/40">
                    <p className="line-clamp-1 text-sm font-semibold">{material.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{material.courseId?.name} - {formatDate(material.createdAt)}</p>
                  </Link>
                ))}
                {!recentMaterials.length && <p className="text-sm text-slate-500">No recent activity yet.</p>}
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><ShieldCheck className="mr-1 h-3 w-3" /> Protected Content</Badge>
                  <Badge variant="outline"><LockKeyhole className="mr-1 h-3 w-3" /> Anti-download shield</Badge>
                  <Badge variant="outline">Session active</Badge>
                </div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Assigned Library</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                  Premium learning materials filtered by your assigned courses and grade. Every file opens inside the protected viewer with watermark tracking.
                </p>
              </div>
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => resetPage(() => setSearch(e.target.value))}
                  placeholder="Search course, file, or topic"
                  className="h-12 rounded-2xl border-white/60 bg-white/90 pl-11 shadow-sm dark:border-slate-800 dark:bg-slate-950/70"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {/* Grade filter removed — access controlled by assigned courses */}
              <FilterSelect label="Course" value={courseFilter} onChange={(value) => resetPage(() => setCourseFilter(value))}>
                <option value="all">All assigned courses</option>
                {courses.map((course) => <option key={course?._id} value={course?._id}>{course?.name}</option>)}
              </FilterSelect>
              <FilterSelect label="Language" value={languageFilter} onChange={(value) => resetPage(() => setLanguageFilter(value))}>
                <option value="all">All languages</option>
                <option value="en">English</option>
                <option value="ta">Tamil</option>
                <option value="both">English + Tamil</option>
              </FilterSelect>
              <FilterSelect label="Type" value={typeFilter} onChange={(value) => resetPage(() => setTypeFilter(value as MaterialType | "all"))}>
                <option value="all">All material types</option>
                <option value="pdf">PDF</option>
                <option value="video">Video</option>
                <option value="notes">Notes</option>
                <option value="book">Book</option>
              </FilterSelect>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {pagedMaterials.map((material) => {
              const Icon = getMaterialIcon(material.type);
              return (
                <Card key={material._id} className="group overflow-hidden border-white/60 bg-white/80 shadow-lg shadow-slate-200/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
                  <div className="relative h-36 overflow-hidden bg-gradient-to-br from-slate-900 via-cyan-900 to-indigo-800">
                    <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_30%_20%,white,transparent_20%)]" />
                    <div className="absolute left-5 top-5 grid h-14 w-14 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-white">
                      <Badge className="bg-white/20 text-white hover:bg-white/20">{material.courseId?.name}</Badge>
                      <span className="text-xs">{formatDate(material.createdAt)}</span>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="line-clamp-1 text-lg font-bold">{material.title}</h2>
                        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500 dark:text-slate-400">{material.description || material.originalName || "Protected learning resource"}</p>
                      </div>
                      <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline">{gradeLabels[material.grade]}</Badge>
                      <Badge variant="secondary">{material.type.toUpperCase()}</Badge>
                      <Badge variant="outline"><Languages className="mr-1 h-3 w-3" />{material.language}</Badge>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Upload date</span>
                        <span className="font-medium">{formatDate(material.createdAt)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span>Progress status</span>
                        <span className="font-medium text-emerald-600">Ready to view</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/60 px-3 py-2 text-xs text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-200">
                      <span>Watermark preview</span>
                      <span className="font-semibold">{user?.username} / {currentGrade}</span>
                    </div>

                    <Button asChild className="relative z-10 mt-5 h-11 w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-500 hover:to-indigo-500">
                      <Link to={`/student/materials/${material._id}`}><LockKeyhole className="mr-2 h-4 w-4" /> Open Secure Viewer</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {!pagedMaterials.length && (
            <Card className="border-white/60 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
              <CardContent className="p-10 text-center text-slate-500">
                <FileText className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                No materials match your filters.
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-3 rounded-3xl border border-white/60 bg-white/70 p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Showing {pagedMaterials.length} of {filtered.length} assigned materials</p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
              <div className="grid min-w-16 place-items-center rounded-xl border bg-white px-3 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950">
                {page} / {totalPages}
              </div>
              <Button variant="outline" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <select
        className="relative z-10 h-11 w-full rounded-2xl border border-white/60 bg-white/90 px-3 text-sm shadow-sm outline-none transition focus:border-cyan-400 dark:border-slate-800 dark:bg-slate-950/70"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function ClockBadge() {
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
      Live
    </span>
  );
}
