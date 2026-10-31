const pointsFormatter = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 0,
});

const multiplierFormatter = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 2,
});

/** Scores carry fractions once a multiplier applies; players see whole points. */
export const formatFactionWarPoints = (points: number) =>
  pointsFormatter.format(points);

/** "×1,5" */
export const formatFactionWarMultiplier = (multiplier: number) =>
  `×${multiplierFormatter.format(multiplier)}`;
