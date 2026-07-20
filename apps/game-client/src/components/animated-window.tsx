import { useWindowsStore, type WindowId } from "@/store/windows.store";
import { useSettingsStore } from "@/store/settings.store";
import {
  useEffect,
  useState,
  type AnimationEvent,
  type ReactNode,
} from "react";

const WINDOW_ENTRY_ANIMATION_CLASS =
  "ll:animate-in ll:fade-in-0 ll:zoom-in-95 ll:slide-in-from-bottom-2 ll:duration-150";
const WINDOW_EXIT_ANIMATION_CLASS =
  "ll:animate-out ll:fade-out-0 ll:zoom-out-95 ll:slide-out-to-bottom-1 ll:duration-100";
const WINDOW_EXIT_RETENTION_MS = 150;

interface AnimatedWindowProps {
  isOpen: boolean;
  windowKey: WindowId;
  children: ReactNode;
}

export const AnimatedWindow = ({
  isOpen,
  windowKey,
  children,
}: AnimatedWindowProps) => {
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );
  const windowFocusHistory = useWindowsStore(
    (state) => state.windowFocusHistory,
  );
  const windowZIndex = windowFocusHistory.indexOf(windowKey);
  const zIndex =
    windowZIndex === -1 ? 0 : windowFocusHistory.length - windowZIndex;
  const [retainedForExit, setRetainedForExit] = useState(isOpen);

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

  if (!isOpen && (!animationEffectsEnabled || !retainedForExit)) {
    return null;
  }

  const handleExitAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (!isOpen && event.currentTarget === event.target) {
      setRetainedForExit(false);
    }
  };
  let animationClassName: string | undefined;
  if (animationEffectsEnabled) {
    animationClassName = isOpen
      ? WINDOW_ENTRY_ANIMATION_CLASS
      : WINDOW_EXIT_ANIMATION_CLASS;
  }

  return (
    <div
      className={animationClassName}
      onAnimationEnd={handleExitAnimationEnd}
      style={{ zIndex, position: "relative" }}
    >
      {children}
    </div>
  );
};
