export const formatMetric = (value: number): string => {
  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
};

export const formatHourLabel = (hour: number | null): string => {
  if (hour === null) {
    return "";
  }

  return `${hour.toString().padStart(2, "0")}:00`;
};
