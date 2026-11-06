import {
  animate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  type AnimationPlaybackControls,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePageScrollsDocument } from "@/hooks/utils/use-page-scroll";

/** How far the reader scrolls to take the chrome all the way in or out. */
const COLLAPSE_DISTANCE = 56;

/** Near the top the chrome opens with the distance left to the top. */
const TOP_ZONE = 64;

/** How long the page rests before a half-way chrome settles. */
const SETTLE_DELAY_MS = 120;

/** The sidebar's spring, so the chrome settles like the navigation does. */
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

/**
 * How collapsed scroll-away chrome is, from 0 (open) to 1 (collapsed). It
 * follows the scroll as it happens, as iOS toolbars do: scrolling down takes
 * it in, scrolling up brings it back, and it may rest half-way while a finger
 * holds the page. Once the page rests it settles to the nearer end. Only
 * phones scroll the document, so wider layouts stay open.
 */
export const useScrollCollapseProgress = () => {
  const scrollsDocument = usePageScrollsDocument();
  const reduceMotion = useReducedMotion();
  const progress = useMotionValue(0);
  const [collapsed, setCollapsed] = useState(false);
  const settling = useRef<AnimationPlaybackControls | null>(null);

  // Renders only when the chrome crosses half-way, which is when its
  // controls swap.
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
