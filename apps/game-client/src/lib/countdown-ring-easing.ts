import { getPrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";

/**
 * Easing for a countdown ring or bar drained by a single Web Animation. A
 * ring's dash offset cannot run on the compositor, so the ring is repainted
 * while it moves; with the OS reduced-motion preference a countdown advances
 * in whole seconds instead, which is not continuous motion and changes it once
 * per second.
 */
export const getCountdownRingEasing = (remainingMs: number) =>
  getPrefersReducedMotion()
    ? `steps(${Math.max(1, Math.ceil(remainingMs / 1000))}, end)`
    : "linear";
