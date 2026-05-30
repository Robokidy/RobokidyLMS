import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { client } from "@/api/client";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface StudentReport {
  studentId: string;
  studentName: string;
  email: string;
  attempts: number;
  highestScore: number;
  averageScore: number;
  averagePercentage: number;
  lastAttemptDate: string;
  passed: boolean;
  violations: number;
}

interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  type: string;
  difficulty: string;
  topic: string;
  marks: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  averageTimeSpent: number;
}

interface PerformanceData {
  excellent: { count: number; percentage: number };
  good: { count: number; percentage: number };
  average: { count: number; percentage: number };
  poor: { count: number; percentage: number };
}

interface TimeAnalysis {
  averageTimePerTest: number;
  fastestCompletion: number;
  slowestCompletion: number;
  timeDistribution: {
    lessThan5Min: number;
    fiveToTenMin: number;
    tenToFifteenMin: number;
    moreThanFifteenMin: number;
  };
  averageTimePerQuestion: number;
}

interface WeakTopic {
  topic: string;
  totalQuestions: number;
  correctAttempts: number;
  accuracy: number;
}

interface ViolationReport {
  summary: {
    totalViolations: number;
    studentsWithViolations: number;
    violationsByType: Record<string, number>;
    bySeverity: { warning: number; major: number; critical: number };
  };
  details: Array<{
    studentId: string;
    studentName: string;
    email: string;
    violationType: string;
    severity: string;
    violationTime: string;
    elapsedTimeFromStart: number;
    reviewed: boolean;
  }>;
}

