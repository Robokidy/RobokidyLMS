import React, { useEffect, useMemo, useState } from "react";
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

type UploaderMode = "create" | null;

export const UnifiedMaterialsPage: React.FC<{
  shell?: "admin" | "teacher" | "student";
}> = ({ shell = "admin" }) => {
  const { token, user } = useAuth();
  const { toast } = useToast();

  // State
  const [materials, setMaterials] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [classSections, setClassSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploaderOpen, setUploaderOpen] = useState(false);
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
        classSectionsData,
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
        apiFetch(
          `/${shell === "admin" ? "admin" : "teacher"}/class-sections`,
          {},
          token
        ),
      ]);

      setCourses(coursesData || []);
      setMaterials(materialsData?.data || []);
      setLessons(lessonsData || []);
      setClassSections(classSectionsData || []);
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
  const handleUploadMaterial = async (data: any, file: File) => {
    try {
      // In a real implementation, upload the file first
      // For now, we'll just create the material record
      await MaterialService.create(data, token);
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
        onEdit={() => toast({ title: "Info", description: "Edit feature coming soon" })}
        onDelete={handleDeleteMaterial}
        onAdd={() => setUploaderOpen(true)}
        onPublish={handlePublishMaterial}
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
            classSections={classSections}
            onUpload={handleUploadMaterial}
            onCancel={() => setUploaderOpen(false)}
            loading={loading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );

  // Select shell based on user role
  if (shell === "admin") {
    return <AdminShell>{renderContent()}</AdminShell>;
  } else if (shell === "teacher") {
    return <TeacherShell>{renderContent()}</TeacherShell>;
  } else {
    return <StudentLmsShell>{renderContent()}</StudentLmsShell>;
  }
};

export default UnifiedMaterialsPage;
