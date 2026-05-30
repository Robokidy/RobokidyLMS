import { useEffect, useRef, useState, useCallback } from "react";

interface CheatingDetectionConfig {
  tabSwitchDetection: boolean;
  windowBlurDetection: boolean;
  windowMinimizeDetection: boolean;
  copyPasteDetection: boolean;
  rightClickDisabled: boolean;
  textSelectionDisabled: boolean;
  fullscreenMode: boolean;
  webcamMonitoring: boolean;
}

interface Violation {
  type: string;
  timestamp: Date;
  description: string;
}

interface AntiCheatingHooks {
  violations: Violation[];
  violationCount: number;
  onViolation: (violation: Violation) => void;
  isFullscreen: boolean;
  requestFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
}

export const useAntiCheating = (
  config: CheatingDetectionConfig,
  onViolationCallback?: (violation: Violation) => void
): AntiCheatingHooks => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [violationCount, setViolationCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const documentRef = useRef<Document>(document);
  const tabSwitchWarningTimeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityTimeRef = useRef<Date>(new Date());

  const addViolation = useCallback(
    (type: string, description: string) => {
      const violation: Violation = {
        type,
        timestamp: new Date(),
        description,
      };

      setViolations((prev) => [...prev, violation]);
      setViolationCount((prev) => prev + 1);

      if (onViolationCallback) {
        onViolationCallback(violation);
      }
    },
    [onViolationCallback]
  );

  // ==================== TAB SWITCH DETECTION ====================
  useEffect(() => {
    if (!config.tabSwitchDetection) return;

    const handleVisibilityChange = () => {
      if (documentRef.current.hidden) {
        addViolation(
          "tab-switch",
          "User switched to another tab/window"
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [config.tabSwitchDetection, addViolation]);

  // ==================== WINDOW BLUR/FOCUS DETECTION ====================
  useEffect(() => {
    if (!config.windowBlurDetection) return;

    const handleBlur = () => {
      addViolation("window-blur", "User switched focus away from the window");
    };

    const handleFocus = () => {
      lastActivityTimeRef.current = new Date();
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [config.windowBlurDetection, addViolation]);

  // ==================== COPY/PASTE DETECTION ====================
  useEffect(() => {
    if (!config.copyPasteDetection) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation(
        "copy-paste",
        "Copy attempt detected"
      );
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation(
        "copy-paste",
        "Paste attempt detected"
      );
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [config.copyPasteDetection, addViolation]);

  // ==================== RIGHT CLICK DETECTION ====================
  useEffect(() => {
    if (!config.rightClickDisabled) return;

    const handleRightClick = (e: MouseEvent) => {
      e.preventDefault();
      addViolation(
        "right-click",
        "Right-click attempt detected"
      );
    };

    document.addEventListener("contextmenu", handleRightClick);

    return () => {
      document.removeEventListener("contextmenu", handleRightClick);
    };
  }, [config.rightClickDisabled, addViolation]);

  // ==================== KEYBOARD SHORTCUTS DETECTION ====================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl+C - Copy
      if (isCtrlOrCmd && e.key === "c") {
        e.preventDefault();
        addViolation("keyboard-shortcut", "Ctrl+C (Copy) attempt detected");
      }

      // Ctrl+V - Paste
      if (isCtrlOrCmd && e.key === "v") {
        e.preventDefault();
        addViolation("keyboard-shortcut", "Ctrl+V (Paste) attempt detected");
      }

      // Ctrl+S - Save
      if (isCtrlOrCmd && e.key === "s") {
        e.preventDefault();
        addViolation("keyboard-shortcut", "Ctrl+S (Save) attempt detected");
      }

      // Ctrl+P - Print
      if (isCtrlOrCmd && e.key === "p") {
        e.preventDefault();
        addViolation("keyboard-shortcut", "Ctrl+P (Print) attempt detected");
      }

      // F12 - Developer Tools
      if (e.key === "F12") {
        e.preventDefault();
        addViolation("keyboard-shortcut", "F12 (DevTools) attempt detected");
      }

      // Ctrl+Shift+I - DevTools
      if (isCtrlOrCmd && e.shiftKey && e.key === "I") {
        e.preventDefault();
        addViolation("keyboard-shortcut", "Ctrl+Shift+I (DevTools) attempt detected");
      }

      // Ctrl+Shift+C - DevTools Inspector
      if (isCtrlOrCmd && e.shiftKey && e.key === "C") {
        e.preventDefault();
        addViolation("keyboard-shortcut", "Ctrl+Shift+C (Inspector) attempt detected");
      }

      // Ctrl+Shift+J - DevTools Console
      if (isCtrlOrCmd && e.shiftKey && e.key === "J") {
        e.preventDefault();
        addViolation("keyboard-shortcut", "Ctrl+Shift+J (Console) attempt detected");
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [addViolation]);

  // ==================== TEXT SELECTION PREVENTION ====================
  useEffect(() => {
    if (!config.textSelectionDisabled) return;

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener("selectstart", handleSelectStart);

    return () => {
      document.removeEventListener("selectstart", handleSelectStart);
    };
  }, [config.textSelectionDisabled]);

  // ==================== FULLSCREEN MODE ====================
  const requestFullscreen = async () => {
    try {
      const element = document.documentElement;
      const requestFn =
        element.requestFullscreen ||
        (element as any).webkitRequestFullscreen ||
        (element as any).mozRequestFullScreen ||
        (element as any).msRequestFullscreen;

      if (requestFn) {
        await requestFn.call(element);
        setIsFullscreen(true);
      }
    } catch (error) {
      console.error("Fullscreen request failed:", error);
    }
  };

  const exitFullscreen = async () => {
    try {
      const exitFn =
        document.exitFullscreen ||
        (document as any).webkitExitFullscreen ||
        (document as any).mozCancelFullScreen ||
        (document as any).msExitFullscreen;

      if (exitFn) {
        await exitFn.call(document);
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Exit fullscreen failed:", error);
    }
  };

  // Monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement
        )
      );

      if (!isFullscreen && config.fullscreenMode) {
        addViolation(
          "fullscreen-exit",
          "User exited fullscreen mode"
        );
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange
      );
    };
  }, [config.fullscreenMode, addViolation]);

  // ==================== WINDOW MINIMIZE DETECTION ====================
  useEffect(() => {
    if (!config.windowMinimizeDetection) return;

    let isWindowMinimized = false;

    const handleBlur = () => {
      isWindowMinimized = true;
      addViolation(
        "window-minimize",
        "Window was minimized or lost focus"
      );
    };

    const handleFocus = () => {
      if (isWindowMinimized) {
        isWindowMinimized = false;
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [config.windowMinimizeDetection, addViolation]);

  return {
    violations,
    violationCount,
    onViolation: addViolation,
    isFullscreen,
    requestFullscreen,
    exitFullscreen,
  };
};

// Component for displaying violations
export const ViolationWarning: React.FC<{
  violationCount: number;
  maxViolations: number;
  violations: Violation[];
}> = ({ violationCount, maxViolations, violations }) => {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (violationCount > 0) {
      setShowWarning(true);
      const timer = setTimeout(() => setShowWarning(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [violationCount]);

  if (!showWarning && violations.length === 0) {
    return null;
  }

  const warningColor = violationCount >= maxViolations ? "red" : "yellow";
  const warningMessage =
    violationCount >= maxViolations
      ? "Your test will be auto-submitted due to repeated violations!"
      : `Warning: ${violationCount}/${maxViolations} violations detected`;

  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded-lg border-2 ${
        warningColor === "red"
          ? "border-red-500 bg-red-50 text-red-800"
          : "border-yellow-500 bg-yellow-50 text-yellow-800"
      } z-50 max-w-sm`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{warningMessage}</p>
          {violations.length > 0 && (
            <p className="text-sm mt-2">
              Last violation: {violations[violations.length - 1].type}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowWarning(false)}
          className="ml-4 font-bold text-lg opacity-50 hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  );
};
