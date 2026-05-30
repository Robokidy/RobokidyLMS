import { type ReactNode, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type GlobalFilterState = {
  schoolId: string;
  teacherId: string;
  classSectionId: string;
  grade: string;
  subject: string;
  courseId: string;
  attendanceStatus: string;
  feeStatus: string;
  studentStatus: string;
  codingDifficulty: string;
  materialType: string;
  dateFrom: string;
  dateTo: string;
  search: string;
};

export const defaultFilters: GlobalFilterState = {
  schoolId: "",
  teacherId: "",
  classSectionId: "",
  grade: "",
  subject: "",
  courseId: "",
  attendanceStatus: "",
  feeStatus: "",
  studentStatus: "",
  codingDifficulty: "",
  materialType: "",
  dateFrom: "",
  dateTo: "",
  search: ""
};

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{children}</select>;
}

export function filtersToQuery(filters: GlobalFilterState) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function readStoredFilters(key: string) {
  const params = new URLSearchParams(window.location.search);
  const saved = localStorage.getItem(key);
  const fromStorage = saved ? JSON.parse(saved) : {};
  const merged = { ...defaultFilters, ...fromStorage };
  params.forEach((value, paramKey) => {
    if (paramKey in defaultFilters) merged[paramKey as keyof GlobalFilterState] = value;
  });
  return merged as GlobalFilterState;
}

export default function GlobalFilters({ filters, setFilters, options, storageKey }: { filters: GlobalFilterState; setFilters: (filters: GlobalFilterState) => void; options: any; storageKey: string }) {
  const scopedClasses = useMemo(() => (options.classes || []).filter((row: any) => !filters.schoolId || String(row.schoolId?._id || row.schoolId) === filters.schoolId), [options.classes, filters.schoolId]);
  const scopedTeachers = useMemo(() => (options.teachers || []).filter((row: any) => !filters.schoolId || String(row.schoolId?._id || row.schoolId) === filters.schoolId), [options.teachers, filters.schoolId]);
  const scopedCourses = useMemo(() => (options.courses || []).filter((row: any) => !filters.codingDifficulty || row.difficulty === filters.codingDifficulty), [options.courses, filters.codingDifficulty]);
  const activeEntries = Object.entries(filters).filter(([, value]) => value);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(filters));
    const query = filtersToQuery(filters);
    window.history.replaceState(null, "", `${window.location.pathname}${query}`);
  }, [filters, storageKey]);

  const update = (key: keyof GlobalFilterState, value: string) => {
    const next = { ...filters, [key]: value };
    if (key === "schoolId") {
      next.teacherId = "";
      next.classSectionId = "";
    }
    setFilters(next);
  };

  return (
    <div className="rounded-lg border bg-background/80 p-3 shadow-sm">
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <Input value={filters.search} onChange={(event) => update("search", event.target.value)} placeholder="Quick search" />
        <Select value={filters.schoolId} onChange={(value) => update("schoolId", value)}><option value="">All schools</option>{(options.schools || []).map((item: any) => <option key={item._id} value={item._id}>{item.name}</option>)}</Select>
        <Select value={filters.teacherId} onChange={(value) => update("teacherId", value)}><option value="">All teachers</option>{scopedTeachers.map((item: any) => <option key={item._id} value={item._id}>{item.fullName || item.username}</option>)}</Select>
        <Select value={filters.classSectionId} onChange={(value) => update("classSectionId", value)}><option value="">All classes</option>{scopedClasses.map((item: any) => <option key={item._id} value={item._id}>{item.name}</option>)}</Select>
        <Select value={filters.grade} onChange={(value) => update("grade", value)}><option value="">All grades</option>{(options.grades || []).map((item: string) => <option key={item} value={item}>{item}</option>)}</Select>
        <Select value={filters.subject} onChange={(value) => update("subject", value)}><option value="">All subjects</option>{(options.subjects || []).map((item: string) => <option key={item} value={item}>{item}</option>)}</Select>
        <Select value={filters.courseId} onChange={(value) => update("courseId", value)}><option value="">All courses</option>{scopedCourses.map((item: any) => <option key={item._id} value={item._id}>{item.name}</option>)}</Select>
        <Select value={filters.attendanceStatus} onChange={(value) => update("attendanceStatus", value)}><option value="">Attendance</option>{["present", "absent", "late", "leave"].map((item) => <option key={item} value={item}>{item}</option>)}</Select>
        <Select value={filters.feeStatus} onChange={(value) => update("feeStatus", value)}><option value="">Fee status</option>{["paid", "pending", "partial", "overdue"].map((item) => <option key={item} value={item}>{item}</option>)}</Select>
        <Select value={filters.studentStatus} onChange={(value) => update("studentStatus", value)}><option value="">Student status</option><option value="active">Active</option><option value="inactive">Inactive</option></Select>
        <Select value={filters.codingDifficulty} onChange={(value) => update("codingDifficulty", value)}><option value="">Coding difficulty</option>{["beginner", "intermediate", "advanced", "mixed"].map((item) => <option key={item} value={item}>{item}</option>)}</Select>
        <Select value={filters.materialType} onChange={(value) => update("materialType", value)}><option value="">Material type</option>{["pdf", "book", "notes", "video"].map((item) => <option key={item} value={item}>{item}</option>)}</Select>
        <Input type="date" value={filters.dateFrom} onChange={(event) => update("dateFrom", event.target.value)} />
        <Input type="date" value={filters.dateTo} onChange={(event) => update("dateTo", event.target.value)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {activeEntries.map(([key, value]) => <Badge key={key} variant="secondary" className="gap-1">{key}: {value}<button onClick={() => update(key as keyof GlobalFilterState, "")}><X className="h-3 w-3" /></button></Badge>)}
        {activeEntries.length > 0 && <Button size="sm" variant="ghost" onClick={() => setFilters(defaultFilters)}>Clear filters</Button>}
      </div>
    </div>
  );
}
