import { useState } from "react";

const TOP_GAP = 80;

const BOTTOM_GAP = 80;

export const useStickyTop = () => {
  const [top, setTop] = useState(TOP_GAP);

  const ref = (element: HTMLElement | null) => {
    if (!element) return;

    const update = () =>
      setTop(
        Math.min(
          TOP_GAP,
          window.innerHeight - element.offsetHeight - BOTTOM_GAP,
        ),
      );

    const observer = new ResizeObserver(update);

    observer.observe(element);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  };

  return { ref, style: { top } };
};
