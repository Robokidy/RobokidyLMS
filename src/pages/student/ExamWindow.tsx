import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Alert, Badge, Modal, Progress } from '@/components/ui';
import { ChevronRight, ChevronLeft, Flag, Clock, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/api/client';

export default function ExamWindow({ testId, attemptId }) {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [reviewFlags, setReviewFlags] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [violations, setViolations] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const windowRef = useRef(null);
  const timerRef = useRef(null);
  const activityRef = useRef(null);
  const violationCountRef = useRef(0);
  const token = localStorage.getItem('token') || undefined;

  // Initialize exam
  useEffect(() => {
    const initExam = async () => {
      try {
        const data = await apiFetch(`/tests/${testId}/start`, { method: 'POST' }, token);
        setQuestions(data.questions);
        setTimeRemaining(data.testDuration * 60); // Convert to seconds

        // Request fullscreen
        if (windowRef.current?.requestFullscreen) {
          windowRef.current.requestFullscreen().catch((err) => {
            console.error('Fullscreen request failed:', err);
          });
        }
      } catch (error) {
        console.error('Error initializing exam:', error);
      }
    };

    initExam();
  }, [testId]);

  // Timer and auto-save
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          autoSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  // Auto-save answers every 10 seconds
  useEffect(() => {
    const autoSaveTimer = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        saveAnswer(currentQuestionIndex, answers[currentQuestionIndex]);
      }
    }, 10000);

    return () => clearInterval(autoSaveTimer);
  }, [answers, currentQuestionIndex]);

  // Anti-cheating detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('tab-switch', 'Tab switching detected');
        violationCountRef.current++;
        checkViolationThreshold();
      }
    };

    const handleWindowBlur = () => {
      logViolation('window-blur', 'Window lost focus');
      violationCountRef.current++;
      checkViolationThreshold();
    };

    const handleWindowMinimize = () => {
      if (document.hidden || !document.hasFocus()) {
        logViolation('window-minimize', 'Window minimized');
        violationCountRef.current++;
        checkViolationThreshold();
      }
    };

    const handleRightClick = (e) => {
      e.preventDefault();
      logViolation('right-click', 'Right-click attempted');
    };

    const handleKeyDown = (e) => {
      // Disable dangerous keyboard shortcuts
      if (
        (e.ctrlKey && e.key === 'c') ||
        (e.ctrlKey && e.key === 'v') ||
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'p') ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'i')
      ) {
        e.preventDefault();
        logViolation('keyboard-shortcut', `Shortcut blocked: ${e.key}`);
        violationCountRef.current++;
        checkViolationThreshold();
      }
    };

    const handleCopy = (e) => {
      e.preventDefault();
      logViolation('copy-attempt', 'Copy attempt detected');
      violationCountRef.current++;
      checkViolationThreshold();
    };

    const handlePaste = (e) => {
      e.preventDefault();
      logViolation('paste-attempt', 'Paste attempt detected');
      violationCountRef.current++;
      checkViolationThreshold();
    };

    const handleSelectStart = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', (e) => {
      if (!submitted) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
    document.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('selectstart', handleSelectStart);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('contextmenu', handleRightClick);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, [submitted]);

  const logViolation = async (type, description) => {
    try {
      await apiFetch(`/tests/attempts/${attemptId}/violation`, {
        method: 'POST',
        body: {
          violationType: type,
          description,
          severity: violationCountRef.current >= 2 ? 'moderate' : 'warning',
        },
      }, token);

      setViolations((prev) => [
        ...prev,
        {
          type,
          timestamp: new Date(),
          count: violationCountRef.current,
        },
      ]);
    } catch (error) {
      console.error('Error logging violation:', error);
    }
  };

  const checkViolationThreshold = () => {
    if (violationCountRef.current === 1) {
      setWarningMessage('Warning: Suspicious activity detected. Continued violations may result in auto-submission.');
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 5000);
    } else if (violationCountRef.current >= 3) {
      autoSubmitTest();
    }
  };

  const saveAnswer = async (questionIndex, answer) => {
    try {
      const question = questions[questionIndex];
      await apiFetch(`/tests/attempts/${attemptId}/save-answer`, {
        method: 'POST',
        body: {
          questionId: question._id,
          answer,
          questionType: question.type,
          timeSpent: Math.floor(Date.now() / 1000),
        },
      }, token);
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const autoSubmitTest = async () => {
    if (submitted) return;

    setSubmitted(true);
    setWarningMessage('Time is up! Your test is being submitted...');
    setShowWarning(true);

    try {
      await apiFetch(`/tests/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: {
          submissionMethod: 'auto-timeout',
        },
      }, token);

      // Redirect to results
      window.location.href = `/student/tests/${testId}/results`;
    } catch (error) {
      console.error('Error submitting test:', error);
    }
  };

  const submitTest = async () => {
    if (
      !window.confirm(
        'Are you sure you want to submit? You cannot make changes after submission.'
      )
    ) {
      return;
    }

    setSubmitted(true);

    try {
      await apiFetch(`/tests/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: {
          submissionMethod: 'manual',
        },
      }, token);

      window.location.href = `/student/tests/${testId}/results`;
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Error submitting test. Please try again.');
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).filter((k) => answers[k]).length;
  const reviewCount = Object.values(reviewFlags).filter(Boolean).length;

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card>
          <Card.Content className="p-8">
            <p className="text-lg">Loading exam...</p>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div
      ref={windowRef}
      className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen"
      style={{ userSelect: 'none' }}
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {currentQuestion?.testTitle || 'Online Exam'}
              </h1>
            </div>

            {/* Timer */}
            <div
              className={`text-center px-6 py-3 rounded-lg font-bold ${
                timeRemaining < 300
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              <Clock className="w-5 h-5 inline mr-2" />
              {formatTime(timeRemaining)}
            </div>

            {/* Violations */}
            {violations.length > 0 && (
              <Badge variant="destructive" className="ml-4">
                {violations.length} Violations Detected
              </Badge>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
              <span>Progress</span>
              <span>
                {answeredCount} / {questions.length} answered
              </span>
            </div>
            <Progress value={(answeredCount / questions.length) * 100} />
          </div>
        </div>
      </div>

      {/* Warnings */}
      {showWarning && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <Alert type="warning" title="Warning" className="mb-4">
            {warningMessage}
          </Alert>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <Card className="min-h-[600px]">
              <Card.Header className="border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="mb-2">
                      Question {currentQuestionIndex + 1} / {questions.length}
                    </Badge>
                    <h2 className="text-xl font-bold mt-2">{currentQuestion?.questionText}</h2>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600">
                      {currentQuestion?.marks} marks
                    </div>
                    <Badge variant="outline" className="mt-2">
                      {currentQuestion?.type}
                    </Badge>
                  </div>
                </div>
              </Card.Header>

              <Card.Content className="p-6">
                <QuestionRenderer
                  question={currentQuestion}
                  answer={answers[currentQuestion._id]}
                  onChange={(answer) => {
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion._id]: answer,
                    }));
                  }}
                />
              </Card.Content>

              {/* Navigation Buttons */}
              <Card.Footer className="border-t flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                <Button
                  variant={reviewFlags[currentQuestion._id] ? 'warning' : 'ghost'}
                  onClick={() => {
                    setReviewFlags((prev) => ({
                      ...prev,
                      [currentQuestion._id]: !prev[currentQuestion._id],
                    }));
                  }}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  {reviewFlags[currentQuestion._id] ? 'Flagged for Review' : 'Flag for Review'}
                </Button>

                <Button
                  onClick={() =>
                    setCurrentQuestionIndex((prev) =>
                      Math.min(questions.length - 1, prev + 1)
                    )
                  }
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="bg-blue-600"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Card.Footer>
            </Card>
          </div>

          {/* Question Palette */}
          <div>
            <Card>
              <Card.Header>
                <h3 className="font-bold">Questions</h3>
              </Card.Header>
              <Card.Content>
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {questions.map((q, idx) => (
                    <button
                      key={q._id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`aspect-square rounded font-bold text-xs transition-all ${
                        currentQuestionIndex === idx
                          ? 'bg-blue-600 text-white'
                          : answers[q._id]
                          ? 'bg-green-100 border-2 border-green-400'
                          : reviewFlags[q._id]
                          ? 'bg-yellow-100 border-2 border-yellow-400'
                          : 'bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                {/* Legend */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-100 border border-green-400 rounded"></div>
                    <span>Answered ({answeredCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-400 rounded"></div>
                    <span>Flagged ({reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                    <span>Not Answered</span>
                  </div>
                </div>
              </Card.Content>

              <Card.Footer className="border-t pt-4 flex gap-2">
                <Button
                  onClick={submitTest}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={submitted}
                >
                  Submit Test
                </Button>
              </Card.Footer>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Question renderer component
function QuestionRenderer({ question, answer, onChange }) {
  if (!question) return null;

  switch (question.type) {
    case 'mcq':
    case 'true-false':
      return (
        <div className="space-y-3">
          {question.options?.map((option) => (
            <label
              key={option.optionId}
              className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
            >
              <input
                type="radio"
                name={question._id}
                value={option.optionId}
                checked={answer === option.optionId}
                onChange={(e) => onChange(e.target.value)}
                className="w-4 h-4"
              />
              <span className="ml-3">{option.text}</span>
            </label>
          ))}
        </div>
      );

    case 'multi-select':
      return (
        <div className="space-y-3">
          {question.options?.map((option) => (
            <label
              key={option.optionId}
              className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={Array.isArray(answer) && answer.includes(option.optionId)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...(Array.isArray(answer) ? answer : []), option.optionId]);
                  } else {
                    onChange(
                      Array.isArray(answer)
                        ? answer.filter((a) => a !== option.optionId)
                        : []
                    );
                  }
                }}
                className="w-4 h-4"
              />
              <span className="ml-3">{option.text}</span>
            </label>
          ))}
        </div>
      );

    case 'fill-blank':
      return (
        <div className="space-y-4">
          <textarea
            value={answer || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your answer..."
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>
      );

    case 'descriptive':
      return (
        <div className="space-y-4">
          <textarea
            value={answer || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your answer here..."
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={8}
          />
          <p className="text-xs text-gray-500">
            Character count: {(answer || '').length}
          </p>
        </div>
      );

    case 'coding':
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Code Editor (Integration Required)</p>
          <textarea
            value={answer || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your code here..."
            className="w-full p-3 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={10}
          />
        </div>
      );

    default:
      return <p className="text-gray-500">Question type not supported</p>;
  }
}
