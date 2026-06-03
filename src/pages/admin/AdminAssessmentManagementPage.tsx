import AdminShell from "@/components/layout/AdminShell";
import QuizAssessmentManager from "@/modules/assessments/QuizAssessmentManager";

export default function AdminAssessmentManagementPage() {
  return (
    <AdminShell
      title="Quizzes & Assessments"
      subtitle="Manage question banks, build assessments, publish tests, and review reports"
    >
      <QuizAssessmentManager />
    </AdminShell>
  );
}
