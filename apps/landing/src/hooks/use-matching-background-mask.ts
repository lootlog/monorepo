import { useEffect, useRef } from "react";

// Only solid lime surfaces participate; other colors never alter the button.
export function useMatchingBackgroundMask() {
  const overlayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const container = overlay?.parentElement;
    if (!overlay || !container) return;

    const surfaces = Array.from(
      document.querySelectorAll<HTMLElement>("main *"),
    ).filter(
      (element) =>
        getComputedStyle(element).backgroundColor === "rgb(200, 241, 53)",
    );
    let frame = 0;
    let previousPath = "";

    const update = () => {
      const button = container.getBoundingClientRect();
      const paths: string[] = [];
      for (const surface of surfaces) {
        const rect = surface.getBoundingClientRect();
        if (
          rect.right <= button.left ||
          rect.left >= button.right ||
          rect.bottom <= button.top ||
          rect.top >= button.bottom
        )
          continue;
        const style = getComputedStyle(surface);
        if (style.backgroundColor !== "rgb(200, 241, 53)") continue;
        const border = Number.parseFloat(style.borderTopWidth) || 0;
        const x = rect.left - button.left + border;
        const y = rect.top - button.top + border;
        const width = rect.width - border * 2;
        const height = rect.height - border * 2;
        const radius = Math.max(
          0,
          Math.min(
            Number.parseFloat(style.borderTopLeftRadius) || 0,
            rect.width / 2,
            rect.height / 2,
          ) - border,
        );
        paths.push(
          `M${x + radius} ${y}h${width - 2 * radius}a${radius} ${radius} 0 0 1 ${radius} ${radius}v${height - 2 * radius}a${radius} ${radius} 0 0 1 ${-radius} ${radius}h${2 * radius - width}a${radius} ${radius} 0 0 1 ${-radius} ${-radius}v${2 * radius - height}a${radius} ${radius} 0 0 1 ${radius} ${-radius}Z`,
        );
      }
      const path = paths.join(" ") || "M0 0";
      if (path !== previousPath) {
        overlay.style.clipPath = `path('${path}')`;
        previousPath = path;
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

  return overlayRef;
}
