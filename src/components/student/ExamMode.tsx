import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAntiCheating, ViolationWarning } from "@/hooks/useAntiCheating";
import { client } from "@/api/client";

interface Question {
  _id: string;
  questionText: string;
  type: string;
  marks: number;
  options?: Array<{ optionId: string; text: string }>;
  blanks?: Array<{ blankId: string }>;
  matchingPairs?: Array<{ leftId: string; leftText: string; rightId: string; rightText: string }>;
  codingConfig?: {
    language: string;
    templateCode: string;
  };
}

interface ExamAttempt {
  _id: string;
  testId: string;
  status: string;
  answers: Array<{
    questionId: string;
    answer: string | string[];
    timeSpent: number;
    reviewFlag: boolean;
  }>;
  startTime: Date;
}

interface TestData {
  _id: string;
  title: string;
  description: string;
  instructions: string;
  totalMarks: number;
  timeLimit: number;
  antiCheating: any;
  questions: string[];
}

export const ExamMode: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [test, setTest] = useState<TestData | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(
    new Set()
  );
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(
    new Set()
  );

  // Anti-cheating system
  const {
    violations,
    violationCount,
    isFullscreen,
    requestFullscreen,
    exitFullscreen,
  } = useAntiCheating(
    {
      tabSwitchDetection: true,
      windowBlurDetection: true,
      windowMinimizeDetection: true,
      copyPasteDetection: true,
      rightClickDisabled: true,
      textSelectionDisabled: true,
      fullscreenMode: true,
      webcamMonitoring: false,
    },
    async (violation) => {
      try {
        await client.post(`/tests/attempts/${attempt?._id}/violation`, {
          violationType: violation.type,
          description: violation.description,
        });
      } catch (err) {
        console.error("Failed to log violation:", err);
      }
    }
  );

  // Initialize exam
  useEffect(() => {
    const initializeExam = async () => {
      try {
        setLoading(true);
        const response = await client.post(`/tests/${testId}/start`);
        const { attempt: attemptData, questions: questionsData, testDuration } = response.data;

        setTest(response.data);
        setAttempt(attemptData);
        setQuestions(questionsData);
        setTimeRemaining(testDuration * 60); // convert minutes to seconds

        if (response.data.antiCheating?.fullscreenMode) {
          await requestFullscreen();
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to start exam");
      } finally {
        setLoading(false);
      }
    };

    initializeExam();
  }, [testId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0 || !attempt) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, attempt]);

  // Auto-save answers
  useEffect(() => {
    if (!attempt || !test) return;

    const saveAnswers = async () => {
      try {
        const currentQuestion = questions[currentQuestionIndex];
        if (currentQuestion && answeredQuestions.has(currentQuestion._id)) {
          await client.post(`/tests/attempts/${attempt._id}/save-answer`, {
            questionId: currentQuestion._id,
            questionType: currentQuestion.type,
            answer: attempt.answers.find(
              (a) => a.questionId === currentQuestion._id
            )?.answer,
            timeSpent: Math.floor(
              (Date.now() - new Date(attempt.startTime).getTime()) / 1000
            ),
          });
        }
      } catch (err) {
        console.error("Failed to save answer:", err);
      }
    };

    const saveInterval = setInterval(saveAnswers, 30000); // Auto-save every 30 seconds
    return () => clearInterval(saveInterval);
  }, [attempt, currentQuestionIndex, answeredQuestions, questions]);

  // Auto-submit if violation threshold reached
  useEffect(() => {
    if (
      test &&
      violationCount >= test.antiCheating.violationThresholds.autoSubmitAt
    ) {
      handleAutoSubmit();
    }
  }, [violationCount, test]);

  const handleAutoSubmit = async () => {
    if (!attempt) return;
    setSubmitting(true);
    try {
      await client.post(`/tests/attempts/${attempt._id}/submit`, {
        submissionMethod: "auto-timeout",
      });
      navigate(`/student/tests/${attempt._id}/result`);
    } catch (err) {
      setError("Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerQuestion = (answer: string | string[]) => {
    if (!attempt) return;
    const currentQuestion = questions[currentQuestionIndex];
    const existingAnswerIndex = attempt.answers.findIndex(
      (a) => a.questionId === currentQuestion._id
    );

    if (existingAnswerIndex >= 0) {
      attempt.answers[existingAnswerIndex].answer = answer;
    } else {
      attempt.answers.push({
        questionId: currentQuestion._id,
        answer,
        timeSpent: 0,
        reviewFlag: false,
      });
    }

    setAnsweredQuestions((prev) =>
      new Set(prev).add(currentQuestion._id)
    );
  };

  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handleSubmitTest = async () => {
    if (!attempt) return;
    setSubmitting(true);
    try {
      await client.post(`/tests/attempts/${attempt._id}/submit`);
      navigate(`/student/tests/${attempt._id}/result`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => navigate("/student/tests")}
            className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
          >
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  if (!test || !attempt || questions.length === 0) {
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const timeWarning = timeRemaining < 300; // 5 minutes

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header with Timer */}
      <div className={`${timeWarning ? "bg-red-600" : "bg-blue-600"} text-white p-4 sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{test.title}</h1>
            <p className="text-sm opacity-90">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${
              timeWarning ? "animate-pulse" : ""
            }`}>
              {formatTime(timeRemaining)}
            </div>
            <p className="text-sm opacity-90">Time Remaining</p>
          </div>
        </div>
      </div>

      {/* Violation Warning */}
      <ViolationWarning
        violationCount={violationCount}
        maxViolations={test.antiCheating.violationThresholds.autoSubmitAt}
        violations={violations}
      />

      <div className="flex-1 flex gap-4 max-w-7xl mx-auto w-full p-4">
        {/* Main Exam Area */}
        <div className="flex-1 bg-white rounded-lg shadow-lg p-8">
          {/* Instructions */}
          {currentQuestionIndex === 0 && (
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h2 className="font-bold text-lg mb-2">Instructions</h2>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {test.instructions || "Please follow all guidelines while taking the test."}
              </div>
              <button
                onClick={() => setCurrentQuestionIndex(1)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Start Exam
              </button>
              <p className="text-xs text-gray-600 mt-4">
                Total Questions: {questions.length} | Total Marks: {test.totalMarks}
              </p>
            </div>
          )}

          {/* Question */}
          {currentQuestionIndex > 0 && (
            <div>
              <div className="mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {currentQuestion.questionText}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Marks: {currentQuestion.marks}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleToggleFlag(currentQuestion._id)
                    }
                    className={`px-4 py-2 rounded text-sm font-medium ${
                      flaggedQuestions.has(currentQuestion._id)
                        ? "bg-yellow-500 text-white"
                        : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                    }`}
                  >
                    {flaggedQuestions.has(currentQuestion._id)
                      ? "★ Flagged"
                      : "☆ Flag"}
                  </button>
                </div>

                {/* Question Content based on Type */}
                <QuestionRenderer
                  question={currentQuestion}
                  answer={attempt.answers.find(
                    (a) => a.questionId === currentQuestion._id
                  )?.answer}
                  onAnswer={handleAnswerQuestion}
                />
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center gap-4 mt-8 pt-6 border-t">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 1}
                  className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-400"
                >
                  ← Previous
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Submit Test
                  </button>
                </div>

                <button
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Question Palette (Right Sidebar) */}
        <div className="w-72 bg-white rounded-lg shadow-lg p-4 sticky top-24 h-fit">
          <h3 className="font-bold text-lg mb-4">Question Palette</h3>
          <div className="grid grid-cols-4 gap-2">
            {questions.map((q, idx) => (
              <button
                key={q._id}
                onClick={() => handleJumpToQuestion(idx)}
                className={`w-full h-10 rounded text-sm font-medium transition ${
                  idx === currentQuestionIndex
                    ? "bg-blue-600 text-white"
                    : answeredQuestions.has(q._id)
                    ? "bg-green-600 text-white"
                    : flaggedQuestions.has(q._id)
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>Flagged</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <span>Not Answered</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t space-y-2">
            <p className="text-xs text-gray-600">
              Answered: {answeredQuestions.size} / {questions.length}
            </p>
            <p className="text-xs text-gray-600">
              Flagged: {flaggedQuestions.size}
            </p>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-bold mb-4">Submit Test?</h2>
            <p className="text-gray-700 mb-2">
              You have answered {answeredQuestions.size} out of {questions.length} questions.
            </p>
            <p className="text-gray-700 mb-6">
              Are you sure you want to submit the test? You cannot edit answers after submission.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="px-6 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitTest}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Question Renderer Component
const QuestionRenderer: React.FC<{
  question: Question;
  answer?: string | string[];
  onAnswer: (answer: string | string[]) => void;
}> = ({ question, answer, onAnswer }) => {
  switch (question.type) {
    case "mcq":
      return (
        <div className="space-y-3">
          {question.options?.map((option) => (
            <label
              key={option.optionId}
              className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                name={`question-${question._id}`}
                value={option.optionId}
                checked={answer === option.optionId}
                onChange={(e) => onAnswer(e.target.value)}
                className="mr-3"
              />
              <span>{option.text}</span>
            </label>
          ))}
        </div>
      );

    case "true-false":
      return (
        <div className="space-y-3 max-w-xs">
          <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name={`question-${question._id}`}
              value="true"
              checked={answer === "true"}
              onChange={(e) => onAnswer(e.target.value)}
              className="mr-3"
            />
            <span>True</span>
          </label>
          <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name={`question-${question._id}`}
              value="false"
              checked={answer === "false"}
              onChange={(e) => onAnswer(e.target.value)}
              className="mr-3"
            />
            <span>False</span>
          </label>
        </div>
      );

    case "fill-blank":
      return (
        <input
          type="text"
          placeholder="Enter your answer"
          value={answer as string || ""}
          onChange={(e) => onAnswer(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );

    case "descriptive":
      return (
        <textarea
          placeholder="Write your answer here..."
          value={answer as string || ""}
          onChange={(e) => onAnswer(e.target.value)}
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );

    case "multi-select":
      return (
        <div className="space-y-3">
          {question.options?.map((option) => (
            <label
              key={option.optionId}
              className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                value={option.optionId}
                checked={(answer as string[])?.includes(option.optionId) || false}
                onChange={(e) => {
                  const current = (answer as string[]) || [];
                  if (e.target.checked) {
                    onAnswer([...current, e.target.value]);
                  } else {
                    onAnswer(current.filter((o) => o !== e.target.value));
                  }
                }}
                className="mr-3"
              />
              <span>{option.text}</span>
            </label>
          ))}
        </div>
      );

    default:
      return <p className="text-gray-600">Question type not supported</p>;
  }
};

export default ExamMode;
