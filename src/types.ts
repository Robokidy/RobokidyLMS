export type CourseTrack = { _id: string; trackName: string; trackCode: string; description?: string; category?: string; grade?: string; icon?: string; status?: string; active: boolean };
export type Course = { _id: string; name: string; slug: string; description: string; active: boolean };
export type Lesson = { _id: string; title: string; courseId?: Course | string; courseTrackId?: CourseTrack | string; content: string; examples: Array<{ code: string; output: string; explanation: string }> };
export type Quiz = { _id: string; lessonId: string; questions: Array<{ question: string; options: string[]; correctAnswer: number }> };
export type Grade =
  | "grade1"
  | "grade2"
  | "grade3"
  | "grade4"
  | "grade5"
  | "grade6"
  | "grade7"
  | "grade8"
  | "grade9"
  | "grade10";
export type MaterialType = "pdf" | "book" | "notes" | "video" | "worksheet" | "presentation" | "zip" | "image" | "code" | "other";
export type Material = {
  _id: string;
  title: string;
  description: string;
  grade?: Grade; // kept optional for backward compatibility during migration
  courseId: Course | string;
  courseTrackId?: CourseTrack | string;
  type: MaterialType;
  fileUrl?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  language: "en" | "ta" | "both";
  active: boolean;
  createdAt: string;
  viewer?: {
    disableDownload: boolean;
    disablePrint: boolean;
    disableCopy: boolean;
    watermark: string;
  };
};
