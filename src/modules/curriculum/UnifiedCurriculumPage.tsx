import React, { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/api/client";
import { BookMarked, Plus } from "lucide-react";
import AdminShell from "@/components/layout/AdminShell";
import StudentLmsShell from "@/components/layout/StudentLmsShell";
import TeacherShell from "@/components/layout/TeacherShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LessonEditor } from "@/modules/editors/LessonEditor";
import { ContentList } from "@/modules/shared/ContentList";
import { LessonService, QuizService } from "@/modules/shared/contentService";

type EditorMode = "create" | "edit" | null;

export const UnifiedCurriculumPage: React.FC<{
  shell?: "admin" | "teacher" | "student";
}> = ({ shell = "admin" }) => {
  const { token, user } = useAuth();
  const { toast } = useToast();

  // State
  const [lessons, setLessons] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseTracks, setCourseTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);

      const [coursesData, lessonsData, quizzesData, tracksData] = await Promise.all([
        apiFetch(`/${shell === "admin" ? "admin" : "teacher"}/courses`, {}, token),
        LessonService.getAll(token, {
          courseId: courseFilter || undefined,
          search: search || undefined,
          page: 1,
          limit: 100,
        }),
        QuizService.getAll(token, { page: 1, limit: 100 }),
        apiFetch("/course-tracks", {}, token),
      ]);

      setCourses(coursesData || []);
      setLessons(lessonsData?.data || []);
      setQuizzes(quizzesData?.data || []);
      setCourseTracks(tracksData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token, courseFilter, search]);

  // Handle create/edit lesson
  const handleCreateLesson = () => {
    setSelectedLesson(null);
    setEditorMode("create");
  };

  const handleEditLesson = (lesson: any) => {
    setSelectedLesson(lesson);
    setEditorMode("edit");
  };

  const handleSaveLesson = async (data: any) => {
    try {
      if (editorMode === "create") {
        await LessonService.create(data, token);
        toast({ title: "Success", description: "Lesson created successfully" });
      } else {
        await LessonService.update(selectedLesson._id, data, token);
        toast({ title: "Success", description: "Lesson updated successfully" });
      }
      setEditorMode(null);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save lesson",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLesson = async (lesson: any) => {
    try {
      await LessonService.delete(lesson._id, token);
      toast({ title: "Success", description: "Lesson deleted successfully" });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lesson",
        variant: "destructive",
      });
    }
  };

  const handlePublishLesson = async (lesson: any) => {
    try {
      if (lesson.isPublished) {
        await LessonService.unpublish(lesson._id, token);
      } else {
        await LessonService.publish(lesson._id, token);
      }
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to publish lesson",
        variant: "destructive",
      });
    }
  };

  // Filter lessons
  const filteredLessons = useMemo(
    () =>
      lessons.filter((lesson) => {
        const query = search.toLowerCase();
        const matchText =
          lesson.title.toLowerCase().includes(query) ||
          lesson.description?.toLowerCase().includes(query);
        return matchText;
      }),
    [lessons, search]
  );

  // Columns for lesson table
  const lessonColumns = [
    {
      key: "title",
      label: "Title",
      render: (value: string, lesson: any) => (
        <div>
          <p className="font-medium">{value}</p>
          <p className="text-xs text-slate-500">{lesson.courseId?.name}</p>
        </div>
      ),
    },
    {
      key: "duration",
      label: "Duration",
      render: (value: number) => <span>{value} min</span>,
    },
    {
      key: "difficulty",
      label: "Level",
      render: (value: string) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium capitalize">
          {value}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value: string, lesson: any) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            lesson.isPublished
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {lesson.isPublished ? "Published" : "Draft"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  // Render with appropriate shell
  const renderContent = () => (
    <div className="space-y-6">
      <Tabs defaultValue="lessons" className="w-full">
        <TabsList>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="space-y-4">
          <ContentList
            title="Curriculum Management"
            description="Create and manage lessons for your courses"
            items={filteredLessons}
            columns={lessonColumns}
            onSearch={setSearch}
            onEdit={handleEditLesson}
            onDelete={handleDeleteLesson}
            onAdd={handleCreateLesson}
            onPublish={handlePublishLesson}
            loading={loading}
            canAdd={shell !== "student"}
            canDelete={shell !== "student"}
            canPublish={shell !== "student"}
            searchPlaceholder="Search lessons..."
            emptyMessage="No lessons found"
          />
        </TabsContent>

        <TabsContent value="quizzes">
          <div className="text-center py-12 text-slate-500">
            Quiz management coming soon...
          </div>
        </TabsContent>
      </Tabs>

      {/* Lesson Editor Dialog */}
      <Dialog open={editorMode !== null} onOpenChange={() => setEditorMode(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editorMode === "create" ? "Create New Lesson" : "Edit Lesson"}
            </DialogTitle>
          </DialogHeader>
          {editorMode && (
            <LessonEditor
              lesson={selectedLesson}
              courses={courses}
              courseTracks={courseTracks}
              onSave={handleSaveLesson}
              onCancel={() => setEditorMode(null)}
              loading={loading}
            />
          )}
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

export default UnifiedCurriculumPage;
