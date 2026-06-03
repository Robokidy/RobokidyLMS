import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BookMarked, ExternalLink, FileText, Search, Trash2, Video } from "lucide-react";
import { API_BASE, apiFetch } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Course, Material, MaterialType } from "@/types";
import { MaterialService } from "@/services/materialService";

const materialTypes: MaterialType[] = ["pdf", "book", "notes", "video"];

export default function MaterialsPage() {
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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const [courseData, materialData] = await Promise.all([
        apiFetch("/teacher/courses", {}, token),
        MaterialService.getTeacherMaterials(token)
      ]);
      setCourses(courseData || []);
      setMaterials(materialData || []);
      if (!form.courseId && courseData?.[0]) {
        setForm((prev) => ({ ...prev, courseId: courseData[0]._id }));
      }
    } catch (error) {
      console.error("Error loading materials:", error);
      toast({ title: "Error", description: "Failed to load materials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const createMaterial = async () => {
    if (!file) {
      toast({ title: "Error", description: "Please select a file", variant: "destructive" });
      return;
    }
    if (!form.title.trim() || !form.courseId) {
      toast({ title: "Error", description: "Title and course are required", variant: "destructive" });
      return;
    }

    try {
      await MaterialService.uploadMaterial(file, form, token, "teacher");
      setForm((prev) => ({ ...prev, title: "", description: "" }));
      setFile(null);
      toast({ title: "Success", description: `${form.title} has been uploaded successfully` });
      load();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Upload failed", variant: "destructive" });
    }
  };

  const disableMaterial = async (id: string) => {
    try {
      await MaterialService.deleteMaterial(id, token, "teacher");
      toast({ title: "Success", description: "Material deleted successfully", variant: "destructive" });
      setDeletingMaterial(null);
      load();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete material", variant: "destructive" });
    }
  };

  const filtered = useMemo(
    () => materials.filter((material) => 
      `${material.title} ${material.description} ${typeof material.courseId === "object" ? material.courseId.name : ""} ${typeof material.courseTrackId === "object" ? material.courseTrackId.trackName : ""}`.toLowerCase().includes(search.toLowerCase())
    ),
    [materials, search]
  );

  const activeCount = materials.filter((material) => material.active).length;
  const videoCount = materials.filter((material) => material.type === "video").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Materials</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{materials.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{activeCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Videos</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{videoCount}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Add Material File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input 
              value={form.title} 
              onChange={(e) => setForm({ ...form, title: e.target.value })} 
              placeholder="Material title" 
            />
            <Input 
              value={form.description} 
              onChange={(e) => setForm({ ...form, description: e.target.value })} 
              placeholder="Short description" 
            />
            <select 
              className="h-10 w-full rounded-md border bg-background px-3 text-sm" 
              value={form.courseId} 
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            >
              <option value="">Select a course</option>
              {courses.filter((course) => course.active).map((course) => (
                <option key={course._id} value={course._id}>
                  {course.name}
                </option>
              ))}
            </select>
            <select 
              className="h-10 w-full rounded-md border bg-background px-3 text-sm" 
              value={form.type} 
              onChange={(e) => setForm({ ...form, type: e.target.value as MaterialType })}
            >
              {materialTypes.map((type) => (
                <option key={type} value={type}>
                  {type.toUpperCase()}
                </option>
              ))}
            </select>
            <select 
              className="h-10 w-full rounded-md border bg-background px-3 text-sm" 
              value={form.language} 
              onChange={(e) => setForm({ ...form, language: e.target.value as "en" | "ta" | "both" })}
            >
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
            <Button 
              className="w-full" 
              onClick={createMaterial} 
              disabled={!form.title.trim() || !form.courseId || !file || loading}
            >
              <BookMarked className="h-4 w-4 mr-2" /> Upload Material
            </Button>
            <p className="text-xs text-muted-foreground">
              Students in the course will see this material automatically.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Material Library</CardTitle>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search materials" 
                className="pl-9 md:w-72" 
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-slate-500">Loading materials…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((material) => (
                    <TableRow key={material._id}>
                      <TableCell className="font-medium">{material.title}</TableCell>
                      <TableCell>
                        {typeof material.courseId === "object"
                          ? material.courseId.name
                          : typeof material.courseTrackId === "object"
                            ? material.courseTrackId.trackName
                            : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {material.type === "video" ? (
                            <Video className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-slate-500" />
                          )}
                          {material.type.toUpperCase()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={material.active ? "default" : "secondary"}>
                          {material.active ? "Published" : "Archived"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {material.cloudinarySecureUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(material.cloudinarySecureUrl, "_blank", "noopener,noreferrer")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingMaterial(material)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!loading && filtered.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-500">
                No materials found. Upload your first material to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingMaterial} onOpenChange={(open) => !open && setDeletingMaterial(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingMaterial?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingMaterial && disableMaterial(deletingMaterial._id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
