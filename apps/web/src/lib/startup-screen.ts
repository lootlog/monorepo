import type { AnyRouter } from "@tanstack/react-router";
import { getPrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";

const STARTUP_SCREEN_ID = "startup-screen";

const EXIT_DURATION_MS = 200;

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

  const slot = screen.firstElementChild;

  if (slot && isStillHidden(slot)) {
    slot.remove();
  } else {
    slot?.animate([{ transform: "scale(1.08)" }], timing);
  }

  screen.animate([{ opacity: 0 }], timing).onfinish = () => screen.remove();
};

const isStillHidden = (slot: Element) =>
  slot.getAnimations().some((animation) => {
    const { delay = 0, localTime = null } =
      animation.effect?.getComputedTiming() ?? {};

    return Number(localTime ?? Number.POSITIVE_INFINITY) < delay;
  });

export const releaseStartupScreenOnFirstResolve = (
  router: Pick<AnyRouter, "subscribe">,
) => {
  const unsubscribe = router.subscribe("onResolved", () => {
    unsubscribe();
    releaseStartupScreen();
  });
};
