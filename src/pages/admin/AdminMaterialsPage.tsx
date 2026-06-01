import { useEffect, useMemo, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { BookMarked, Eye, FileArchive, FileText, Grid2X2, List, PlaySquare, Presentation, Search, Trash2, Upload } from "lucide-react";
import { API_BASE, apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import AdminShell from "@/components/layout/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Course, Material, MaterialType } from "@/types";

const materialTypes: MaterialType[] = ["pdf", "video", "worksheet", "presentation", "zip"];

function materialIcon(type: MaterialType) {
  if (type === "video") return PlaySquare;
  if (type === "zip") return FileArchive;
  if (type === "presentation") return Presentation;
  return FileText;
}

export default function AdminMaterialsPage() {
  const { token } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Material | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    courseId: "",
    type: "pdf" as MaterialType,
    language: "en" as "en" | "ta" | "both"
  });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [courseData, materialData] = await Promise.all([
      apiFetch("/admin/courses", {}, token),
      apiFetch("/materials?limit=100", {}, token)
    ]);
    setCourses(courseData);
    setMaterials(materialData.data || materialData);
    if (!form.courseId && courseData[0]) setForm((prev) => ({ ...prev, courseId: courseData[0]._id }));
    setLoading(false);
  };

  useEffect(() => { load().catch(() => setLoading(false)); }, [token]);

  const createMaterial = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("courseId", form.courseId);
    formData.append("type", form.type);
    formData.append("language", form.language);
    formData.append("fileName", file.name);
    formData.append("status", "published");
    formData.append("visibility", "students");

    const res = await fetch(`${API_BASE}/materials/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Upload failed");

    setForm((prev) => ({ ...prev, title: "", description: "" }));
    setFile(null);
    toast({ title: "Material uploaded", description: `${data.title} is now available in the repository.` });
    load();
  };

  const disableMaterial = async (id: string) => {
    await apiFetch(`/materials/${id}`, { method: "DELETE" }, token);
    toast({ title: "Material deleted", description: "The file was removed from the repository.", variant: "destructive" });
    setDeletingMaterial(null);
    load();
  };

  const filtered = useMemo(
    () => materials.filter((material) => `${material.title} ${material.description} ${material.courseId?.name || ""} ${material.type}`.toLowerCase().includes(search.toLowerCase())),
    [materials, search]
  );

  const typeCounts = materialTypes.map((type) => ({ type, count: materials.filter((material) => material.type === type).length }));

  return (
    <AdminShell title="Materials" subtitle="Google Drive style repository for PDFs, videos, worksheets, presentations, ZIPs, views, downloads, and assignments">
      <div className="mb-4 grid gap-3 md:grid-cols-5">
        {typeCounts.map(({ type, count }) => {
          const Icon = materialIcon(type);
          return <Card key={type} className="rounded-lg"><CardContent className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-md bg-slate-100 dark:bg-slate-800"><Icon className="h-4 w-4" /></span><div><p className="text-sm capitalize text-slate-500">{type}</p><p className="text-xl font-bold">{count}</p></div></CardContent></Card>;
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="rounded-lg">
          <CardHeader><CardTitle>Upload Material</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Material title" />
            <Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Short description" />
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })}>
              {courses.filter((course) => course.active).map((course) => <option key={course._id} value={course._id}>{course.name}</option>)}
            </select>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as MaterialType })}>
              {materialTypes.map((type) => <option key={type} value={type}>{type.toUpperCase()}</option>)}
            </select>
            <Input
              type="file"
              accept=".pdf,.ppt,.pptx,.zip,.mp4,.webm,.ogg,.doc,.docx,.txt,application/pdf,video/mp4,video/webm,application/zip"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            {file && <p className="text-xs text-slate-500">{file.name} ({Math.round(file.size / 1024)} KB)</p>}
            <Button className="w-full" onClick={createMaterial} disabled={!form.title.trim() || !form.courseId || !file}>
              <Upload className="mr-2 h-4 w-4" />Upload
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Repository</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search material" className="pl-9 md:w-72" />
              </div>
              <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}><Grid2X2 className="h-4 w-4" /></Button>
              <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <div className="grid gap-3 md:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />)}</div>}
            {!loading && !filtered.length && <div className="rounded-lg border border-dashed py-12 text-center text-sm text-slate-500">No materials found.</div>}
            {!loading && viewMode === "grid" && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((material) => <MaterialCard key={material._id} material={material} onPreview={setPreview} onDelete={setDeletingMaterial} />)}
              </div>
            )}
            {!loading && viewMode === "list" && (
              <div className="space-y-2">
                {filtered.map((material) => <MaterialRow key={material._id} material={material} onPreview={setPreview} onDelete={setDeletingMaterial} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{preview?.title}</DialogTitle></DialogHeader>
          <div className="rounded-lg border bg-slate-50 p-6 dark:bg-slate-900">
            <p className="text-sm text-slate-500">{preview?.description || "No description"}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Stat label="Views" value={preview?.viewCount || 0} />
              <Stat label="Downloads" value={preview?.downloadCount || 0} />
              <Stat label="Assigned Course" value={preview?.courseId?.name || "-"} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingMaterial)} onOpenChange={(isOpen) => !isOpen && setDeletingMaterial(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete material?</AlertDialogTitle>
            <AlertDialogDescription>This removes the file from the material repository.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deletingMaterial && disableMaterial(deletingMaterial._id)}>
              Delete Material
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

function MaterialCard({ material, onPreview, onDelete }: any) {
  const Icon = materialIcon(material.type);
  return <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-900"><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800"><Icon className="h-5 w-5" /></span><Badge variant={material.active ? "secondary" : "outline"}>{material.active ? "Active" : "Disabled"}</Badge></div><p className="mt-4 truncate font-semibold">{material.title}</p><p className="mt-1 line-clamp-2 h-10 text-sm text-slate-500">{material.description || material.originalName}</p><div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{material.viewCount || 0} views</span><span>{material.downloadCount || 0} downloads</span></div><div className="mt-4 flex gap-2"><Button size="sm" variant="outline" onClick={() => onPreview(material)}><Eye className="mr-1 h-4 w-4" />Preview</Button><Button size="sm" variant="destructive" onClick={() => onDelete(material)}><Trash2 className="mr-1 h-4 w-4" />Delete</Button></div></div>;
}

function MaterialRow({ material, onPreview, onDelete }: any) {
  const Icon = materialIcon(material.type);
  return <div className="grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-[1fr_120px_120px_160px] md:items-center dark:bg-slate-900"><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-slate-500" /><div><p className="font-medium">{material.title}</p><p className="text-xs text-slate-500">{material.originalName || material.description}</p></div></div><Badge variant="outline" className="w-fit capitalize">{material.type}</Badge><p className="text-sm text-slate-500">{material.viewCount || 0} views</p><div className="flex gap-2 md:justify-end"><Button size="sm" variant="outline" onClick={() => onPreview(material)}>Preview</Button><Button size="sm" variant="destructive" onClick={() => onDelete(material)}>Delete</Button></div></div>;
}

function Stat({ label, value }: any) {
  return <div className="rounded-md bg-white p-3 dark:bg-slate-950"><p className="text-xs text-slate-500">{label}</p><p className="font-semibold">{value}</p></div>;
}
