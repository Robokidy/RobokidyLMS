/**
 * Enterprise Exam Module - Frontend Service
 * Handles all exam-related API calls and business logic
 */

import { baseURL } from "./client";

export const examAPI = {
  // ==================== TEST MANAGEMENT ====================

  // Get all tests
  getTests: async (token: string) => {
    const res = await fetch(`${baseURL}/exams/tests`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch tests");
    return res.json();
  },

  // Get single test
  getTest: async (testId: string, token: string) => {
    const res = await fetch(`${baseURL}/exams/tests/${testId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch test");
    return res.json();
  },

  // Create test
  createTest: async (testData: any, token: string) => {
    const res = await fetch(`${baseURL}/exams/tests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(testData),
    });
    if (!res.ok) throw new Error("Failed to create test");
    return res.json();
  },

  // Update test
  updateTest: async (testId: string, data: any, token: string) => {
    const res = await fetch(`${baseURL}/exams/tests/${testId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update test");
    return res.json();
  },

  // Publish test
  publishTest: async (testId: string, token: string) => {
    const res = await fetch(`${baseURL}/exams/tests/${testId}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to publish test");
    return res.json();
  },

  // Delete test
  deleteTest: async (testId: string, token: string) => {
    const res = await fetch(`${baseURL}/exams/tests/${testId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to delete test");
    return res.json();
  },

  // ==================== QUESTION MANAGEMENT ====================

  // Add question
  addQuestion: async (testId: string, questionData: any, token: string) => {
    const res = await fetch(`${baseURL}/exams/tests/${testId}/questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(questionData),
    });
    if (!res.ok) throw new Error("Failed to add question");
    return res.json();
  },

  // Update question
  updateQuestion: async (questionId: string, data: any, token: string) => {
    const res = await fetch(`${baseURL}/exams/questions/${questionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update question");
    return res.json();
  },

  // Delete question
  deleteQuestion: async (questionId: string, token: string) => {
    const res = await fetch(`${baseURL}/exams/questions/${questionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to delete question");
    return res.json();
  },

  // Get questions for test
  getQuestions: async (testId: string, token: string) => {
    const res = await fetch(`${baseURL}/exams/tests/${testId}/questions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch questions");
    return res.json();
  },

  // ==================== TEST ASSIGNMENT =======================

  // Assign test
  assignTest: async (testId: string, assignmentData: any, token: string) => {
    const res = await fetch(`${baseURL}/exams/tests/${testId}/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(assignmentData),
    });
    if (!res.ok) throw new Error("Failed to assign test");
    return res.json();
  },

  // Get assignments
  getAssignments: async (testId: string, token: string) => {
    const res = await fetch(`${baseURL}/exams/tests/${testId}/assignments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch assignments");
    return res.json();
  },

  // ==================== STUDENT - TEST ATTEMPTS =======================

  // Get student's assigned tests
  getStudentTests: async (token: string) => {
    const res = await fetch(`${baseURL}/exams/student/tests`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch student tests");
    return res.json();
  },

  // Start test
  startTest: async (testId: string, data: any, token: string) => {
    const res = await fetch(`${baseURL}/exams/tests/${testId}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to start test");
    }
    return res.json();
  },

  // Save answer
  saveAnswer: async (
    attemptId: string,
    answerData: any,
    token: string
  ) => {
    const res = await fetch(`${baseURL}/exams/attempts/${attemptId}/save-answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(answerData),
    });
    if (!res.ok) throw new Error("Failed to save answer");
    return res.json();
  },

  // Mark for review
  markForReview: async (
    attemptId: string,
    questionId: string,
    reviewFlag: boolean,
    token: string
  ) => {
    const res = await fetch(`${baseURL}/exams/attempts/${attemptId}/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ questionId, reviewFlag }),
    });
    if (!res.ok) throw new Error("Failed to mark for review");
    return res.json();
  },

  // Get attempt details
  getAttempt: async (attemptId: string, token: string) => {
    const res = await fetch(`${baseURL}/exams/attempts/${attemptId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch attempt");
    return res.json();
  },

  // Submit test
  submitTest: async (
    attemptId: string,
    submissionData: any,
    token: string
  ) => {
    const res = await fetch(`${baseURL}/exams/attempts/${attemptId}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(submissionData),
    });
    if (!res.ok) throw new Error("Failed to submit test");
    return res.json();
  },

  // ==================== ANTI-CHEATING =======================

  // Report violation
  reportViolation: async (
    attemptId: string,
    violationData: any,
    token: string
  ) => {
    const res = await fetch(
      `${baseURL}/exams/attempts/${attemptId}/violation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(violationData),
      }
    );
    if (!res.ok) throw new Error("Failed to report violation");
    return res.json();
  },

  // ==================== REPORTING =======================

  // Get test report
  getTestReport: async (testId: string, token: string) => {
    const res = await fetch(`${baseURL}/exams/tests/${testId}/report`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch test report");
    return res.json();
  },

  // Get admin analytics
  getAdminAnalytics: async (token: string) => {
    const res = await fetch(`${baseURL}/exams/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
  },
};
