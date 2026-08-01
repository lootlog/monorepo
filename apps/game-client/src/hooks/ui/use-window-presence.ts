import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store/settings.store";
import {
  requestMeasuredAnimationFrame,
  setMeasuredTimeout,
} from "@/lib/performance-monitoring/measured-callback";

const WINDOW_EXIT_RETENTION_MS = 180;
const WINDOW_ENTRY_RETENTION_MS = 240;

export type WindowAnimationPhase = "enter" | "exit" | "open" | "preparing";

export const useWindowPresence = (isOpen: boolean) => {
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );
  const [retainedForExit, setRetainedForExit] = useState(isOpen);
  const [entryAnimationStarted, setEntryAnimationStarted] = useState(
    !animationEffectsEnabled,
  );
  const [entryAnimationCompleted, setEntryAnimationCompleted] = useState(
    !animationEffectsEnabled,
  );

  useEffect(() => {
    if (isOpen) {
      if (!retainedForExit) {
        setRetainedForExit(true);
      }
      return;
    }

    if (!animationEffectsEnabled && retainedForExit) {
      setRetainedForExit(false);
    }
  }, [animationEffectsEnabled, isOpen, retainedForExit]);

  useEffect(() => {
    if (isOpen || !animationEffectsEnabled || !retainedForExit) return;

    const timeoutId = setMeasuredTimeout(
      "window-presence.exit-retention",
      () => {
        setRetainedForExit(false);
      },
      WINDOW_EXIT_RETENTION_MS,
    );

    return () => window.clearTimeout(timeoutId);
  }, [animationEffectsEnabled, isOpen, retainedForExit]);

  useEffect(() => {
    if (!animationEffectsEnabled) {
      if (isOpen) {
        if (!entryAnimationStarted) {
          setEntryAnimationStarted(true);
        }
        if (!entryAnimationCompleted) {
          setEntryAnimationCompleted(true);
        }
      }
      return;
    }

    if (!isOpen) {
      setEntryAnimationStarted(false);
      setEntryAnimationCompleted(false);
    }
  }, [
    animationEffectsEnabled,
    entryAnimationCompleted,
    entryAnimationStarted,
    isOpen,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      !animationEffectsEnabled ||
      entryAnimationStarted ||
      entryAnimationCompleted
    ) {
      return;
    }

    const animationFrameId = requestMeasuredAnimationFrame(
      "window-presence.entry-frame",
      () => {
        setEntryAnimationStarted(true);
      },
    );

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [
    animationEffectsEnabled,
    entryAnimationCompleted,
    entryAnimationStarted,
    isOpen,
  ]);

  const shouldRender = isOpen || (animationEffectsEnabled && retainedForExit);
  let phase: WindowAnimationPhase = "open";
  if (animationEffectsEnabled && !isOpen) {
    phase = "exit";
  } else if (animationEffectsEnabled && !entryAnimationCompleted) {
    phase = entryAnimationStarted ? "enter" : "preparing";
  }

  useEffect(() => {
    if (phase !== "enter") return;

    const timeoutId = setMeasuredTimeout(
      "window-presence.entry-retention",
      () => {
        setEntryAnimationCompleted(true);
      },
      WINDOW_ENTRY_RETENTION_MS,
    );

    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  const onAnimationEnd = () => {
    if (phase === "enter") {
      setEntryAnimationCompleted(true);
      return;
    }

    if (phase === "exit") {
      setRetainedForExit(false);
    }
  };

  return { onAnimationEnd, phase, shouldRender };
};
