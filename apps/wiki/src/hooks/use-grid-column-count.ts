import { useState } from "react";

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
