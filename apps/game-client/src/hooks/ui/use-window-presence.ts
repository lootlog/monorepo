import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store/settings.store";

const WINDOW_EXIT_RETENTION_MS = 180;
const WINDOW_ENTRY_RETENTION_MS = 240;

export type WindowAnimationPhase = "enter" | "exit" | "open";

export const useWindowPresence = (isOpen: boolean) => {
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );
  const [retainedForExit, setRetainedForExit] = useState(isOpen);
  const [entryAnimationCompleted, setEntryAnimationCompleted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRetainedForExit(true);
      return;
    }

    if (!animationEffectsEnabled) {
      setRetainedForExit(false);
    }
  }, [animationEffectsEnabled, isOpen]);

  useEffect(() => {
    if (isOpen || !animationEffectsEnabled || !retainedForExit) return;

    const timeoutId = window.setTimeout(() => {
      setRetainedForExit(false);
    }, WINDOW_EXIT_RETENTION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [animationEffectsEnabled, isOpen, retainedForExit]);

  useEffect(() => {
    if (!isOpen) {
      setEntryAnimationCompleted(false);
      return;
    }

    if (!animationEffectsEnabled) {
      setEntryAnimationCompleted(true);
    }
  }, [animationEffectsEnabled, isOpen]);

  const shouldRender = isOpen || (animationEffectsEnabled && retainedForExit);
  let phase: WindowAnimationPhase = "open";
  if (animationEffectsEnabled && !isOpen) {
    phase = "exit";
  } else if (animationEffectsEnabled && !entryAnimationCompleted) {
    phase = "enter";
  }

  useEffect(() => {
    if (phase !== "enter") return;

    const timeoutId = window.setTimeout(() => {
      setEntryAnimationCompleted(true);
    }, WINDOW_ENTRY_RETENTION_MS);

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
