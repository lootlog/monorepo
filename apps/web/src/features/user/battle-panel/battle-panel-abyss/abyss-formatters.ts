import type { AbyssSeason } from "@/lib/api/battlelog-types";
import {
  DATE_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";

const numberFormatter = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 1,
});

const formatAbyssDate = (date: string) => timestampToDate(date, DATE_FORMAT);

export const formatAbyssNumber = (value: number) =>
  numberFormatter.format(value);

export const formatAbyssSignedNumber = (value: number) => {
  const sign = value >= 0 ? "+" : "";

  return `${sign}${formatAbyssNumber(value)}`;
};

export const getAbyssSeasonRangeLabel = (season: AbyssSeason) =>
  `${formatAbyssDate(season.startedAt)} – ${formatAbyssDate(season.endedAt)}`;
