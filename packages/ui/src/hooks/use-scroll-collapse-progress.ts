import {
  animate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  type AnimationPlaybackControls,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "./use-mobile.js";

const COLLAPSE_DISTANCE = 56;

const TOP_ZONE = 64;

const SETTLE_DELAY_MS = 120;

const SETTLE_SPRING = { type: "spring", stiffness: 520, damping: 40 } as const;

type Settling = { current: AnimationPlaybackControls | null };

const settleTo = (
  progress: MotionValue<number>,
  settling: Settling,
  target: 0 | 1,
  reduceMotion: boolean | null,
) => {
  settling.current?.stop();
  settling.current = animate(
    progress,
    target,
    reduceMotion ? { duration: 0 } : SETTLE_SPRING,
  );
};

export const useScrollCollapseProgress = () => {
  const scrollsDocument = useIsMobile();
  const reduceMotion = useReducedMotion();
  const progress = useMotionValue(0);
  const [collapsed, setCollapsed] = useState(false);
  const settling = useRef<AnimationPlaybackControls | null>(null);

  useMotionValueEvent(progress, "change", (value) => {
    setCollapsed(value > 0.5);
  });

  useEffect(() => {
    if (!scrollsDocument) {
      settling.current?.stop();
      progress.set(0);

      return;
    }

    let lastScrollY = window.scrollY;
    let isTouching = false;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const settle = () => {
      if (isTouching) return;

      const value = progress.get();

      if (value > 0 && value < 1)
        settleTo(progress, settling, value > 0.5 ? 1 : 0, reduceMotion);
    };

    const scheduleSettle = () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, SETTLE_DELAY_MS);
    };

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const delta = scrollY - lastScrollY;

      lastScrollY = scrollY;
      settling.current?.stop();

      const followed = progress.get() + delta / COLLAPSE_DISTANCE;
      const topLimit = Math.max(scrollY, 0) / TOP_ZONE;

      progress.set(Math.min(Math.max(followed, 0), 1, topLimit));
      scheduleSettle();
    };

    const handleTouchStart = () => {
      isTouching = true;
    };

    const handleTouchEnd = () => {
      isTouching = false;
      scheduleSettle();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      clearTimeout(settleTimer);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [scrollsDocument, progress, reduceMotion]);

  return {
    progress,
    collapsed,
    expand: () => settleTo(progress, settling, 0, reduceMotion),
  };
};
