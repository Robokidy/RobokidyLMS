/**
 * StudentTestsPage - Shows all assigned tests for student
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Users, Zap, CheckCircle, AlertCircle, PlayCircle } from "lucide-react";
import { examAPI } from "@/api/examAPI";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface StudentTest {
  _id: string;
  title: string;
  description: string;
  subject: string;
  totalMarks: number;
  passingMarks: number;
  timeLimit: number;
  startDateTime: string;
  endDateTime: string;
  difficulty: string;
  questions: any[];
  studentAttempt?: {
    status: string;
    totalMarksObtained: number;
    percentage: number;
    passed: boolean;
  };
  allowRetest: boolean;
  attempts?: any[];
}

export const StudentTestsPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<StudentTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "active" | "completed">("all");

  useEffect(() => {
    fetchStudentTests();
  }, []);

  const fetchStudentTests = async () => {
    try {
      setLoading(true);
      const data = await examAPI.getStudentTests(token!);
      setTests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const getTestStatus = (test: StudentTest) => {
    const now = new Date();
    const startTime = new Date(test.startDateTime);
    const endTime = new Date(test.endDateTime);

    if (test.studentAttempt?.status === "submitted") {
      return { type: "completed", label: "Completed", color: "bg-green-100 text-green-800" };
    }
    if (test.studentAttempt?.status === "in-progress") {
      return { type: "active", label: "In Progress", color: "bg-blue-100 text-blue-800" };
    }
    if (now < startTime) {
      return { type: "upcoming", label: "Upcoming", color: "bg-gray-100 text-gray-800" };
    }
    if (now > endTime) {
      return { type: "expired", label: "Expired", color: "bg-red-100 text-red-800" };
    }
    return { type: "active", label: "Active", color: "bg-yellow-100 text-yellow-800" };
  };

  const canStartTest = (test: StudentTest) => {
    const now = new Date();
    const startTime = new Date(test.startDateTime);
    const endTime = new Date(test.endDateTime);
    return now >= startTime && now <= endTime;
  };

  const handleStartTest = (testId: string) => {
    navigate(`/student/exams/${testId}/start`);
  };

  const handleViewResult = (testId: string) => {
    navigate(`/student/exams/${testId}/result`);
  };

  const filteredTests = tests.filter((test) => {
    const status = getTestStatus(test);
    if (filter === "all") return true;
    return status.type === filter;
  });

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Tests & Exams</h1>
          <p className="text-gray-600">View and take assigned tests</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {(["all", "upcoming", "active", "completed"] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              onClick={() => setFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>

        {/* Tests Grid */}
        {filteredTests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No tests found in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test) => {
              const status = getTestStatus(test);
              const now = new Date();
              const startTime = new Date(test.startDateTime);
              const endTime = new Date(test.endDateTime);
              const timeRemaining = Math.ceil(
                (endTime.getTime() - now.getTime()) / (1000 * 60)
              );

              return (
                <Card key={test._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{test.title}</CardTitle>
                        <CardDescription>{test.subject}</CardDescription>
                      </div>
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Test Info */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-600" />
                        <span>{test.totalMarks} marks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>{test.timeLimit} min</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span>{test.questions.length} Q</span>
                      </div>
                      <div className="text-gray-600">
                        {test.difficulty && (
                          <span className="capitalize font-medium">{test.difficulty}</span>
                        )}
                      </div>
                    </div>

                    {/* Attempt Info */}
                    {test.studentAttempt && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-100">
                        <div className="text-sm font-medium text-blue-900 mb-1">
                          Your Result
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-blue-600">
                            {test.studentAttempt.totalMarksObtained}/{test.totalMarks}
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              test.studentAttempt.passed
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {test.studentAttempt.percentage.toFixed(1)}%
                          </span>
                        </div>
                        {test.studentAttempt.passed && (
                          <div className="flex items-center gap-1 mt-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-xs font-medium">Passed</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Time Remaining */}
                    {status.type === "active" && timeRemaining > 0 && (
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-100">
                        <div className="flex items-center gap-2 text-yellow-900">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {timeRemaining} minutes remaining
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Start: {new Date(test.startDateTime).toLocaleString()}</div>
                      <div>End: {new Date(test.endDateTime).toLocaleString()}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {test.studentAttempt?.status === "in-progress" ? (
                        <Button
                          className="flex-1"
                          onClick={() => navigate(`/student/exams/${test._id}/continue`)}
                        >
                          Continue Test
                        </Button>
                      ) : test.studentAttempt?.status === "submitted" ? (
                        <>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleViewResult(test._id)}
                          >
                            View Result
                          </Button>
                          {test.allowRetest && (
                            <Button
                              className="flex-1"
                              onClick={() => handleStartTest(test._id)}
                              disabled={!canStartTest(test)}
                            >
                              Retake
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          className="flex-1"
                          onClick={() => handleStartTest(test._id)}
                          disabled={!canStartTest(test)}
                        >
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Start Test
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
