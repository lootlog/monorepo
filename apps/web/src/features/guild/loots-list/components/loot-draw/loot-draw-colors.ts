/** The theme's chart colours first, so a small wheel matches the app. */
const THEME_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Golden-angle steps never land two hues close together, however many there are. */
const GOLDEN_ANGLE = 137.508;

/**
 * The colour of an entrant's slice, matched by the legend swatch. Past the
 * theme's five, every entrant gets a hue of its own instead of a repeat.
 */
export const lootDrawSegmentColor = (index: number) =>
  THEME_COLORS[index] ??
  `oklch(0.7 0.15 ${((index - THEME_COLORS.length) * GOLDEN_ANGLE + 20) % 360})`;
