import { useLayoutEffect, useRef, useState } from "react";

export const COMPACT_SCHEDULE_MAX_WIDTH = 840;

export function shouldUseCompactSchedule(width: number): boolean {
  return width < COMPACT_SCHEDULE_MAX_WIDTH;
}

export function useCompactScheduleLayout() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(true);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      setIsCompact(
        shouldUseCompactSchedule(container.getBoundingClientRect().width),
      );
    };

    updateLayout();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateLayout);
      return () => window.removeEventListener("resize", updateLayout);
    }

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  return { containerRef, isCompact };
}
