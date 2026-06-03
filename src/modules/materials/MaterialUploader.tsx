import React, { useState, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileText, Music, Archive, Code, Plus } from "lucide-react";

export interface MaterialUploaderProps {
  courses: any[];
  lessons?: any[];
  schools?: any[];
  classSections?: any[];
  onUpload: (data: any, file: File, onProgress?: (progress: number) => void) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const MATERIAL_TYPES = [
  { value: "pdf", label: "PDF Document" },
  { value: "video", label: "Video" },
  { value: "notes", label: "Notes" },
  { value: "worksheet", label: "Worksheet" },
  { value: "image", label: "Image" },
  { value: "zip", label: "Archive" },
  { value: "code", label: "Code Files" },
  { value: "book", label: "Book" },
];
const NONE_VALUE = "__none__";

const MB = 1024 * 1024;
const FILE_LIMITS = [
  { label: "Video", test: (file: File) => file.type.startsWith("video/"), max: 200 * MB },
  { label: "Image", test: (file: File) => file.type.startsWith("image/"), max: 10 * MB },
  { label: "PDF", test: (file: File) => file.type === "application/pdf", max: 50 * MB },
  { label: "Presentation", test: (file: File) => file.type.includes("powerpoint") || file.type.includes("presentation"), max: 50 * MB },
  { label: "Document", test: (file: File) => file.type.includes("word") || file.name.toLowerCase().endsWith(".docx"), max: 50 * MB },
  { label: "Archive", test: (file: File) => file.type.includes("zip") || file.name.toLowerCase().endsWith(".zip"), max: 50 * MB },
];

function fileLimit(file: File) {
  return FILE_LIMITS.find((limit) => limit.test(file)) || { label: "File", max: 50 * MB };
}

/**
 * Shared Material Uploader
 * Used by Admin and Teachers to upload materials
 * Provides consistent upload experience across portals
 */
export const MaterialUploader: React.FC<MaterialUploaderProps> = ({
  courses,
  lessons,
  schools = [],
  classSections,
  onUpload,
  onCancel,
  loading,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    courseId: "",
    lessonId: "",
    type: "pdf",
    tags: [] as string[],
    visibility: "teachers",
    schoolIds: [] as string[],
    gradeLevels: [] as string[],
    classSectionIds: [] as string[],
  });

  const [newTag, setNewTag] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const limit = fileLimit(file);
      if (file.size > limit.max) {
        toast({
          title: "File too large",
          description: `${limit.label} files can be up to ${Math.round(limit.max / MB)} MB.`,
          variant: "destructive"
        });
        e.target.value = "";
        return;
      }
      setSelectedFile(file);
      setUploadProgress(0);
      setFormData({ ...formData, title: file.name.replace(/\.[^/.]+$/, "") });

