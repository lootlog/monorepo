import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store/settings.store";

const WINDOW_EXIT_RETENTION_MS = 180;
const WINDOW_ENTRY_RETENTION_MS = 240;

export type WindowAnimationPhase = "enter" | "exit" | "open" | "preparing";

type WindowPresenceState = {
  animationEffectsEnabled: boolean;
  entryAnimationCompleted: boolean;
  entryAnimationStarted: boolean;
  isOpen: boolean;
  retainedForExit: boolean;
};

const resolveWindowPresenceInput = (
  current: WindowPresenceState,
  isOpen: boolean,
  animationEffectsEnabled: boolean,
): WindowPresenceState => {
  const nextState = {
    ...current,
    animationEffectsEnabled,
    isOpen,
  };

  if (isOpen) {
    nextState.retainedForExit = true;
  } else if (!animationEffectsEnabled) {
    nextState.retainedForExit = false;
  }

  if (!animationEffectsEnabled && isOpen) {
    nextState.entryAnimationStarted = true;
    nextState.entryAnimationCompleted = true;
  } else if (animationEffectsEnabled && !isOpen) {
    nextState.entryAnimationStarted = false;
    nextState.entryAnimationCompleted = false;
  }

  return nextState;
};

export const useWindowPresence = (isOpen: boolean) => {
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );
  const [presenceState, setPresenceState] = useState<WindowPresenceState>({
    animationEffectsEnabled,
    entryAnimationCompleted: !animationEffectsEnabled,
    entryAnimationStarted: !animationEffectsEnabled,
    isOpen,
    retainedForExit: isOpen,
  });
  let currentPresenceState = presenceState;
  if (
    presenceState.animationEffectsEnabled !== animationEffectsEnabled ||
    presenceState.isOpen !== isOpen
  ) {
    currentPresenceState = resolveWindowPresenceInput(
      presenceState,
      isOpen,
      animationEffectsEnabled,
    );
    setPresenceState(currentPresenceState);
  }
  const { entryAnimationCompleted, entryAnimationStarted, retainedForExit } =
    currentPresenceState;

  useEffect(() => {
    if (isOpen || !animationEffectsEnabled || !retainedForExit) return;

    const timeoutId = window.setTimeout(() => {
      setPresenceState((current) =>
        current.isOpen ? current : { ...current, retainedForExit: false },
      );
    }, WINDOW_EXIT_RETENTION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [animationEffectsEnabled, isOpen, retainedForExit]);

  useEffect(() => {
    if (
      !isOpen ||
      !animationEffectsEnabled ||
      entryAnimationStarted ||
      entryAnimationCompleted
    ) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      setPresenceState((current) =>
        current.isOpen && current.animationEffectsEnabled
          ? { ...current, entryAnimationStarted: true }
          : current,
      );
    });

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

    const timeoutId = window.setTimeout(() => {
      setPresenceState((current) => ({
        ...current,
        entryAnimationCompleted: true,
      }));
    }, WINDOW_ENTRY_RETENTION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  const onAnimationEnd = () => {
    if (phase === "enter") {
      setPresenceState((current) => ({
        ...current,
        entryAnimationCompleted: true,
      }));
      return;
    }

    if (phase === "exit") {
      setPresenceState((current) => ({
        ...current,
        retainedForExit: false,
      }));
    }
  };

  return { onAnimationEnd, phase, shouldRender };
};
