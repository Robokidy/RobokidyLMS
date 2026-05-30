/**
 * StudentExamResultPage - Shows student scores and detailed feedback
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, XCircle, AlertCircle, Download, ArrowLeft } from "lucide-react";
import { examAPI } from "@/api/examAPI";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const StudentExamResultPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [attempt, setAttempt] = useState(location.state?.attempt);
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(!attempt);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (attempt) {
      loadTestDetails();
    }
  }, []);

  const loadTestDetails = async () => {
    try {
      setLoading(true);
      const testData = await examAPI.getTest(testId!, token!);
      setTest(testData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load test details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-yellow-600" />
            <p className="font-semibold mb-4">No exam result found</p>
            <Button onClick={() => navigate("/student/tests")} className="w-full">
              Back to Tests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalMarks = attempt.totalMarks;
  const obtainedMarks = attempt.totalMarksObtained;
  const percentage = attempt.percentage;
  const isPassed = attempt.passed;

  const getRankingColor = (pct: number) => {
    if (pct >= 90) return "text-green-600";
    if (pct >= 75) return "text-blue-600";
    if (pct >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getRankingBg = (pct: number) => {
    if (pct >= 90) return "bg-green-50 border-green-200";
    if (pct >= 75) return "bg-blue-50 border-blue-200";
    if (pct >= 60) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Button
          variant="ghost"
          onClick={() => navigate("/student/tests")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tests
        </Button>

        {/* Result Card */}
        <Card
          className={`mb-6 border-2 ${getRankingBg(percentage)}`}
        >
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-2">
              {isPassed ? (
                <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-2" />
              ) : (
                <XCircle className="w-12 h-12 mx-auto text-red-600 mb-2" />
              )}
              {isPassed ? "Congratulations!" : "Result"}
            </CardTitle>
            <CardDescription className="text-base">
              {test?.title}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded border">
                <div className="text-3xl font-bold text-blue-600">
                  {obtainedMarks}
                </div>
                <div className="text-sm text-gray-600">Obtained Marks</div>
              </div>

              <div className="text-center p-4 bg-white rounded border">
                <div className="text-3xl font-bold text-gray-600">
                  {totalMarks}
                </div>
                <div className="text-sm text-gray-600">Total Marks</div>
              </div>

              <div className={`text-center p-4 bg-white rounded border`}>
                <div className={`text-3xl font-bold ${getRankingColor(percentage)}`}>
                  {percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Percentage</div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-center gap-3 p-4 bg-white rounded border">
              {isPassed ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-600">PASSED</p>
                    <p className="text-sm text-gray-600">
                      You passed with {percentage.toFixed(1)}%
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-600">NOT PASSED</p>
                    <p className="text-sm text-gray-600">
                      Passing marks: {test?.passingMarks}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Exam Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded border">
              <div>
                <p className="text-xs text-gray-600 mb-1">Time Spent</p>
                <p className="font-semibold">
                  {Math.floor(attempt.actualTimeSpent / 60)}m{" "}
                  {attempt.actualTimeSpent % 60}s
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Questions</p>
                <p className="font-semibold">{attempt.questionsAttempted}/{attempt.answers.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Skipped</p>
                <p className="font-semibold">{attempt.questionsSkipped}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Avg Time/Q</p>
                <p className="font-semibold">
                  {Math.round(attempt.averageTimePerQuestion)}s
                </p>
              </div>
            </div>

            {/* Violations */}
            {attempt.violationCount > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="font-semibold text-red-900 mb-2">
                  ⚠️ Suspicious Activity Detected
                </p>
                <p className="text-sm text-red-800">
                  {attempt.violationCount} violation{attempt.violationCount > 1 ? "s" : ""} were
                  recorded during the exam. Please review the exam guidelines.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Analysis */}
        {attempt.answers.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Performance Analysis</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {/* Correct vs Incorrect */}
                <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded border border-green-200">
                  <p className="font-semibold text-green-900 mb-2">Questions Analysis</p>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {attempt.answers.filter((a: any) => a.isCorrect).length}
                      </div>
                      <div className="text-xs text-green-700">Correct</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {attempt.answers.filter((a: any) => a.isCorrect === false).length}
                      </div>
                      <div className="text-xs text-red-700">Incorrect</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-600">
                        {attempt.answers.filter((a: any) => a.isCorrect === null).length}
                      </div>
                      <div className="text-xs text-gray-700">Unanswered</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.print()}
          >
            <Download className="w-4 h-4 mr-2" />
            Print/Save
          </Button>
          <Button
            className="w-full"
            onClick={() => navigate("/student/tests")}
          >
            View More Tests
          </Button>
        </div>

        {/* Teacher Feedback Section */}
        {attempt.evaluationStatus === "manually-evaluated" && attempt.teacherFeedback && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">Teacher Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{attempt.teacherFeedback}</p>
              {attempt.teacherRating && (
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">Rating</p>
                  <div className="flex gap-1">
                    {Array(5).fill(0).map((_, i) => (
                      <span key={i} className={i < attempt.teacherRating ? "text-yellow-400" : "text-gray-300"}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
