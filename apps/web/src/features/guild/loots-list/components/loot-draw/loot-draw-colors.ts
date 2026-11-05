const SEGMENT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** The colour of an entrant's slice, matched by the legend swatch. */
export const lootDrawSegmentColor = (index: number) =>
  SEGMENT_COLORS[index % SEGMENT_COLORS.length] ?? SEGMENT_COLORS[0];
