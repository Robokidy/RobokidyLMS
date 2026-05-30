import { useEffect, useMemo, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { BookMarked, FileText, Search, Trash2, Video } from "lucide-react";
import { API_BASE, apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import AdminShell from "@/components/layout/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Course, Material, MaterialType } from "@/types";

// grade-based assignment removed; materials are assigned to courses

const materialTypes: MaterialType[] = ["pdf", "book", "notes", "video"];

export default function AdminMaterialsPage() {
  const { token } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    courseId: "",
    type: "pdf" as MaterialType,
    language: "en" as "en" | "ta" | "both"
  });
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const { toast } = useToast();

  const load = async () => {
    const [courseData, materialData] = await Promise.all([
      apiFetch("/admin/courses", {}, token),
      apiFetch("/admin/materials", {}, token)
    ]);
    setCourses(courseData);
    setMaterials(materialData);
    if (!form.courseId && courseData[0]) setForm((prev) => ({ ...prev, courseId: courseData[0]._id }));
  };

  useEffect(() => { load(); }, [token]);

  const createMaterial = async () => {
    if (!file) return;

    const params = new URLSearchParams({
      title: form.title,
      description: form.description,
      courseId: form.courseId,
      type: form.type,
      language: form.language,
      fileName: file.name
    });

    const res = await fetch(`${API_BASE}/admin/materials?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        Authorization: `Bearer ${token}`
      },
      body: file
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Upload failed");

    setForm((prev) => ({ ...prev, title: "", description: "" }));
    setFile(null);
    toast({ title: "Material uploaded", description: `${data.title} is available to assigned course learners.` });
    load();
  };

  const disableMaterial = async (id: string) => {
    await apiFetch(`/admin/materials/${id}`, { method: "DELETE" }, token);
    toast({ title: "Material deleted", description: `The material has been removed.` , variant: "destructive" });
    setDeletingMaterial(null);
    load();
  };

  const filtered = useMemo(
    () => materials.filter((material) => `${material.title} ${material.description} ${material.courseId?.name || ""}`.toLowerCase().includes(search.toLowerCase())),
    [materials, search]
  );

  const activeCount = materials.filter((material) => material.active).length;
  const videoCount = materials.filter((material) => material.type === "video").length;

  return (
    <AdminShell title="Materials" subtitle="Upload files and assign them by course">
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Materials</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{materials.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Active</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{activeCount}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Videos</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{videoCount}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Add Material File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Material title" />
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
              {courses.filter((course) => course.active).map((course) => <option key={course._id} value={course._id}>{course.name}</option>)}
            </select>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MaterialType })}>
              {materialTypes.map((type) => <option key={type} value={type}>{type.toUpperCase()}</option>)}
            </select>
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as "en" | "ta" | "both" })}>
              <option value="en">English</option>
              <option value="ta">Tamil</option>
              <option value="both">English + Tamil</option>
            </select>
            <Input
              type="file"
              accept=".pdf,.txt,.doc,.docx,.mp4,.webm,.ogg,application/pdf,video/mp4,video/webm,video/ogg,text/plain"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && <p className="text-xs text-muted-foreground">{file.name} ({Math.round(file.size / 1024)} KB)</p>}
            <Button className="w-full" onClick={createMaterial} disabled={!form.title.trim() || !form.courseId || !file}>
              <BookMarked className="h-4 w-4 mr-2" /> Upload Material
            </Button>
            <p className="text-xs text-muted-foreground">
              Students see this file automatically when their assigned course matches.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Material Library</CardTitle>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search materials" className="pl-9 md:w-72" />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((material) => (
                  <TableRow key={material._id}>
                    <TableCell>
                      <div className="font-medium">{material.title}</div>
                      <div className="text-xs text-muted-foreground">{material.description}</div>
                    </TableCell>
                    <TableCell>{material.courseId?.name}</TableCell>
                    <TableCell><Badge variant="outline">{material.type === "video" ? <Video className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}{material.type}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{material.originalName || "-"}{material.size ? ` (${Math.round(material.size / 1024)} KB)` : ""}</TableCell>
                    <TableCell><Badge variant={material.active ? "secondary" : "outline"}>{material.active ? "Active" : "Disabled"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => setDeletingMaterial(material)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={Boolean(deletingMaterial)} onOpenChange={(isOpen) => !isOpen && setDeletingMaterial(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete material?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the material and its file from storage. Students will no longer be able to access it.
            </AlertDialogDescription>
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
