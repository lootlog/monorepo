import { useEffect } from "react";

const VARIABLE = "--visual-viewport-height";

/**
 * Publishes the visual viewport height as `--visual-viewport-height` on the
 * root while `enabled`. An on-screen keyboard shrinks only the visual
 * viewport, so `dvh` still reaches under it on iOS and Android.
 */
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
