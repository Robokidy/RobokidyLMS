import { useEffect, useState } from "react";
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

interface GlobalAnalytics {
  totalTests: number;
  totalAttempts: number;
  totalParticipants: number;
  averageScore: number;
  passPercentage: number;
  totalViolations: number;
}

interface SchoolPerformance {
  schoolId: string;
  className?: string;
  totalAttempts: number;
  passedAttempts: number;
  failedAttempts: number;
  averageScore: number;
  totalParticipants: number;
  passPercentage: number;
}

interface TeacherPerformance {
  teacherId: string;
  teacherName: string;
  totalTests: number;
  totalAttempts: number;
}

export const AdminAnalyticsDashboard: React.FC = () => {
  const [globalAnalytics, setGlobalAnalytics] = useState<GlobalAnalytics | null>(null);
  const [schoolPerformance, setSchoolPerformance] = useState<SchoolPerformance[]>([]);
  const [teacherPerformance, setTeacherPerformance] = useState<TeacherPerformance[]>([]);
  const [activeTab, setActiveTab] = useState<"global" | "school-wise" | "teacher-wise">(
    "global"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const [global, schoolWise, teacherWise] = await Promise.all([
        client.get("/reports/analytics/global"),
        client.get("/reports/analytics/school-wise"),
        client.get("/reports/analytics/teacher-wise"),
      ]);

      setGlobalAnalytics(global.data);
      setSchoolPerformance(schoolWise.data);
      setTeacherPerformance(teacherWise.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Admin Analytics Dashboard</h1>
          <p className="text-gray-600">Organization-wide test performance metrics</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 flex">
            {(["global", "school-wise", "teacher-wise"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium transition ${
                  activeTab === tab
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {tab === "global"
                  ? "Global Analytics"
                  : tab === "school-wise"
                  ? "School-Wise Performance"
                  : "Teacher-Wise Performance"}
              </button>
            ))}
          </div>

          {/* GLOBAL ANALYTICS */}
          {activeTab === "global" && globalAnalytics && (
            <div className="p-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-2">Total Tests Created</p>
                  <p className="text-4xl font-bold text-blue-600">
                    {globalAnalytics.totalTests}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Across all teachers</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 mb-2">Total Attempts</p>
                  <p className="text-4xl font-bold text-green-600">
                    {globalAnalytics.totalAttempts}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">All students combined</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600 mb-2">Unique Students</p>
                  <p className="text-4xl font-bold text-purple-600">
                    {globalAnalytics.totalParticipants}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Participated in tests</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200">
                  <p className="text-sm text-gray-600 mb-2">Average Score</p>
                  <p className="text-4xl font-bold text-yellow-600">
                    {globalAnalytics.averageScore.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Across all attempts</p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
                  <p className="text-sm text-gray-600 mb-2">Pass Rate</p>
                  <p className="text-4xl font-bold text-red-600">
                    {globalAnalytics.passPercentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Students passed</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
                  <p className="text-sm text-gray-600 mb-2">Cheating Violations</p>
                  <p className="text-4xl font-bold text-orange-600">
                    {globalAnalytics.totalViolations}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Detected and logged</p>
                </div>
              </div>

              {/* Summary Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4">Organization Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Avg Attempts/Test</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {globalAnalytics.totalTests > 0
                        ? (
                            globalAnalytics.totalAttempts / globalAnalytics.totalTests
                          ).toFixed(1)
                        : 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Participation Rate</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {globalAnalytics.totalAttempts > 0
                        ? (
                            (globalAnalytics.totalParticipants /
                              globalAnalytics.totalAttempts) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Violation Rate</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {globalAnalytics.totalAttempts > 0
                        ? (
                            (globalAnalytics.totalViolations /
                              globalAnalytics.totalAttempts) *
                            100
                          ).toFixed(2)
                        : 0}
                      %
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fail Rate</p>
                    <p className="text-2xl font-bold text-red-600">
                      {(100 - globalAnalytics.passPercentage).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCHOOL-WISE PERFORMANCE */}
          {activeTab === "school-wise" && (
            <div className="p-6">
              {/* Chart */}
              <div className="mb-8 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-4">Pass Rate by School</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={schoolPerformance}
                    margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="schoolId"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis label={{ value: "Pass Rate (%)", angle: -90, position: "insideLeft" }} />
                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                    <Bar dataKey="passPercentage" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">School</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Total Attempts</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Passed</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Failed</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Pass Rate</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Avg Score
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Participants</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolPerformance.map((school) => (
                      <tr key={school.schoolId} className="border-t hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{school.schoolId}</td>
                        <td className="px-6 py-4">{school.totalAttempts}</td>
                        <td className="px-6 py-4">
                          <span className="text-green-600 font-medium">
                            {school.passedAttempts}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-red-600 font-medium">
                            {school.failedAttempts}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${school.passPercentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {school.passPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                            {school.averageScore.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">{school.totalParticipants}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TEACHER-WISE PERFORMANCE */}
          {activeTab === "teacher-wise" && (
            <div className="p-6">
              {/* Chart */}
              <div className="mb-8 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-4">Tests Created by Teacher</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={teacherPerformance}
                    margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="teacherName"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="totalTests"
                      fill="#3b82f6"
                      name="Tests Created"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="totalAttempts"
                      fill="#10b981"
                      name="Attempts"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Teacher</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Tests Created</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">Total Attempts</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Avg Attempts/Test
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherPerformance.map((teacher) => (
                      <tr key={teacher.teacherId} className="border-t hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{teacher.teacherName}</p>
                            <p className="text-sm text-gray-600">{teacher.teacherId}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {teacher.totalTests}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            {teacher.totalAttempts}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {teacher.totalTests > 0
                            ? (teacher.totalAttempts / teacher.totalTests).toFixed(1)
                            : 0}{" "}
                          attempts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboard;
