import type { WrappedFactSlide } from "./build-wrapped-slides";
import { formatDuration } from "@/utils/date/format-duration";
import { PRODUCT_LOCALE } from "@lootlog/domain/locale";

const formatMetric = (value: number): string => {
  return new Intl.NumberFormat(PRODUCT_LOCALE, {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
};

const formatHourLabel = (hour: number | null): string => {
  if (hour === null) {
    return "";
  }

  return `${hour.toString().padStart(2, "0")}:00`;
};

export const getFactValue = (fact: WrappedFactSlide): string => {
  if (fact.id === "tracked-time" || fact.id === "longest-duty") {
    return formatDuration(fact.value, "human");
  }

  if (fact.id === "busiest-hour") {
    return formatHourLabel(fact.value);
  }

  if (fact.id === "coverage") {
    return `${formatMetric(fact.value)}%`;
  }

  return formatMetric(fact.value);
};
