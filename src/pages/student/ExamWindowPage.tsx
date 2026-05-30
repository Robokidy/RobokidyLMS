/**
 * ExamWindow - Main exam interface with full features
 * Includes: Timer, anti-cheating, question navigation, auto-save, etc.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  LogOut,
  Save,
  Zap,
  AlertCircle,
} from "lucide-react";
import { examAPI } from "@/api/examAPI";
import { useAuth } from "@/context/AuthContext";
import { useExamTimer } from "@/hooks/useExamTimer";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useExamAntiCheating } from "@/hooks/useExamAntiCheating";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface Question {
  _id: string;
  questionNumber: number;
  questionText: string;
  type: string;
  marks: number;
  options?: Array<{ optionId: string; text: string }>;
  blanks?: Array<{ blankId: string; acceptableVariations?: string[] }>;
  matchingPairs?: Array<{ leftId: string; leftText: string; rightId: string; rightText: string }>;
}

interface Answer {
  questionId: string;
  answer: any;
  timeSpent: number;
  reviewFlag?: boolean;
}

export const ExamWindow: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const state = location.state || {};
  const [attempt, setAttempt] = useState(state.attempt);
  const [questions, setQuestions] = useState<Question[]>(state.questions || []);
  const [testConfig, setTestConfig] = useState(state.testConfig);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // Timer
  const { formatted, isRunning, isWarning, isCritical, timeRemaining } =
    useExamTimer({
      testDurationMinutes: state.testDuration || 60,
      onTimeout: handleTimeout,
      onWarning: (minutes) => {
        toast({
          title: `${minutes} minute${minutes > 1 ? "s" : ""} remaining!`,
          description: "Complete your exam quickly",
          variant: "destructive",
        });
      },
    });

  // Anti-cheating
  const { tabSwitchCount } = useExamAntiCheating({
    enabled: testConfig?.antiCheating?.enabled,
    testConfig: testConfig?.antiCheating,
    onViolation: handleViolation,
  });

  // Auto-save
  const { hasUnsavedChanges, saveNow, isSaving } = useAutoSave({
    attemptId: attempt?._id,
    answers,
    onSave: async (answer) => {
      await examAPI.saveAnswer(attempt._id, {
        questionId: answer.questionId,
        answer: answer.answer,
        timeSpent: answer.timeSpent,
      }, token!);
    },
    interval: 10000,
  });

  // Load attempt if not in state
  useEffect(() => {
    if (!attempt) {
      loadAttempt();
    }
  }, [testId]);

  const loadAttempt = async () => {
    try {
      const attemptId = sessionStorage.getItem("currentAttemptId");
      if (attemptId) {
        const data = await examAPI.getAttempt(attemptId, token!);
        setAttempt(data);
      }
    } catch (error) {
      console.error("Failed to load attempt:", error);
    }
  };

  async function handleViolation(violation: any) {
    try {
      const violationData = {
        ...violation,
        screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      };
      const result = await examAPI.reportViolation(
        attempt._id,
        violationData,
        token!
      );

      setViolations([...violations, violation]);

      if (result.autoSubmitted) {
        toast({
          title: "Auto-submitted",
          description: "Test auto-submitted due to violation threshold",
          variant: "destructive",
        });
        await submitExam();
      }
    } catch (error) {
      console.error("Failed to report violation:", error);
    }
  }

  async function handleTimeout() {
    toast({
      title: "Time's up!",
      description: "Submitting your exam...",
      variant: "destructive",
    });
    await submitExam("auto-timeout");
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion?._id);

  const handleAnswerChange = (answer: any) => {
    setAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === currentQuestion._id);
      if (existing) {
        existing.answer = answer;
      } else {
        prev.push({
          questionId: currentQuestion._id,
          answer,
          timeSpent: 0,
        });
      }
      return [...prev];
    });
  };

  const handleMarkReview = async () => {
    try {
      const reviewFlag = !currentAnswer?.reviewFlag;
      await examAPI.markForReview(
        attempt._id,
        currentQuestion._id,
        reviewFlag,
        token!
      );

      setAnswers((prev) => {
        const ans = prev.find((a) => a.questionId === currentQuestion._id);
        if (ans) ans.reviewFlag = reviewFlag;
        return [...prev];
      });

      toast({
        description: reviewFlag ? "Marked for review" : "Unmarked for review",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update review flag",
        variant: "destructive",
      });
    }
  };

  const handleNavigation = (direction: "prev" | "next") => {
    if (direction === "prev" && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (direction === "next" && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  async function submitExam(method = "manual") {
    setIsSubmitting(true);
    try {
      const response = await examAPI.submitTest(
        attempt._id,
        { submissionMethod: method },
        token!
      );

      toast({
        title: "Success",
        description: response.message,
      });

      // Clear session storage
      sessionStorage.removeItem("currentAttemptId");
      sessionStorage.removeItem("currentTestId");

      // Navigate to result page
      navigate(`/student/exams/${testId}/result`, {
        state: { attempt: response.attempt },
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!attempt || !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Zap className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>Loading exam...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-100 overflow-hidden" style={{overflow: "hidden"}}>
      {/* Header Bar */}
      <div
        className={`${
          isCritical ? "bg-red-600" : isWarning ? "bg-yellow-600" : "bg-blue-600"
        } text-white p-4 shadow-lg flex justify-between items-center`}
      >
        <div className="flex items-center gap-4">
          <h2 className="font-bold">Exam</h2>
          <span className="text-sm opacity-90">
            Q {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>

        <div className="flex items-center gap-6">
          {isCritical && (
            <div className="flex items-center gap-2 bg-red-700 px-3 py-1 rounded">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-bold">{formatted}</span>
            </div>
          )}
          {isWarning && !isCritical && (
            <div className="flex items-center gap-2 bg-yellow-700 px-3 py-1 rounded">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-semibold">{formatted}</span>
            </div>
          )}
          {!isWarning && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatted}</span>
            </div>
          )}

          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 bg-blue-700 px-3 py-1 rounded text-sm">
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Unsaved changes"}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={() => setShowSubmitConfirm(true)}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Submit
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Question Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span>Question {currentQuestionIndex + 1}</span>
                <Button
                  variant={currentAnswer?.reviewFlag ? "default" : "outline"}
                  size="sm"
                  onClick={handleMarkReview}
                >
                  <Flag className="w-4 h-4 mr-1" />
                  {currentAnswer?.reviewFlag ? "Marked" : "Mark for Review"}
                </Button>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Question Text */}
              <div className="space-y-2">
                <p className="text-lg font-semibold text-gray-900">
                  {currentQuestion.questionText}
                </p>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>Marks: {currentQuestion.marks}</span>
                  <span>Type: {currentQuestion.type}</span>
                </div>
              </div>

              {/* Question Content Based on Type */}
              <QuestionRenderer
                question={currentQuestion}
                answer={currentAnswer?.answer}
                onChange={handleAnswerChange}
              />

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleNavigation("prev")}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <div className="flex-1" />

                <Button
                  variant="outline"
                  onClick={() => handleNavigation("next")}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Questions Palette */}
        <div className="w-64 border-l bg-white overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-bold text-sm mb-2">Questions</h3>
            <div className="space-y-2 text-xs">
              <div>Total: {questions.length}</div>
              <div>Attempted: {answers.length}</div>
              <div>Marked: {answers.filter((a) => a.reviewFlag).length}</div>
            </div>
          </div>

          <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
            {questions.map((q, idx) => {
              const ans = answers.find((a) => a.questionId === q._id);
              const isReviewed = ans?.reviewFlag;
              const isAnswered = ans?.answer !== null;

              return (
                <button
                  key={q._id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-full p-2 rounded text-xs font-medium transition ${
                    idx === currentQuestionIndex
                      ? "bg-blue-500 text-white"
                      : isReviewed
                      ? "bg-yellow-100 text-yellow-900"
                      : isAnswered
                      ? "bg-green-100 text-green-900"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Q{idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Violations Alert */}
      {violations.length > 0 && (
        <div className="fixed bottom-4 right-4 max-w-md">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {violations.length} suspicious activity/activities detected. Further violations
              may result in auto-submission.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Submit Confirmation */}
      {showSubmitConfirm && (
        <SubmitConfirmDialog
          isOpen={showSubmitConfirm}
          onConfirm={() => {
            setShowSubmitConfirm(false);
            submitExam();
          }}
          onCancel={() => setShowSubmitConfirm(false)}
          totalQuestions={questions.length}
          attemptedQuestions={answers.length}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

// Question Renderer Component
const QuestionRenderer: React.FC<{
  question: any;
  answer: any;
  onChange: (answer: any) => void;
}> = ({ question, answer, onChange }) => {
  switch (question.type) {
    case "mcq":
      return (
        <div className="space-y-3">
          {question.options?.map((option: any) => (
            <label key={option.optionId} className="flex items-center gap-3 cursor-pointer p-3 border rounded hover:bg-gray-50">
              <input
                type="radio"
                name={question._id}
                value={option.optionId}
                checked={answer === option.optionId}
                onChange={(e) => onChange(e.target.value)}
                className="w-4 h-4"
              />
              <span>{option.text}</span>
            </label>
          ))}
        </div>
      );

    case "multi-select":
      return (
        <div className="space-y-3">
          {question.options?.map((option: any) => (
            <label key={option.optionId} className="flex items-center gap-3 cursor-pointer p-3 border rounded hover:bg-gray-50">
              <input
                type="checkbox"
                value={option.optionId}
                checked={(answer || []).includes(option.optionId)}
                onChange={(e) => {
                  const current = answer || [];
                  if (e.target.checked) {
                    onChange([...current, e.target.value]);
                  } else {
                    onChange(current.filter((v: string) => v !== e.target.value));
                  }
                }}
                className="w-4 h-4"
              />
              <span>{option.text}</span>
            </label>
          ))}
        </div>
      );

    case "fill-blank":
      return (
        <input
          type="text"
          value={answer || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer here..."
          className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );

    case "true-false":
      return (
        <div className="flex gap-4">
          {["True", "False"].map((option, idx) => (
            <label key={option} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={question._id}
                value={idx === 0}
                checked={answer === (idx === 0)}
                onChange={() => onChange(idx === 0)}
                className="w-4 h-4"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      );

    case "descriptive":
      return (
        <textarea
          value={answer || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your answer here..."
          rows={6}
          className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      );

    default:
      return <p className="text-gray-500">Question type not supported</p>;
  }
};

// Submit Confirmation Dialog
const SubmitConfirmDialog: React.FC<{
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  totalQuestions: number;
  attemptedQuestions: number;
  isSubmitting: boolean;
}> = ({ isOpen, onConfirm, onCancel, totalQuestions, attemptedQuestions, isSubmitting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Submit Exam?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <p className="text-sm font-semibold mb-2">Summary:</p>
            <div className="space-y-1 text-sm">
              <p>Total Questions: {totalQuestions}</p>
              <p>Attempted: {attemptedQuestions}</p>
              <p>Unanswered: {totalQuestions - attemptedQuestions}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Once submitted, you cannot modify your answers. Are you sure?
          </p>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="flex-1">
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
