/**
 * Framer Motion counterparts of the CSS motion tokens in `@lootlog/ui`
 * globals.css, so script-driven animations move like the CSS ones.
 */

/** `--ease-emphasized`: the curve for every state change. */
export const EASE_EMPHASIZED = [0.2, 0, 0, 1] as const;

/** Durations in seconds, matching Tailwind's `duration-150/200/250`. */
export const MOTION_DURATION = {
  short: 0.15,
  medium: 0.2,
  long: 0.25,
} as const;

/**
 * One entrance for every chart series. Recharts' default `isAnimationActive`
 * ("auto") already skips it when the player prefers reduced motion.
 */
export const CHART_SERIES_ANIMATION = {
  animationDuration: 600,
  animationEasing: "ease-out",
} as const;
