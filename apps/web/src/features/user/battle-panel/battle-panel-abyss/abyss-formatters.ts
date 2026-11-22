import type { AbyssSeason } from "@/lib/api/battlelog-types";
import {
  DATE_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";

const formatAbyssDate = (date: string) => timestampToDate(date, DATE_FORMAT);

export const getAbyssSeasonRangeLabel = (season: AbyssSeason) =>
  `${formatAbyssDate(season.startedAt)} – ${formatAbyssDate(season.endedAt)}`;

const getAbyssSeasonStart = (seasonId: string) => seasonId.split("-")[1];

export const findAbyssSeason = (seasons: AbyssSeason[], seasonId: string) =>
  seasons.find((season) => season.id === seasonId) ??
  seasons.find(
    (season) =>
      getAbyssSeasonStart(season.id) === getAbyssSeasonStart(seasonId),
  );
