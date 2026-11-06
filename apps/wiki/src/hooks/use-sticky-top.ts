import { useState } from "react";

// Below the site bar, and above the set docked at the bottom of the screen.
const TOP_GAP = 80;

const BOTTOM_GAP = 80;

/**
 * The `top` of a side panel that sticks under the site bar. A panel taller
 * than the screen first scrolls with the page and sticks once its bottom is
 * in view, so none of it stays out of reach until the page ends.
 */
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
