/**
 * useAutoSave - Auto-saves exam answers at regular intervals
 */

import { useEffect, useRef, useCallback, useState } from "react";

interface Answer {
  questionId: string;
  answer: any;
  timeSpent: number;
}

interface UseAutoSaveProps {
  attemptId: string;
  answers: Answer[];
  onSave: (answer: Answer) => Promise<void>;
  interval?: number; // milliseconds
}

export const useAutoSave = ({
  attemptId,
  answers,
  onSave,
  interval = 10000, // 10 seconds default
}: UseAutoSaveProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [saveError, setSaveError] = useState<string | null>(null);
  const unsavedChangesRef = useRef<Set<string>>(new Set());

  // Mark answer as unsaved
  const markUnsaved = useCallback((questionId: string) => {
    unsavedChangesRef.current.add(questionId);
  }, []);

  // Auto-save unsaved answers
  const performAutoSave = useCallback(async () => {
    if (unsavedChangesRef.current.size === 0) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const answersToSave = answers.filter((a) =>
        unsavedChangesRef.current.has(a.questionId)
      );

      for (const answer of answersToSave) {
        await onSave(answer);
      }

      unsavedChangesRef.current.clear();
      setLastSaved(Date.now());
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Auto-save failed"
      );
      console.error("Auto-save error:", error);
    } finally {
      setIsSaving(false);
    }
  }, [answers, onSave]);

  // Set up auto-save interval
  useEffect(() => {
    const autoSaveInterval = setInterval(
      performAutoSave,
      interval
    );

    return () => clearInterval(autoSaveInterval);
  }, [interval, performAutoSave]);

  // Save before unmount
  useEffect(() => {
    return () => {
      if (unsavedChangesRef.current.size > 0) {
        performAutoSave();
      }
    };
  }, [performAutoSave]);

  // Manual save
  const saveNow = useCallback(async () => {
    await performAutoSave();
  }, [performAutoSave]);

  return {
    isSaving,
    lastSaved,
    saveError,
    hasUnsavedChanges: unsavedChangesRef.current.size > 0,
    unsavedCount: unsavedChangesRef.current.size,
    markUnsaved,
    saveNow,
  };
};
