/**
 * ExamStartPage - Preparation page before starting exam
 * Shows terms, warnings, system requirements
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Monitor,
  Shield,
  Zap,
} from "lucide-react";
import { examAPI } from "@/api/examAPI";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

export const ExamStartPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAnticheat, setAgreeAnticheat] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchTestDetails();
  }, [testId]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      const data = await examAPI.getTest(testId!, token!);
      setTest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load test");
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    if (!agreeTerms || !agreeAnticheat) {
      alert("Please agree to all terms and conditions");
      return;
    }

    try {
      setStarting(true);
      const screenResolution = `${window.innerWidth}x${window.innerHeight}`;
      const response = await examAPI.startTest(
        testId!,
        { screenResolution },
        token!
      );

      // Store attempt ID in sessionStorage for recovery
      sessionStorage.setItem("currentAttemptId", response.attempt._id);
      sessionStorage.setItem("currentTestId", testId!);

      // Navigate to exam window
      navigate(`/student/exams/${testId}/exam`, {
        state: {
          attempt: response.attempt,
          questions: response.questions,
          testDuration: response.testDuration,
          testConfig: response.testConfig,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start test");
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
              <p className="font-semibold">Test not found</p>
              <Button
                onClick={() => navigate("/student/tests")}
                className="mt-4 w-full"
              >
                Back to Tests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Test Info */}
        <Card className="mb-6 border-2 border-blue-200">
          <CardHeader>
            <CardTitle>{test.title}</CardTitle>
            <CardDescription>{test.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-xs text-gray-600 mb-1">Total Marks</div>
                <div className="text-xl font-bold text-blue-600">{test.totalMarks}</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-xs text-gray-600 mb-1">Pass Marks</div>
                <div className="text-xl font-bold text-green-600">{test.passingMarks}</div>
              </div>
              <div className="p-3 bg-purple-50 rounded">
                <div className="text-xs text-gray-600 mb-1">Time Limit</div>
                <div className="text-xl font-bold text-purple-600">{test.timeLimit} min</div>
              </div>
              <div className="p-3 bg-orange-50 rounded">
                <div className="text-xs text-gray-600 mb-1">Questions</div>
                <div className="text-xl font-bold text-orange-600">{test.questions?.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Important Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-amber-50 p-4 rounded border border-amber-200">
              {test.instructions && <div>{test.instructions}</div>}
              <div className="mt-4 space-y-2 text-sm">
                <p className="font-semibold text-gray-900">General Guidelines:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Do not refresh the page during the exam</li>
                  <li>Do not minimize the window or switch tabs</li>
                  <li>Ensure stable internet connection</li>
                  <li>Complete the exam within the time limit</li>
                  <li>Your answers are auto-saved every 10 seconds</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anti-Cheating Notice */}
        {test.antiCheating?.enabled && (
          <Card className="mb-6 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Shield className="w-5 h-5" />
                Anti-Cheating Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-red-50 p-4 rounded border border-red-200 text-sm space-y-2">
                <p className="font-semibold text-red-900">This exam has anti-cheating measures:</p>
                <ul className="space-y-1 text-red-800">
                  {test.antiCheating.fullscreenMode && (
                    <li className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" /> Fullscreen mode is mandatory
                    </li>
                  )}
                  {test.antiCheating.tabSwitchDetection && (
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Tab switching is monitored
                    </li>
                  )}
                  {test.antiCheating.copyPasteDetection && (
                    <li className="flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Copy/Paste is disabled
                    </li>
                  )}
                  {test.antiCheating.windowBlurDetection && (
                    <li className="flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Window focus is monitored
                    </li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Requirements */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              System Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={
                    /Chrome|Firefox|Safari|Edge/.test(navigator.userAgent)
                  }
                  disabled
                />
                <span>
                  {/Chrome|Firefox|Safari|Edge/.test(navigator.userAgent)
                    ? "✓ Compatible Browser"
                    : "✗ Use Chrome, Firefox, Safari, or Edge"}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={navigator.onLine} disabled />
                <span>
                  {navigator.onLine ? "✓ Internet Connected" : "✗ No Internet Connection"}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={window.innerHeight > 600} disabled />
                <span>
                  {window.innerHeight > 600
                    ? "✓ Adequate Screen Size"
                    : "✗ Minimum 600px height required"}
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Agreements */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded">
              <Checkbox
                checked={agreeTerms}
                onCheckedChange={(checked) => setAgreeTerms(!!checked)}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                I understand that this is an examination and agree to follow all academic
                honesty policies. Any attempt to cheat will result in automatic test
                submission and potential disciplinary action.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded">
              <Checkbox
                checked={agreeAnticheat}
                onCheckedChange={(checked) => setAgreeAnticheat(!!checked)}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                I agree to the anti-cheating measures and will not attempt to circumvent
                them. I understand that suspicious activity may be automatically logged and
                reported.
              </span>
            </label>
          </CardContent>
        </Card>

        {/* Start Button */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/student/tests")}
            disabled={starting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleStartExam}
            disabled={!agreeTerms || !agreeAnticheat || starting}
            size="lg"
          >
            {starting ? "Starting..." : "Start Exam"}
          </Button>
        </div>
      </div>
    </div>
  );
};
