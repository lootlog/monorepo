export const formatPoints = (points: number): string => {
  return Number.isInteger(points) ? String(points) : points.toFixed(2);
};

export const formatSignedPoints = (points: number): string => {
  if (points > 0) {
    return `+${formatPoints(points)}`;
  }

  return formatPoints(points);
};
