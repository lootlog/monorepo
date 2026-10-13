import { formatBattleMetric } from "@/components/battle/utils/value-utils";
import type { AbyssSeason } from "@/lib/api/battlelog-types";
import {
  DATE_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";

const formatAbyssDate = (date: string) => timestampToDate(date, DATE_FORMAT);

export const formatAbyssSignedNumber = (value: number) => {
  const sign = value >= 0 ? "+" : "";

  return `${sign}${formatBattleMetric(value)}`;
};

export const getAbyssSeasonRangeLabel = (season: AbyssSeason) =>
  `${formatAbyssDate(season.startedAt)} – ${formatAbyssDate(season.endedAt)}`;
