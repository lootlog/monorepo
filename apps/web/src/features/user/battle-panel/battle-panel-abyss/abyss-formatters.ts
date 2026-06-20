import type { AbyssSeason } from "@/lib/api/battlelog-types";

const numberFormatter = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 1,
});

export const formatAbyssDate = (date: string) =>
  new Date(date).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const formatAbyssNumber = (value: number) =>
  numberFormatter.format(value);

export const formatAbyssSignedNumber = (value: number) => {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatAbyssNumber(value)}`;
};

export const getAbyssSeasonRangeLabel = (season: AbyssSeason) =>
  `${formatAbyssDate(season.startedAt)} - ${formatAbyssDate(season.endedAt)}`;
