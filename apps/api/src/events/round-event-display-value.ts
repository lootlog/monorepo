export const roundEventDisplayValue = (value: number): number =>
  Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
