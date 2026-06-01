const express = require("express");
const router = express.Router();
const CodingSubmission = require("../models/CodingSubmission");
const TestAttempt = require("../models/TestAttempt");
const Question = require("../models/Question");
const { auth } = require("../middleware/auth");

// ==================== CODING SUBMISSION HANDLING ====================

// Submit code solution
router.post("/coding-submissions", auth, async (req, res) => {
  try {
    const {
      testAttemptId,
      questionId,
      code,
      language,
    } = req.body;

    const question = await Question.findById(questionId);
    if (!question || question.type !== "coding") {
      return res.status(400).json({ error: "Invalid coding question" });
    }

    const submission = new CodingSubmission({
      testAttemptId,
      questionId,
      studentId: req.user.userId,
      testId: req.body.testId,
      code,
      language,
      status: "submitted",
    });

    await submission.save();

    // Queue for evaluation
    evaluateCodeAsync(submission);

    res.status(201).json({
      submissionId: submission._id,
      message: "Code submitted for evaluation",
      status: "submitted",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get submission details
router.get("/coding-submissions/:submissionId", auth, async (req, res) => {
  try {
    const submission = await CodingSubmission.findById(
      req.params.submissionId
    ).populate("questionId");

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // Check authorization
    if (
      submission.studentId.toString() !== req.user.userId &&
      req.user.role !== "teacher" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all submissions for attempt
router.get("/attempts/:attemptId/coding-submissions", auth, async (req, res) => {
  try {
    const submissions = await CodingSubmission.find({
      testAttemptId: req.params.attemptId,
    }).sort({ createdAt: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resubmit code
router.post("/coding-submissions/:submissionId/resubmit", auth, async (req, res) => {
  try {
    const { code } = req.body;
    const originalSubmission = await CodingSubmission.findById(
      req.params.submissionId
    );

    if (!originalSubmission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    if (originalSubmission.studentId.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Store previous version
    originalSubmission.previousVersions.push({
      code: originalSubmission.code,
      submittedAt: new Date(),
      testResults: originalSubmission.testResults,
    });

    // Update with new code
    originalSubmission.code = code;
    originalSubmission.status = "submitted";
    originalSubmission.submissionNumber++;
    originalSubmission.testResults = [];

    await originalSubmission.save();

    // Queue for evaluation
    evaluateCodeAsync(originalSubmission);

    res.json({
      message: "Code resubmitted for evaluation",
      status: "submitted",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get code execution result
router.get(
  "/coding-submissions/:submissionId/results",
  auth,
  async (req, res) => {
    try {
      const submission = await CodingSubmission.findById(
        req.params.submissionId
      );

      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      res.json({
        status: submission.status,
        testResults: submission.testResults,
        passedTestCases: submission.passedTestCases,
        totalTestCases: submission.totalTestCases,
        percentage: submission.testCasePassPercentage,
        marksObtained: submission.marksObtained,
        compilationError: submission.compilationError,
        runtimeError: submission.runtimeError,
        timeoutError: submission.timeoutError,
        memoryExceeded: submission.memoryExceeded,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ==================== PLAGIARISM DETECTION ====================

// Check plagiarism (stub for integration)
router.post(
  "/coding-submissions/:submissionId/check-plagiarism",
  auth,
  async (req, res) => {
    try {
      const submission = await CodingSubmission.findById(
        req.params.submissionId
      ).populate("questionId");

      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Stub: In real implementation, integrate with plagiarism detection API
      // For now, return placeholder
      const plagiarismResult = {
        submissionId: submission._id,
        overallSimilarity: 0, // 0-100
        flaggedSimilarities: [],
        riskLevel: "low", // low, medium, high
        recommendations: [
          "Code appears to be original",
        ],
      };

      // Save plagiarism check result
      submission.plagiarismCheck = {
        checked: true,
        checkedAt: new Date(),
        overallSimilarity: plagiarismResult.overallSimilarity,
        riskLevel: plagiarismResult.riskLevel,
      };

      await submission.save();

      res.json(plagiarismResult);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ==================== ASYNC CODE EVALUATION ====================

async function evaluateCodeAsync(submission) {
  try {
    const question = await Question.findById(submission.questionId);

    if (!question || !question.codingConfig) {
      return;
    }

    submission.status = "compiling";
    await submission.save();

    // Prepare test cases - hide sensitive test cases on client
    const testCases = question.codingConfig.testCases || [];
    const visibleTestCases = testCases.filter((tc) => !tc.isHidden);

    // Evaluate against visible test cases
    const results = [];
    let passedCount = 0;

    for (const testCase of visibleTestCases) {
      try {
        const result = await executeCode(
          submission.code,
          submission.language,
          testCase.input,
          question.codingConfig.timeLimit || 30,
          question.codingConfig.memoryLimit || 256
        );

        const passed = result.output.trim() === testCase.expectedOutput.trim();

        results.push({
          testCaseId: testCase._id || `tc-${results.length}`,
          passed,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: result.output,
          executionTime: result.executionTime,
          memory: result.memory,
          errorMessage: result.error || null,
          hidden: false,
        });

        if (passed) {
          passedCount++;
        }
      } catch (error) {
        results.push({
          testCaseId: `tc-${results.length}`,
          passed: false,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: "",
          errorMessage: error.message,
          hidden: false,
        });
      }
    }

    submission.testResults = results;
    submission.totalTestCases = visibleTestCases.length;
    submission.passedTestCases = passedCount;
    submission.testCasePassPercentage = visibleTestCases.length > 0
      ? (passedCount / visibleTestCases.length) * 100
      : 0;
    submission.status = "completed";

    // Calculate marks
    const question_ref = await Question.findById(submission.questionId);
    submission.marksObtained =
      (submission.testCasePassPercentage / 100) * (question_ref.marks || 10);

    await submission.save();

    // Update test attempt with coding question marks
    const attempt = await TestAttempt.findById(submission.testAttemptId);
    if (attempt) {
      const answerIndex = attempt.answers.findIndex((a) =>
        a.questionId.equals(submission.questionId)
      );
      if (answerIndex >= 0) {
        attempt.answers[answerIndex].marksObtained = submission.marksObtained;
        attempt.answers[answerIndex].isCorrect =
          submission.testCasePassPercentage === 100;
      }
      await attempt.save();
    }
  } catch (error) {
    // Log error but don't crash
    console.error("Code evaluation error:", error);
  }
}

// Mock code execution function
// In production, integrate with:
// - Judge0 API (https://judge0.com/)
// - Sphere Engine
// - HackerRank API
// - Custom sandbox with Docker
async function executeCode(
  code,
  language,
  input,
  timeLimit,
  memoryLimit
) {
  // Stub implementation
  // Replace with actual execution service

  return {
    output: "execution_output",
    executionTime: 10, // milliseconds
    memory: 5, // MB
    error: null,
  };

  // Example with Judge0 (if using):
  /*
  const languageId = {
    python: 71,
    javascript: 63,
    java: 62,
    cpp: 54,
    c: 50,
  }[language];

  const response = await axios.post(
    'https://judge0-ce.p.rapidapi.com/submissions',
    {
      source_code: code,
      language_id: languageId,
      stdin: input,
      cpu_time_limit: timeLimit,
      memory_limit: memoryLimit * 1024, // Convert to KB
    },
    {
      headers: {
        'X-RapidAPI-Key': process.env.JUDGE0_API_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
    }
  );

  // Poll for results...
  */
}

module.exports = router;
