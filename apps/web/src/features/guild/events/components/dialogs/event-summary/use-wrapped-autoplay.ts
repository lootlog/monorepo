import { useEffect, useRef, useState, type RefObject } from "react";

const SLIDE_DURATION_MS = 8000;

export const useWrappedAutoplay = ({
  activeSlideId,
  enabled,
  interactionEnabled,
  stageRef,
  onAdvance,
}: {
  activeSlideId: string;
  enabled: boolean;
  interactionEnabled: boolean;
  stageRef: RefObject<HTMLElement | null>;
  onAdvance: () => void;
}) => {
  const [progress, setProgress] = useState(0);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const elapsedMillisecondsRef = useRef(0);
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;

  useEffect(() => {
    elapsedMillisecondsRef.current = 0;
    setProgress(0);
  }, [activeSlideId]);

  useEffect(() => {
    if (!interactionEnabled) {
      setIsInteractionPaused(false);
      return;
    }

    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const activeReasons = new Set<string>();
    const updateInteractionState = () => {
      setIsInteractionPaused(activeReasons.size > 0);
    };
    const addReason = (reason: string) => {
      activeReasons.add(reason);
      updateInteractionState();
    };
    const removeReason = (reason: string) => {
      activeReasons.delete(reason);
      updateInteractionState();
    };
    const handleSelectionChange = () => {
      const selection = document.getSelection();
      const selectionInsideStage =
        selection !== null &&
        !selection.isCollapsed &&
        selection.rangeCount > 0 &&
        stage.contains(selection.getRangeAt(0).commonAncestorContainer);

      if (selectionInsideStage) {
        addReason("selection");
        return;
      }

      removeReason("selection");
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        addReason("visibility");
        return;
      }

      removeReason("visibility");
    };
    const handleFocusOut = () => {
      requestAnimationFrame(() => {
        if (!stage.contains(document.activeElement)) {
          removeReason("focus");
        }
      });
    };
    const handlePointerEnter = () => addReason("pointer");
    const handlePointerLeave = () => removeReason("pointer");
    const handleFocusIn = () => addReason("focus");

    stage.addEventListener("pointerenter", handlePointerEnter);
    stage.addEventListener("pointerleave", handlePointerLeave);
    stage.addEventListener("focusin", handleFocusIn);
    stage.addEventListener("focusout", handleFocusOut);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    handleVisibilityChange();

    if (stage.matches(":hover")) {
      addReason("pointer");
    }

    if (stage.contains(document.activeElement)) {
      addReason("focus");
    }

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stage.removeEventListener("pointerenter", handlePointerEnter);
      stage.removeEventListener("pointerleave", handlePointerLeave);
      stage.removeEventListener("focusin", handleFocusIn);
      stage.removeEventListener("focusout", handleFocusOut);
    };
  }, [interactionEnabled, stageRef]);

  useEffect(() => {
    if (!enabled || isUserPaused || isInteractionPaused) {
      return;
    }

    const startedAt = performance.now() - elapsedMillisecondsRef.current;
    let animationFrameId = 0;

    const updateProgress = (timestamp: number) => {
      const elapsedMilliseconds = timestamp - startedAt;
      elapsedMillisecondsRef.current = elapsedMilliseconds;
      setProgress(Math.min(elapsedMilliseconds / SLIDE_DURATION_MS, 1));

      if (elapsedMilliseconds >= SLIDE_DURATION_MS) {
        elapsedMillisecondsRef.current = 0;
        setProgress(0);
        onAdvanceRef.current();
        return;
      }

      animationFrameId = requestAnimationFrame(updateProgress);
    };

    animationFrameId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeSlideId, enabled, isInteractionPaused, isUserPaused]);

  const reset = () => {
    elapsedMillisecondsRef.current = 0;
    setProgress(0);
  };

  return {
    progress,
    isUserPaused,
    toggleUserPaused: () => setIsUserPaused((paused) => !paused),
    reset,
  };
};
