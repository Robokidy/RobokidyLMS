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
import { Upload, X, FileText, Music, Archive, Code, Plus } from "lucide-react";

export interface MaterialUploaderProps {
  courses: any[];
  lessons?: any[];
  classSections?: any[];
  onUpload: (data: any, file: File) => Promise<void>;
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

/**
 * Shared Material Uploader
 * Used by Admin and Teachers to upload materials
 * Provides consistent upload experience across portals
 */
export const MaterialUploader: React.FC<MaterialUploaderProps> = ({
  courses,
  lessons,
  classSections,
  onUpload,
  onCancel,
  loading,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    courseId: "",
    lessonId: "",
    type: "pdf",
    tags: [] as string[],
    visibility: "teachers",
    classSectionIds: [] as string[],
  });

  const [newTag, setNewTag] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
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
      // Simulate file upload to get path (in real implementation, upload to server/S3)
      const filePath = `/uploads/materials/${Date.now()}_${selectedFile.name}`;

      await onUpload(
        {
          ...formData,
          fileName: selectedFile.name,
          originalName: selectedFile.name,
          filePath,
          mimeType: selectedFile.type,
          size: selectedFile.size,
        },
        selectedFile
      );

      toast({ title: "Success", description: "Material uploaded successfully" });
      setSelectedFile(null);
      setFormData({
        title: "",
        description: "",
        courseId: "",
        lessonId: "",
        type: "pdf",
        tags: [],
        visibility: "teachers",
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
            <p className="text-xs text-slate-500 mt-1">Max file size: 500MB</p>

            {selectedFile && (
              <div className="mt-4 p-3 bg-green-50 rounded text-left">
                <p className="text-sm font-medium text-green-900">Selected: {selectedFile.name}</p>
                <p className="text-xs text-green-700">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
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
                  value={formData.lessonId}
                  onValueChange={(value) => setFormData({ ...formData, lessonId: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select lesson" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
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
      {classSections && classSections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assign to Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {classSections.map((section) => (
                <label key={section._id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.classSectionIds.includes(section._id)}
                    onChange={() => handleClassSectionToggle(section._id)}
                    className="rounded"
                  />
                  <span className="text-sm">{section.sectionName}</span>
                </label>
              ))}
            </div>
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

export default MaterialUploader;
