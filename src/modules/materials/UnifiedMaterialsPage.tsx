import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/api/client";
import { FileText, Plus } from "lucide-react";
import AdminShell from "@/components/layout/AdminShell";
import StudentLmsShell from "@/components/layout/StudentLmsShell";
import TeacherShell from "@/components/layout/TeacherShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MaterialUploader } from "@/modules/materials/MaterialUploader";
import { ContentList } from "@/modules/shared/ContentList";
import { MaterialService } from "@/modules/shared/contentService";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type UploaderMode = "create" | null;

export const UnifiedMaterialsPage: React.FC<{
  shell?: "admin" | "teacher" | "student";
}> = ({ shell = "admin" }) => {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [materials, setMaterials] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [classSections, setClassSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);

      const [
        coursesData,
        materialsData,
        lessonsData,
        optionsData,
      ] = await Promise.all([
        apiFetch(`/${shell === "admin" ? "admin" : "teacher"}/courses`, {}, token),
        MaterialService.getAll(token, {
          courseId: courseFilter || undefined,
          type: typeFilter || undefined,
          search: search || undefined,
          page: 1,
          limit: 100,
        }),
        apiFetch(
          `/${shell === "admin" ? "admin" : "teacher"}/lessons`,
          {},
          token
        ),
        apiFetch(`/${shell === "admin" ? "admin" : "teacher"}/filter-options`, {}, token),
      ]);

      setCourses(coursesData || []);
      setMaterials(materialsData?.data || []);
      setLessons(lessonsData || []);
      setSchools(optionsData?.schools || []);
      setClassSections(optionsData?.classes || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token, courseFilter, typeFilter, search]);

  // Handle upload
  const handleUploadMaterial = async (data: any, file: File, onProgress?: (progress: number) => void) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        formData.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
      });
      await MaterialService.create(formData, token, onProgress);
      toast({ title: "Success", description: "Material uploaded successfully" });
      setUploaderOpen(false);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload material",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMaterial = async (material: any) => {
    try {
      await MaterialService.delete(material._id, token);
      toast({ title: "Success", description: "Material deleted successfully" });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete material",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMaterial = async (data: any) => {
    if (!editingMaterial) return;
    try {
      await MaterialService.update(editingMaterial._id, data, token);
      toast({ title: "Success", description: "Material access updated successfully" });
      setEditingMaterial(null);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update material",
        variant: "destructive",
      });
    }
  };

  const handlePublishMaterial = async (material: any) => {
    try {
      if (material.isPublished) {
        await MaterialService.unpublish(material._id, token);
      } else {
        await MaterialService.publish(material._id, token);
      }
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to publish material",
        variant: "destructive",
      });
    }
  };

  const handleOpenSecureViewer = (material: any) => {
    const base = shell === "teacher" ? "/teacher/materials" : shell === "admin" ? "/admin/materials" : "/student/materials";
    navigate(`${base}/${material._id}`);
  };

  // Filter materials
  const filteredMaterials = useMemo(
    () =>
      materials.filter((material) => {
        const query = search.toLowerCase();
        const matchText =
          material.title.toLowerCase().includes(query) ||
          material.description?.toLowerCase().includes(query);
        const matchType = !typeFilter || material.type === typeFilter;
        return matchText && matchType;
      }),
    [materials, search, typeFilter]
  );

  // Columns for materials table
  const materialColumns = [
    {
      key: "title",
      label: "Title",
      render: (value: string, material: any) => (
        <div>
          <p className="font-medium">{value}</p>
          <p className="text-xs text-slate-500">{material.courseId?.name}</p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (value: string) => (
        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium capitalize">
          {value}
        </span>
      ),
    },
    {
      key: "size",
      label: "Size",
      render: (value: number) => <span>{(value / 1024 / 1024).toFixed(2)} MB</span>,
    },
    {
      key: "downloadCount",
      label: "Downloads",
      render: (value: number) => <span>{value || 0}</span>,
    },
    {
      key: "createdAt",
      label: "Created",
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  // Render content
  const renderContent = () => (
    <div className="space-y-6">
      <ContentList
        title="Materials Management"
        description="Upload and organize learning materials for your classes"
        items={filteredMaterials}
        columns={materialColumns}
        onSearch={setSearch}
        onEdit={setEditingMaterial}
        onDelete={handleDeleteMaterial}
        onAdd={() => setUploaderOpen(true)}
        onPublish={handlePublishMaterial}
        onDownload={handleOpenSecureViewer}
        loading={loading}
        canAdd={shell !== "student"}
        canDelete={shell !== "student"}
        canPublish={shell !== "student"}
        searchPlaceholder="Search materials..."
        emptyMessage="No materials found"
      />

      {/* Material Uploader Dialog */}
      <Dialog open={uploaderOpen} onOpenChange={setUploaderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload New Material</DialogTitle>
          </DialogHeader>
          <MaterialUploader
            courses={courses}
            lessons={lessons}
            schools={schools}
            classSections={classSections}
            onUpload={handleUploadMaterial}
            onCancel={() => setUploaderOpen(false)}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingMaterial)} onOpenChange={(open) => !open && setEditingMaterial(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Material Access</DialogTitle>
          </DialogHeader>
          {editingMaterial && (
            <MaterialAccessEditor
              material={editingMaterial}
              courses={courses}
              schools={schools}
              classSections={classSections}
              onSave={handleUpdateMaterial}
              onCancel={() => setEditingMaterial(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  // Select shell based on user role
  if (shell === "admin") {
    return <AdminShell title="Materials" subtitle="Upload, assign, edit, and publish learning materials">{renderContent()}</AdminShell>;
  } else if (shell === "teacher") {
    return renderContent();
  } else {
    return <StudentLmsShell>{renderContent()}</StudentLmsShell>;
  }
};

function optionLabel(item: any) {
  return item?.name || item?.sectionName || [item?.grade, item?.section].filter(Boolean).join(" - ") || item?.title || item?._id || "-";
}

function MaterialAccessEditor({ material, courses, schools, classSections, onSave, onCancel }: any) {
  const schoolIdsFromAssignments = (material.assignments || []).filter((item: any) => item.type === "school").map((item: any) => item.refId);
  const gradeLevelsFromAssignments = (material.assignments || []).filter((item: any) => item.type === "grade").map((item: any) => item.label);
  const classIdsFromAssignments = (material.assignments || []).filter((item: any) => item.type === "class").map((item: any) => item.refId);

  const [form, setForm] = useState({
    title: material.title || "",
    description: material.description || "",
    courseId: material.courseId?._id || material.courseId || "",
    visibility: material.visibility || "students",
    schoolIds: schoolIdsFromAssignments.length ? schoolIdsFromAssignments : (material.schoolId ? [material.schoolId?._id || material.schoolId] : []),
    gradeLevels: gradeLevelsFromAssignments.length ? gradeLevelsFromAssignments : (material.grade ? [material.grade] : []),
    classSectionIds: classIdsFromAssignments.length ? classIdsFromAssignments : (material.classSectionIds || []).map((item: any) => item._id || item),
  });

  const toggleArrayValue = (key: "schoolIds" | "gradeLevels" | "classSectionIds", value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item: string) => item !== value)
        : [...prev[key], value],
    }));
  };

  const save = () => {
    onSave({
      title: form.title,
      description: form.description,
      courseId: form.courseId,
      visibility: form.visibility,
      schoolId: form.schoolIds[0],
      grade: form.gradeLevels[0] || "",
      classSectionIds: form.classSectionIds,
      assignments: [
        ...form.schoolIds.map((id) => ({ type: "school", refId: id, label: optionLabel(schools.find((school: any) => school._id === id) || {}) })),
        ...form.gradeLevels.map((grade) => ({ type: "grade", label: grade })),
        ...form.classSectionIds.map((id) => ({ type: "class", refId: id, label: optionLabel(classSections.find((section: any) => section._id === id) || {}) })),
      ],
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Course</label>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })}>
            <option value="">No course</option>
            {(courses || []).filter((course: any) => course.active).map((course: any) => <option key={course._id} value={course._id}>{course.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={2} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Visibility</label>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value })}>
            <option value="private">Private</option>
            <option value="teachers">Teachers Only</option>
            <option value="students">Students</option>
            <option value="public">Public</option>
          </select>
        </div>
      </div>

      <AccessCheckboxGroup title="Schools" items={schools} values={form.schoolIds} onToggle={(id: string) => toggleArrayValue("schoolIds", id)} />
      <AccessCheckboxGroup title="Grades" items={Array.from({ length: 12 }, (_, index) => ({ _id: `Grade ${index + 1}`, name: `Grade ${index + 1}` }))} values={form.gradeLevels} onToggle={(id: string) => toggleArrayValue("gradeLevels", id)} />
      <AccessCheckboxGroup title="Classes" items={classSections} values={form.classSectionIds} onToggle={(id: string) => toggleArrayValue("classSectionIds", id)} />

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={save} disabled={!form.title.trim()}>Save Access</Button>
      </div>
    </div>
  );
}

function AccessCheckboxGroup({ title, items = [], values = [], onToggle }: any) {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <p className="text-sm font-medium">{title}</p>
      <div className="grid gap-2 md:grid-cols-3">
        {items.map((item: any) => {
          const id = String(item?._id || item?.id || item?.value || "");
          if (!id) return null;
          return (
            <label key={id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={(values || []).map(String).includes(id)} onChange={() => onToggle(id)} />
              <span>{optionLabel(item)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default UnifiedMaterialsPage;
