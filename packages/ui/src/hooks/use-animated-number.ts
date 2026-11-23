import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";

const DURATION_MS = 240;

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3;

export function useAnimatedNumber(target: number) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const shown = useRef(target);

  useEffect(() => {
    const from = shown.current;

    if (prefersReducedMotion) {
      shown.current = target;

      return;
    }

    if (from === target) return;

    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - start) / DURATION_MS, 1);

      shown.current = from + (target - from) * easeOutCubic(progress);
      setValue(shown.current);

      if (progress < 1) frame = requestAnimationFrame(step);
    };

    let frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [prefersReducedMotion, target]);

  return prefersReducedMotion ? target : value;
}
