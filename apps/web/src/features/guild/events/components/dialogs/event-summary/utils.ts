import type { WrappedFactSlide } from "./build-wrapped-slides";
import { formatDurationHuman } from "../../../utils/format-duration";

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

export const getFactValue = (fact: WrappedFactSlide): string => {
  if (fact.id === "tracked-time" || fact.id === "longest-duty") {
    return formatDurationHuman(fact.value);
  }

  if (fact.id === "busiest-hour") {
    return formatHourLabel(fact.value);
  }

  if (fact.id === "coverage") {
    return `${formatMetric(fact.value)}%`;
  }

  return formatMetric(fact.value);
};
