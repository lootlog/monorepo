export const BINGO_POINT_FIELDS = [
  "pointsPerTile",
  "pointsPerLine",
  "firstCompleterBonus",
  "blackoutBonus",
] as const;

export type BingoPoints = Record<(typeof BINGO_POINT_FIELDS)[number], number>;
