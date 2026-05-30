/**
 * AdminExamAnalyticsPage - CEO/Admin analytics dashboard
 */

import React, { useEffect, useState } from "react";
import { BarChart, TrendingUp, Users, Zap, AlertTriangle, PieChart } from "lucide-react";
import { examAPI } from "@/api/examAPI";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const AdminExamAnalyticsPage: React.FC = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await examAPI.getAdminAnalytics(token!);
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-full" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6 text-red-800">{error}</CardContent>
        </Card>
      </div>
    );
  }

  const stats = analytics || {};

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Exam Analytics</h1>
          <p className="text-gray-600">Centralized examination system performance metrics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalTests || 0}</div>
              <div className="text-sm text-green-600 mt-2">
                {stats.publishedTests || 0} published
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalAttempts || 0}</div>
              <div className="text-sm text-blue-600 mt-2">
                by {stats.totalParticipants || 0} students
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Overall Pass %</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${
                (stats.overallPassPercentage || 0) >= 60 ? "text-green-600" : "text-red-600"
              }`}>
                {stats.overallPassPercentage?.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Avg: {stats.averageScore?.toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                Violations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.totalViolations || 0}</div>
              <div className="text-sm text-gray-600 mt-2">
                Anti-cheating incidents
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Exam Performance Summary</CardTitle>
                <CardDescription>
                  Overall performance metrics across all exams
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-gray-600 mb-2">Pass Rate Distribution</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>90-100% (Excellent)</span>
                        <span className="font-semibold">--</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>75-89% (Good)</span>
                        <span className="font-semibold">--</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>60-74% (Fair)</span>
                        <span className="font-semibold">--</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>&lt;60% (Below Avg)</span>
                        <span className="font-semibold">--</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-gray-600 mb-2">Attempt Statistics</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Avg Attempts/Student</span>
                        <span className="font-semibold">
                          {stats.totalAttempts && stats.totalParticipants
                            ? (stats.totalAttempts / stats.totalParticipants).toFixed(2)
                            : "--"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Max Attempts</span>
                        <span className="font-semibold">--</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Min Attempts</span>
                        <span className="font-semibold">1</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded border border-purple-200">
                    <p className="text-sm text-gray-600 mb-2">Success Metrics</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Avg Score</span>
                        <span className="font-semibold">
                          {stats.averageScore?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Pass Percentage</span>
                        <span className="font-semibold">
                          {stats.overallPassPercentage?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Completion Rate</span>
                        <span className="font-semibold">--</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Detailed test rankings coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Violations Tab */}
          <TabsContent value="violations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Anti-Cheating Activity Report
                </CardTitle>
                <CardDescription>
                  Suspicious behavior detected during exams
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.violationsByType && Object.keys(stats.violationsByType).length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(stats.violationsByType).map(([type, count]: [string, any]) => (
                      <div
                        key={type}
                        className="p-4 bg-red-50 rounded border border-red-200"
                      >
                        <p className="text-sm text-gray-600 capitalize mb-1">
                          {type.replace(/-/g, " ")}
                        </p>
                        <p className="text-2xl font-bold text-red-600">{count}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500">
                    No violations reported
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Violation Severity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Warning</span>
                      <span className="text-sm text-gray-600">--</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-yellow-500 rounded" style={{ width: "45%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Major</span>
                      <span className="text-sm text-gray-600">--</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-orange-500 rounded" style={{ width: "35%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Critical</span>
                      <span className="text-sm text-gray-600">--</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded">
                      <div className="h-2 bg-red-500 rounded" style={{ width: "20%" }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Examination Trends</CardTitle>
                <CardDescription>
                  Historical performance and activity patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Advanced trend analysis coming soon</p>
                  <p className="text-sm mt-2">Week-over-week performance comparisons</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Activity log coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Export Options */}
        <div className="mt-8 flex gap-4">
          <Button variant="outline">Export as PDF</Button>
          <Button variant="outline">Export as Excel</Button>
          <Button variant="outline">Schedule Report Email</Button>
        </div>
      </div>
    </div>
  );
};
