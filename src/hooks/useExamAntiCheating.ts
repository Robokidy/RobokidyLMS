/**
 * useAntiCheating - Detects and logs suspicious exam behavior
 * Includes: Tab switching, Window blur, Copy/paste, Right-click, etc.
 */

import { useEffect, useRef, useCallback, useState } from "react";

interface ViolationData {
  violationType: string;
  description: string;
  severity: "warning" | "major" | "critical";
  screenResolution?: string;
}

interface UseAntiCheatingProps {
  enabled: boolean;
  testConfig: {
    fullscreenMode?: boolean;
    tabSwitchDetection?: boolean;
    windowBlurDetection?: boolean;
    copyPasteDetection?: boolean;
    rightClickDisabled?: boolean;
    textSelectionDisabled?: boolean;
    violationThresholds?: {
      warningAt?: number;
      autoSubmitAt?: number;
    };
  };
  onViolation: (violation: ViolationData) => Promise<void>;
}

export const useAntiCheating = ({
  enabled,
  testConfig,
  onViolation,
}: UseAntiCheatingProps) => {
  const [violations, setViolations] = useState<ViolationData[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pageHiddenRef = useRef(false);
  const tabSwitchCountRef = useRef(0);
  const documentHiddenAtStartRef = useRef(false);

  // Handle fullscreen
  useEffect(() => {
    if (!enabled || !testConfig.fullscreenMode) return;

    const enterFullscreen = async () => {
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch (error) {
        console.error("Failed to enter fullscreen:", error);
      }
    };

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement
      );

      setIsFullscreen(isCurrentlyFullscreen);

      if (!isCurrentlyFullscreen) {
        // User exited fullscreen - report violation
        const violation: ViolationData = {
          violationType: "fullscreen-exit",
          description: "Student exited fullscreen mode during exam",
          severity: "major",
        };
        onViolation(violation);
      }
    };

    enterFullscreen();

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    (document as any).addEventListener("webkitfullscreenchange", handleFullscreenChange);
    (document as any).addEventListener("mozfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      (document as any).removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      (document as any).removeEventListener("mozfullscreenchange", handleFullscreenChange);
    };
  }, [enabled, testConfig.fullscreenMode, onViolation]);

  // Tab switch detection
  useEffect(() => {
    if (!enabled || !testConfig.tabSwitchDetection) return;

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;

      if (isHidden && !pageHiddenRef.current) {
        // Page just became hidden (tab switched away)
        tabSwitchCountRef.current += 1;
        const violation: ViolationData = {
          violationType: "tab-switch",
          description: `Tab switch detected (${tabSwitchCountRef.current})`,
          severity: tabSwitchCountRef.current > 2 ? "major" : "warning",
        };
        onViolation(violation);
      }

      pageHiddenRef.current = isHidden;
    };

    // Check if already hidden at start
    documentHiddenAtStartRef.current = document.hidden;

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, testConfig.tabSwitchDetection, onViolation]);

  // Window blur detection
  useEffect(() => {
    if (!enabled || !testConfig.windowBlurDetection) return;

    const handleWindowBlur = () => {
      const violation: ViolationData = {
        violationType: "window-blur",
        description: "Window lost focus during exam",
        severity: "warning",
      };
      onViolation(violation);
    };

    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [enabled, testConfig.windowBlurDetection, onViolation]);

  // Copy/Paste detection
  useEffect(() => {
    if (!enabled || !testConfig.copyPasteDetection) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      const violation: ViolationData = {
        violationType: "copy-paste",
        description: "Copy attempt detected",
        severity: "warning",
      };
      onViolation(violation);
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      const violation: ViolationData = {
        violationType: "copy-paste",
        description: "Paste attempt detected",
        severity: "warning",
      };
      onViolation(violation);
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [enabled, testConfig.copyPasteDetection, onViolation]);

  // Right-click detection
  useEffect(() => {
    if (!enabled || !testConfig.rightClickDisabled) return;

    const handleRightClick = (e: MouseEvent) => {
      e.preventDefault();
      const violation: ViolationData = {
        violationType: "right-click",
        description: "Right-click attempt detected",
        severity: "warning",
      };
      onViolation(violation);
    };

    document.addEventListener("contextmenu", handleRightClick);

    return () => {
      document.removeEventListener("contextmenu", handleRightClick);
    };
  }, [enabled, testConfig.rightClickDisabled, onViolation]);

  // Text selection disable
  useEffect(() => {
    if (!enabled || !testConfig.textSelectionDisabled) return;

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener("selectstart", handleSelectStart);

    return () => {
      document.removeEventListener("selectstart", handleSelectStart);
    };
  }, [enabled, testConfig.textSelectionDisabled]);

  // Keyboard shortcut detection
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "C") ||
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        (e.ctrlKey && e.key === "s") || // Ctrl+S
        (e.ctrlKey && e.key === "p") // Ctrl+P
      ) {
        e.preventDefault();
        const violation: ViolationData = {
          violationType: "keyboard-shortcut",
          description: `Keyboard shortcut blocked: ${e.key}`,
          severity: "warning",
        };
        onViolation(violation);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onViolation]);

  // Disable common exam cheating techniques in CSS
  useEffect(() => {
    if (!enabled) return;

    const style = document.createElement("style");
    style.textContent = `
      * {
        -webkit-user-select: ${testConfig.textSelectionDisabled ? "none" : "auto"};
        user-select: ${testConfig.textSelectionDisabled ? "none" : "auto"};
      }
      html, body {
        overflow: ${testConfig.fullscreenMode ? "hidden" : "auto"};
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [enabled, testConfig]);

  return {
    isFullscreen,
    violations,
    tabSwitchCount: tabSwitchCountRef.current,
  };
};
