const POINTS_PRECISION = 100;

export const roundEditablePoints = (value: number): number =>
  Math.round((value + Number.EPSILON) * POINTS_PRECISION) / POINTS_PRECISION;

export const parseEditablePoints = (value: string): number | null => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return roundEditablePoints(parsed);
};
