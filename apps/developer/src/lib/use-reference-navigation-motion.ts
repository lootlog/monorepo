import { useEffect, type RefObject } from "react";
import { getPrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";

/** A jump at least this far is a navigation, not the reader scrolling. */
const JUMP_DISTANCE = 240;

/** How long after a navigation click a jump still belongs to it. */
const ARMED_MS = 1500;

/**
 * Scalar jumps to a sidebar entry with `behavior: "instant"` and keeps
 * correcting the position while it lazily renders the target, so a native
 * smooth scroll would fight it. Instead, the content glides in from the
 * direction of the jump once Scalar has placed it.
 */
export function useReferenceNavigationMotion(
  rootRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    let armedUntil = 0;
    let lastY = window.scrollY;
    let animation: Animation | undefined;

    const arm = (event: Event) => {
      if (!(event.target instanceof Element)) return;

      if (event.target.closest('a[href^="#"]'))
        armedUntil = performance.now() + ARMED_MS;
    };

    const onScroll = () => {
      const y = window.scrollY;
      const distance = y - lastY;
      lastY = y;

      if (performance.now() > armedUntil) return;

      if (Math.abs(distance) < JUMP_DISTANCE) return;
      armedUntil = 0;

      if (getPrefersReducedMotion()) return;
      const content = root.querySelector<HTMLElement>(".references-rendered");

      if (!content) return;
      const offset = Math.sign(distance) * 28;
      animation?.cancel();
      animation = content.animate(
        [
          { opacity: 0.35, transform: `translateY(${offset}px)` },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 320, easing: "cubic-bezier(0.2, 0.9, 0.25, 1)" },
      );
    };

    root.addEventListener("click", arm, { capture: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      root.removeEventListener("click", arm, { capture: true });
      window.removeEventListener("scroll", onScroll);
      animation?.cancel();
    };
  }, [rootRef]);
}
