export const EASE_EMPHASIZED = [0.2, 0, 0, 1] as const;

export const EASE_EMPHASIZED_CSS = `cubic-bezier(${EASE_EMPHASIZED.join(", ")})`;

export const MOTION_DURATION = {
  short: 0.15,
  medium: 0.2,
  long: 0.25,
} as const;

export const CHART_SERIES_ANIMATION = {
  animationDuration: 600,
  animationEasing: "ease-out",
} as const;
