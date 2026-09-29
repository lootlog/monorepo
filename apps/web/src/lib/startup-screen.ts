import type { AnyRouter } from "@tanstack/react-router";
import { getPrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const STARTUP_SCREEN_ID = "startup-screen";

const EXIT_DURATION_MS = 200;

/**
 * index.html shows the startup screen from the first byte, before any script
 * runs. It fades away over whatever the app rendered first, while the slot
 * lifts as if its loot was picked up.
 */
export const releaseStartupScreen = () => {
  const screen = document.getElementById(STARTUP_SCREEN_ID);

  if (!screen) return;

  screen.removeAttribute("id");
  screen.style.pointerEvents = "none";

  const timing: KeyframeAnimationOptions = {
    duration: getPrefersReducedMotion() ? 0 : EXIT_DURATION_MS,
    easing: "ease-out",
    fill: "forwards",
  };

  screen.firstElementChild?.animate([{ transform: "scale(1.08)" }], timing);
  screen.animate([{ opacity: 0 }], timing).onfinish = () => screen.remove();
};

/** The first resolved navigation has rendered a page, its skeleton or its error. */
export const releaseStartupScreenOnFirstResolve = (
  router: Pick<AnyRouter, "subscribe">,
) => {
  const unsubscribe = router.subscribe("onResolved", () => {
    unsubscribe();
    releaseStartupScreen();
  });
};
