import { useEffect } from "react";

const VARIABLE = "--visual-viewport-height";

export const useVisualViewportHeight = (enabled: boolean) => {
  useEffect(() => {
    const viewport = window.visualViewport;

    if (!enabled || !viewport) return;

    const { style } = document.documentElement;

    const update = () => style.setProperty(VARIABLE, `${viewport.height}px`);

    update();
    viewport.addEventListener("resize", update);

    return () => {
      viewport.removeEventListener("resize", update);
      style.removeProperty(VARIABLE);
    };
  }, [enabled]);
};
