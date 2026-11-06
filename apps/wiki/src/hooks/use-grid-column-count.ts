import { useState } from "react";

/**
 * How many columns a CSS grid lays out now, as its own template resolves
 * them, so a list can fill whole rows. It is `null` until the grid is
 * measured in the browser.
 */
export const useGridColumnCount = () => {
  const [columnCount, setColumnCount] = useState<number | null>(null);

  const ref = (element: HTMLElement | null) => {
    if (!element) return;

    const observer = new ResizeObserver(() =>
      setColumnCount(
        getComputedStyle(element).gridTemplateColumns.split(" ").length,
      ),
    );

    observer.observe(element);

    return () => observer.disconnect();
  };

  return { ref, columnCount };
};