export const TeacherReportsDashboard: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const [activeReport, setActiveReport] = useState<
    "student-wise" | "question-wise" | "performance" | "topics" | "violations" | "time"
  >("student-wise");

  const [studentReport, setStudentReport] = useState<StudentReport[]>([]);
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [violationReport, setViolationReport] = useState<ViolationReport | null>(null);
  const [timeAnalysis, setTimeAnalysis] = useState<TimeAnalysis | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [testId]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Fetch all reports in parallel
      const [student, question, performance, topics, violations, time] = await Promise.all([
        client.get(`/reports/tests/${testId}/student-wise`),
        client.get(`/reports/tests/${testId}/question-wise`),
        client.get(`/reports/tests/${testId}/performance-distribution`),
        client.get(`/reports/tests/${testId}/weak-topics`),
        client.get(`/reports/tests/${testId}/violations`),
        client.get(`/reports/tests/${testId}/time-analysis`),
      ]);

      setStudentReport(student.data);
      setQuestionAnalytics(question.data);
      setPerformanceData(performance.data);
      setWeakTopics(topics.data);
      setViolationReport(violations.data);
      setTimeAnalysis(time.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      await client.get(`/reports/tests/${testId}/export/pdf`, { responseType: "blob" });
      // Handle PDF download
    } catch (err) {
      setError("Failed to export PDF");
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      await client.get(`/reports/tests/${testId}/export/excel`, { responseType: "blob" });
      // Handle Excel download
    } catch (err) {
      setError("Failed to export Excel");
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Test Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive analysis of student performance</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Export Buttons */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4">
          <button
            onClick={handleExportPDF}
            disabled={exportLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            📄 Export as PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exportLoading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            📊 Export as Excel
          </button>
        </div>

        {/* Report Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 flex">
            {(["student-wise", "question-wise", "performance", "topics", "violations", "time"] as const).map(
              (report) => (
                <button
                  key={report}
                  onClick={() => setActiveReport(report)}
                  className={`px-6 py-4 font-medium transition ${
                    activeReport === report
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {report === "student-wise"
                    ? "Student-Wise"
                    : report === "question-wise"
                    ? "Question Analysis"
                    : report === "performance"
                    ? "Performance"
                    : report === "topics"
                    ? "Weak Topics"
                    : report === "violations"
                    ? "Violations"
                    : "Time Analysis"}
                </button>
              )
            )}
          </div>

          {/* STUDENT-WISE REPORT */}
          {activeReport === "student-wise" && (
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Student</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Attempts</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Avg Score</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Avg %</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Violations</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Last Attempt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentReport.map((student) => (
                      <tr key={student.studentId} className="border-t hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{student.studentName}</p>
                            <p className="text-sm text-gray-600">{student.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">{student.attempts}</td>
                        <td className="px-6 py-4">{student.averageScore.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <span className={student.passed ? "text-green-600" : "text-red-600"}>
                              {student.averagePercentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              student.passed
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {student.passed ? "Passed" : "Failed"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {student.violations > 0 && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                              {student.violations}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(student.lastAttemptDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* QUESTION-WISE ANALYSIS */}
          {activeReport === "question-wise" && (
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Question</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Difficulty</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Attempts</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Correct</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Accuracy</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Avg Time (s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questionAnalytics.map((q) => (
                      <tr key={q.questionId} className="border-t hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">{q.questionText.substring(0, 50)}...</td>
                        <td className="px-6 py-4 text-sm uppercase">{q.type}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              q.difficulty === "easy"
                                ? "bg-green-100 text-green-800"
                                : q.difficulty === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4">{q.totalAttempts}</td>
                        <td className="px-6 py-4">{q.correctAttempts}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${q.accuracy}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-sm font-medium">
                              {q.accuracy.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">{q.averageTimeSpent.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PERFORMANCE DISTRIBUTION */}
          {activeReport === "performance" && performanceData && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Performance Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Excellent (>90%)", value: performanceData.excellent.count },
                          { name: "Good (75-90%)", value: performanceData.good.count },
                          { name: "Average (60-75%)", value: performanceData.average.count },
                          { name: "Poor (<60%)", value: performanceData.poor.count },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#3b82f6" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Statistics Cards */}
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Excellent (>90%)</p>
                    <p className="text-3xl font-bold text-green-600">
                      {performanceData.excellent.count}
                    </p>
                    <p className="text-sm text-gray-600">
                      {performanceData.excellent.percentage.toFixed(1)}%
                    </p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Good (75-90%)</p>
                    <p className="text-3xl font-bold text-blue-600">{performanceData.good.count}</p>
                    <p className="text-sm text-gray-600">
                      {performanceData.good.percentage.toFixed(1)}%
                    </p>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Average (60-75%)</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {performanceData.average.count}
                    </p>
                    <p className="text-sm text-gray-600">
                      {performanceData.average.percentage.toFixed(1)}%
                    </p>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Poor (<60%)</p>
                    <p className="text-3xl font-bold text-red-600">{performanceData.poor.count}</p>
                    <p className="text-sm text-gray-600">
                      {performanceData.poor.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WEAK TOPICS */}
          {activeReport === "topics" && (
            <div className="p-6">
              <div className="space-y-4">
                {weakTopics.map((topic) => (
                  <div key={topic.topic} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-800">{topic.topic}</h4>
                        <p className="text-sm text-gray-600">
                          {topic.correctAttempts} / {topic.totalQuestions} questions correct
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          topic.accuracy >= 70
                            ? "bg-green-100 text-green-800"
                            : topic.accuracy >= 50
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {topic.accuracy.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          topic.accuracy >= 70
                            ? "bg-green-600"
                            : topic.accuracy >= 50
                            ? "bg-yellow-600"
                            : "bg-red-600"
                        }`}
                        style={{ width: `${topic.accuracy}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">📌 Recommendations</h4>
                <ul className="text-sm space-y-1 text-gray-700">
                  {weakTopics
                    .filter((t) => t.accuracy < 60)
                    .map((topic) => (
                      <li key={topic.topic}>
                        • {topic.topic}: Consider additional practice sessions or tutorials
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}

          {/* VIOLATIONS REPORT */}
          {activeReport === "violations" && violationReport && (
            <div className="p-6">
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total Violations</p>
                  <p className="text-3xl font-bold text-red-600">
                    {violationReport.summary.totalViolations}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Students with Violations</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {violationReport.summary.studentsWithViolations}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Major Violations</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {violationReport.summary.bySeverity.major}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Critical Violations</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {violationReport.summary.bySeverity.critical}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Student</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Violation Type</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Severity</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Time</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Elapsed (s)</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {violationReport.details.map((violation, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{violation.studentName}</p>
                            <p className="text-sm text-gray-600">{violation.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">{violation.violationType}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              violation.severity === "critical"
                                ? "bg-red-100 text-red-800"
                                : violation.severity === "major"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {violation.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {new Date(violation.violationTime).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 text-sm">{violation.elapsedTimeFromStart}</td>
                        <td className="px-6 py-4">
                          {violation.reviewed ? (
                            <span className="text-green-600 text-sm">✓ Reviewed</span>
                          ) : (
                            <span className="text-gray-500 text-sm">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TIME ANALYSIS */}
          {activeReport === "time" && timeAnalysis && (
            <div className="p-6">
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Avg Time/Test</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {Math.round(timeAnalysis.averageTimePerTest)} min
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Fastest</p>
                  <p className="text-3xl font-bold text-green-600">
                    {Math.round(timeAnalysis.fastestCompletion)} min
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Slowest</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {Math.round(timeAnalysis.slowestCompletion)} min
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Avg/Question</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {Math.round(timeAnalysis.averageTimePerQuestion)} s
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Time Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        range: "< 5 min",
                        students: timeAnalysis.timeDistribution.lessThan5Min,
                      },
                      {
                        range: "5-10 min",
                        students: timeAnalysis.timeDistribution.fiveToTenMin,
                      },
                      {
                        range: "10-15 min",
                        students: timeAnalysis.timeDistribution.tenToFifteenMin,
                      },
                      {
                        range: "> 15 min",
                        students: timeAnalysis.timeDistribution.moreThanFifteenMin,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="students" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherReportsDashboard;
