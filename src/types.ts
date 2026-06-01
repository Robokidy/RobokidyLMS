export type CourseTrack = { _id: string; trackName: string; trackCode: string; description?: string; category?: string; grade?: string; icon?: string; status?: string; active: boolean };
export type Course = { _id: string; name: string; slug: string; description: string; active: boolean };
export type Lesson = {
  _id: string;
  title: string;
  description?: string;
  content: string;
  contentMarkdown?: string;
  courseId?: Course | string;
  courseTrackId?: CourseTrack | string;
  module?: string;
  chapter?: string;
  objectives?: string[];
  keyPoints?: string[];
  duration?: number;
  difficulty?: string;
  tags?: string[];
  visibility?: string;
  gradeLevels?: string[];
  classSectionIds?: string[];
  unlockType?: string;
  unlockDate?: string;
  unlockAfterLessonIds?: string[];
  unlockAfterAssessmentId?: string;
  unlockRequiresApproval?: boolean;
  thumbnailUrl?: string;
  bannerUrl?: string;
  coverUrl?: string;
  contentBlocks?: any[];
  attachments?: any[];
  prerequisites?: string[];
  status?: string;
  isPublished?: boolean;
  publishedDate?: string;
  examples: Array<{ code: string; output: string; explanation: string }>;
};
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
export type MaterialType = "pdf" | "book" | "notes" | "video" | "audio" | "doc" | "worksheet" | "presentation" | "zip" | "image" | "code" | "other";
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
  status?: "draft" | "published" | "archived";
  thumbnailUrl?: string;
  viewCount?: number;
  downloadCount?: number;
  createdAt: string;
  viewer?: {
    disableDownload: boolean;
    disablePrint: boolean;
    disableCopy: boolean;
    watermark: string;
  };
};

// Fee Management Types
export type FeeType = "monthly" | "quarterly" | "yearly" | "course-based" | "custom" | "none";
export type FeeStatus = "paid" | "partially-paid" | "pending" | "overdue" | "waived" | "scholarship";
export type PaymentMethod = "cash" | "check" | "bank-transfer" | "online" | "other";

export type Payment = {
  _id?: string;
  amount: number;
  paidAt: string | Date;
  method: PaymentMethod;
  reference?: string;
  receiptNo?: string;
  remarks?: string;
};

export type FeeAccount = {
  _id: string;
  schoolId: string | { _id: string; name?: string; code?: string };
  classSectionId?: string | { _id: string; name?: string; grade?: string; section?: string };
  studentId: string | { _id: string; fullName?: string; username?: string; rollNumber?: string; studentId?: string };
  feeType: FeeType;
  totalFees: number;
  paidAmount: number;
  pendingAmount?: number;
  currency?: string;
  customOverride?: boolean;
  dueDate?: string | Date;
  payments: Payment[];
  status: FeeStatus;
  lastPaymentDate?: string | Date;
  notes?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};
