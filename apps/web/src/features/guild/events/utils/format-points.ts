export const formatPoints = (value: number) => {
  const rounded = Math.round(value * 100) / 100;

  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded.toFixed(2).replace(/\.?0+$/, "");
};

export const formatSignedPoints = (points: number): string => {
  if (points > 0) {
    return `+${formatPoints(points)}`;
  }

  return formatPoints(points);
};
