import React, { useState, useCallback } from "react";
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
import { X, Plus, BookMarked, Clock, BarChart3 } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export interface LessonEditorProps {
  lesson?: any;
  courses: any[];
  courseTracks?: any[];
  schools?: any[];
  classSections?: any[];
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ["bold", "italic", "underline", "strike"],
    ["blockquote", "code-block"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["link", "image", "video"],
    [{ align: [] }],
    [{ color: [] }, { background: [] }],
    ["clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "code-block",
  "list",
  "bullet",
  "indent",
  "link",
  "image",
  "video",
  "align",
  "color",
  "background",
];
const NONE_VALUE = "__none__";

/**
 * Shared Lesson/Curriculum Editor
 * Rich text editor for creating and editing lessons
 * Shared between Admin and Teacher portals
 */
export const LessonEditor: React.FC<LessonEditorProps> = ({
  lesson,
  courses,
  courseTracks,
  schools = [],
  classSections = [],
  onSave,
  onCancel,
  loading,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: lesson?.title || "",
    description: lesson?.description || "",
    content: lesson?.content || "",
    courseId: lesson?.courseId?._id || lesson?.courseId || "",
    courseTrackId: lesson?.courseTrackId?._id || lesson?.courseTrackId || "",
    duration: lesson?.duration || 30,
    difficulty: lesson?.difficulty || "beginner",
    objectives: lesson?.objectives || [],
    keyPoints: lesson?.keyPoints || [],
    tags: lesson?.tags || [],
    visibility: lesson?.visibility || "teachers",
    status: lesson?.status || "draft",
    schoolIds: (lesson?.assignments || []).filter((item: any) => item.type === "school").map((item: any) => item.refId) || (lesson?.schoolId ? [lesson.schoolId?._id || lesson.schoolId] : []),
    gradeLevels: lesson?.gradeLevels || (lesson?.assignments || []).filter((item: any) => item.type === "grade").map((item: any) => item.label),
    classSectionIds: lesson?.classSectionIds?.map((item: any) => item._id || item) || [],
  });

  const [newObjective, setNewObjective] = useState("");
  const [newKeyPoint, setNewKeyPoint] = useState("");
  const [newTag, setNewTag] = useState("");

  const handleAddObjective = useCallback(() => {
    if (newObjective.trim()) {
      setFormData((prev) => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()],
      }));
      setNewObjective("");
    }
  }, [newObjective]);

  const handleRemoveObjective = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index),
    }));
  }, []);

  const handleAddKeyPoint = useCallback(() => {
    if (newKeyPoint.trim()) {
      setFormData((prev) => ({
        ...prev,
        keyPoints: [...prev.keyPoints, newKeyPoint.trim()],
      }));
      setNewKeyPoint("");
    }
  }, [newKeyPoint]);

  const handleRemoveKeyPoint = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      keyPoints: prev.keyPoints.filter((_, i) => i !== index),
    }));
  }, []);

  const handleAddTag = useCallback(() => {
    if (newTag.trim()) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  }, [newTag]);

  const handleRemoveTag = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  }, []);

  const labelFor = (item: any) => item.name || item.sectionName || [item.grade, item.section].filter(Boolean).join(" - ") || item.title || item._id;

  const toggleArrayValue = (key: "schoolIds" | "gradeLevels" | "classSectionIds", value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item: string) => item !== value)
        : [...prev[key], value],
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }
    if (!formData.courseId) {
      toast({ title: "Error", description: "Course is required", variant: "destructive" });
      return;
    }
    if (!formData.content.trim()) {
      toast({ title: "Error", description: "Content is required", variant: "destructive" });
      return;
    }

    try {
      await onSave({
        ...formData,
        schoolId: formData.schoolIds[0],
        assignments: [
          ...formData.schoolIds.map((id) => ({ type: "school", refId: id, label: labelFor(schools.find((school) => school._id === id) || {}) })),
          ...formData.gradeLevels.map((grade) => ({ type: "grade", label: grade })),
          ...formData.classSectionIds.map((id) => ({ type: "class", refId: id, label: labelFor(classSections.find((section) => section._id === id) || {}) })),
        ],
      });
      toast({ title: "Success", description: "Lesson saved successfully" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save lesson",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {lesson ? "Edit Lesson" : "Create New Lesson"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold">
              {lesson ? "Update Lesson Content" : "Build Your Lesson"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create rich, engaging lesson content with multimedia support
            </p>
          </div>
        </div>
      </section>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Lesson title"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the lesson"
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

            {courseTracks && courseTracks.length > 0 && (
              <div>
                <label className="text-sm font-medium">Course Track</label>
                <Select
                  value={formData.courseTrackId || NONE_VALUE}
                  onValueChange={(value) => setFormData({ ...formData, courseTrackId: value === NONE_VALUE ? "" : value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select track (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>None</SelectItem>
                    {courseTracks.map((track) => (
                      <SelectItem key={track._id} value={track._id}>
                        {track.trackName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Access Assignment */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Access</CardTitle>
          <CardDescription>Select all schools, grades, and classes that can use this lesson</CardDescription>
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
          {classSections.length > 0 && (
            <AssignmentGroup
              title="Classes"
              items={classSections}
              values={formData.classSectionIds}
              getLabel={labelFor}
              onToggle={(id) => toggleArrayValue("classSectionIds", id)}
            />
          )}
        </CardContent>
      </Card>

      {/* Content Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Lesson Content *</CardTitle>
          <CardDescription>Rich text editor with full formatting support</CardDescription>
        </CardHeader>
        <CardContent>
          <ReactQuill
            value={formData.content}
            onChange={(value) => setFormData({ ...formData, content: value })}
            modules={modules}
            formats={formats}
            theme="snow"
            className="bg-white dark:bg-slate-900"
            placeholder="Write your lesson content here..."
          />
        </CardContent>
      </Card>

      {/* Learning Objectives */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="h-4 w-4" />
            Learning Objectives
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              placeholder="Add a learning objective"
              onKeyPress={(e) => e.key === "Enter" && handleAddObjective()}
            />
            <Button onClick={handleAddObjective} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {formData.objectives.length > 0 && (
            <div className="space-y-2">
              {formData.objectives.map((obj, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                  <span className="text-sm">{obj}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveObjective(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Points */}
      <Card>
        <CardHeader>
          <CardTitle>Key Points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newKeyPoint}
              onChange={(e) => setNewKeyPoint(e.target.value)}
              placeholder="Add a key point"
              onKeyPress={(e) => e.key === "Enter" && handleAddKeyPoint()}
            />
            <Button onClick={handleAddKeyPoint} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {formData.keyPoints.length > 0 && (
            <div className="space-y-2">
              {formData.keyPoints.map((point, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                  <span className="text-sm">{point}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveKeyPoint(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duration (minutes)
              </label>
              <Input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                className="mt-1"
                min="1"
              />
            </div>

            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Difficulty
              </label>
              <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Visibility</label>
              <Select value={formData.visibility} onValueChange={(value) => setFormData({ ...formData, visibility: value })}>
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

            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : lesson ? "Update Lesson" : "Create Lesson"}
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

export default LessonEditor;
