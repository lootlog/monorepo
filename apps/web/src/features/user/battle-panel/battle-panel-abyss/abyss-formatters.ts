import type { AbyssSeason } from "@/lib/api/battlelog-types";
import {
  DATE_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";

const formatAbyssDate = (date: string) => timestampToDate(date, DATE_FORMAT);

export const getAbyssSeasonRangeLabel = (season: AbyssSeason) =>
  `${formatAbyssDate(season.startedAt)} – ${formatAbyssDate(season.endedAt)}`;

// A season's id is `abyss-<first battle>-<last battle>`.
const getAbyssSeasonStart = (seasonId: string) => seasonId.split("-")[1];

/**
 * The season a link names. The id ends with the season's last battle, which
 * moves while the season lasts, so a link made earlier still finds the
 * season by its start.
 */
export const findAbyssSeason = (seasons: AbyssSeason[], seasonId: string) =>
  seasons.find((season) => season.id === seasonId) ??
  seasons.find(
    (season) =>
      getAbyssSeasonStart(season.id) === getAbyssSeasonStart(seasonId),
  );
