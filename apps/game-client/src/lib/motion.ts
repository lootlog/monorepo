/**
 * Motion tokens for Web Animations, which cannot read CSS variables. They
 * mirror the `@theme` motion tokens in index.css; change both together.
 */
export const MOTION_DURATION_MS = {
  short: 130,
  medium: 190,
  long: 260,
} as const;

export const MOTION_EASING = {
  enter: "cubic-bezier(0.16, 1, 0.3, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
} as const;
