/**
 * useExamTimer - Manages exam countdown timer with server validation
 */

import { useEffect, useState, useCallback } from "react";

interface UseExamTimerProps {
  testDurationMinutes: number;
  onTimeout: () => void;
  onWarning?: (minutesRemaining: number) => void;
}

export const useExamTimer = ({
  testDurationMinutes,
  onTimeout,
  onWarning,
}: UseExamTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(testDurationMinutes * 60);
  const [isRunning, setIsRunning] = useState(true);
  const [hasWarned, setHasWarned] = useState(false);

  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) {
      if (timeRemaining <= 0) {
        setIsRunning(false);
        onTimeout();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;

        // Warning at 5 minutes
        if (newTime === 300 && !hasWarned && onWarning) {
          setHasWarned(true);
          onWarning(5);
        }

        // Warning at 1 minute
        if (newTime === 60 && onWarning) {
          onWarning(1);
        }

        if (newTime <= 0) {
          setIsRunning(false);
          onTimeout();
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, hasWarned, timeRemaining, onTimeout, onWarning]);

  const pause = useCallback(() => setIsRunning(false), []);
  const resume = useCallback(() => setIsRunning(true), []);
  const reset = useCallback(() => {
    setTimeRemaining(testDurationMinutes * 60);
    setHasWarned(false);
    setIsRunning(true);
  }, [testDurationMinutes]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formatted = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  return {
    timeRemaining,
    formatted,
    isRunning,
    pause,
    resume,
    reset,
    isWarning: timeRemaining <= 300,
    isCritical: timeRemaining <= 60,
  };
};
