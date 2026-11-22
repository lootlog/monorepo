const THEME_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const GOLDEN_ANGLE = 137.508;

export const lootDrawSegmentColor = (index: number) =>
  THEME_COLORS[index] ??
  `oklch(0.7 0.15 ${((index - THEME_COLORS.length) * GOLDEN_ANGLE + 20) % 360})`;