      // Detect file type
      if (file.type.startsWith("video/")) {
        setFormData((prev) => ({ ...prev, type: "video" }));
      } else if (file.type === "application/pdf") {
        setFormData((prev) => ({ ...prev, type: "pdf" }));
      } else if (file.type.includes("zip")) {
        setFormData((prev) => ({ ...prev, type: "zip" }));
      }

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
        setFormData((prev) => ({ ...prev, type: "image" }));
      }
    }
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const handleClassSectionToggle = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      classSectionIds: prev.classSectionIds.includes(id)
        ? prev.classSectionIds.filter((sid) => sid !== id)
        : [...prev.classSectionIds, id],
    }));
  };

  const toggleArrayValue = (key: "schoolIds" | "gradeLevels" | "classSectionIds", value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));
  };

  const labelFor = (item: any) => item.name || item.sectionName || [item.grade, item.section].filter(Boolean).join(" - ") || item.title || item._id;

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please select a file", variant: "destructive" });
      return;
    }

    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }

    if (!formData.courseId) {
      toast({ title: "Error", description: "Course is required", variant: "destructive" });
      return;
    }

    try {
      await onUpload(
        {
          ...formData,
          schoolId: formData.schoolIds[0],
          grade: formData.gradeLevels[0] || "",
          assignments: [
            ...formData.schoolIds.map((id) => ({ type: "school", refId: id, label: labelFor(schools.find((school) => school._id === id) || {}) })),
            ...formData.gradeLevels.map((grade) => ({ type: "grade", label: grade })),
            ...formData.classSectionIds.map((id) => ({ type: "class", refId: id, label: labelFor(classSections?.find((section) => section._id === id) || {}) })),
          ],
          fileName: selectedFile.name,
          originalName: selectedFile.name,
          mimeType: selectedFile.type,
          size: selectedFile.size,
        },
        selectedFile,
        setUploadProgress
      );
      setUploadProgress(100);

      toast({ title: "Success", description: "Material uploaded successfully" });
      setSelectedFile(null);
      setUploadProgress(0);
      setFormData({
        title: "",
        description: "",
        courseId: "",
        lessonId: "",
        type: "pdf",
        tags: [],
        visibility: "teachers",
        schoolIds: [],
        gradeLevels: [],
        classSectionIds: [],
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload material",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Upload Materials</p>
            <h2 className="mt-2 text-3xl font-semibold">Share Learning Materials</h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload PDFs, videos, worksheets, and other resources for your classes
            </p>
          </div>
        </div>
      </section>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Select File</CardTitle>
          <CardDescription>Supported formats: PDF, Video, Images, Archives, Documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-sm font-medium">Click to upload or drag and drop</p>
            <p className="text-xs text-slate-500 mt-1">PDF/PPT/DOC/ZIP up to 50 MB, images 10 MB, videos 200 MB</p>

            {selectedFile && (
              <div className="mt-4 p-3 bg-green-50 rounded text-left">
                <p className="text-sm font-medium text-green-900">Selected: {selectedFile.name}</p>
                <p className="text-xs text-green-700">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            {loading && (
              <div className="mt-4 space-y-2 text-left">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {preview && (
              <div className="mt-4">
                <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Material Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Material title"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this material"
              className="mt-1"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Course *</label>
              <Select
                value={formData.courseId}
                onValueChange={(value) => setFormData({ ...formData, courseId: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.filter((c) => c.active).map((course) => (
                    <SelectItem key={course._id} value={course._id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {lessons && lessons.length > 0 && (
              <div>
                <label className="text-sm font-medium">Lesson (Optional)</label>
                <Select
                  value={formData.lessonId || NONE_VALUE}
                  onValueChange={(value) => setFormData({ ...formData, lessonId: value === NONE_VALUE ? "" : value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select lesson" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>None</SelectItem>
                    {lessons.map((lesson) => (
                      <SelectItem key={lesson._id} value={lesson._id}>
                        {lesson.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Material Type *</label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Visibility</label>
              <Select
                value={formData.visibility}
                onValueChange={(value) => setFormData({ ...formData, visibility: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="teachers">Teachers Only</SelectItem>
                  <SelectItem value="students">Students</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Sections */}
      {((schools && schools.length > 0) || (classSections && classSections.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle>Assign Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {schools.length > 0 && (
              <AssignmentGroup
                title="Schools"
                items={schools}
                values={formData.schoolIds}
                getLabel={labelFor}
                onToggle={(id) => toggleArrayValue("schoolIds", id)}
              />
            )}
            <AssignmentGroup
              title="Grades"
              items={Array.from({ length: 12 }, (_, index) => ({ _id: `Grade ${index + 1}`, name: `Grade ${index + 1}` }))}
              values={formData.gradeLevels}
              getLabel={labelFor}
              onToggle={(id) => toggleArrayValue("gradeLevels", id)}
            />
            {classSections && classSections.length > 0 && (
              <AssignmentGroup
                title="Classes"
                items={classSections}
                values={formData.classSectionIds}
                getLabel={labelFor}
                onToggle={(id) => handleClassSectionToggle(id)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag"
              onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
            />
            <Button onClick={handleAddTag} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, idx) => (
                <Badge key={idx} variant="secondary">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(idx)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleUpload} disabled={loading || !selectedFile}>
          {loading ? "Uploading..." : "Upload Material"}
        </Button>
      </div>
    </div>
  );
};

function AssignmentGroup({ title, items, values, onToggle, getLabel }: any) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {items.map((item: any) => (
          <label key={item._id} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.includes(item._id)}
              onChange={() => onToggle(item._id)}
              className="rounded"
            />
            <span>{getLabel(item)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default MaterialUploader;
