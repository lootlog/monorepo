/** Restricts `value` to the inclusive `[min, max]` range. */
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
