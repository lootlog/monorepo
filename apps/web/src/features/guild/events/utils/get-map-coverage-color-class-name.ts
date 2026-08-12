export const getMapCoverageColorClassName = (coveragePercent: number) => {
  if (coveragePercent < 50) {
    return "text-destructive";
  }

  if (coveragePercent < 90) {
    return "text-amber-500";
  }

  return "text-green-500";
};
