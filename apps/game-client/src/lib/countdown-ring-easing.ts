/**
 * Easing for a countdown ring drained by a single Web Animation of its stroke
 * dash offset. A dash offset cannot run on the compositor, so the ring is
 * repainted while it moves; with the OS reduced-motion preference it advances
 * in whole seconds instead, which is not continuous motion and changes the
 * stroke once per second.
 */
export const getCountdownRingEasing = (remainingMs: number) =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? `steps(${Math.max(1, Math.ceil(remainingMs / 1000))}, end)`
    : "linear";
