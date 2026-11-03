import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { isHeroSightingStale } from "@lootlog/domain/hero-sightings";
import { sortBy } from "es-toolkit";

/**
 * What a sighting tells now: where the hero roams or will spawn, that a
 * roaming hero went unconfirmed too long to be trusted, or why it closed.
 */
export type HeroSightingStatus =
  | "ROAMING"
  | "SPAWNING"
  | "STALE"
  | "PROBABLY_KILLED"
  | "KILLED"
  | "CLOSED";

export const getHeroSightingStatus = (
  sighting: HeroSightingResponseDto,
  now: number,
): HeroSightingStatus => {
  if (sighting.closedAt !== null) return sighting.closeReason ?? "CLOSED";

  if (isHeroSightingStale(sighting, now)) return "STALE";

  return sighting.state;
};

// Current sightings lead, the ones to act on first; closed ones follow.
const STATUS_ORDER: Record<HeroSightingStatus, number> = {
  ROAMING: 0,
  SPAWNING: 1,
  STALE: 2,
  PROBABLY_KILLED: 3,
  KILLED: 3,
  CLOSED: 3,
};

/** Orders a board by status, then by the latest news within each status. */
export const sortHeroSightings = (
  sightings: readonly HeroSightingResponseDto[],
  now: number,
) =>
  sortBy(sightings, [
    (sighting) => STATUS_ORDER[getHeroSightingStatus(sighting, now)],
    (sighting) => -Date.parse(sighting.closedAt ?? sighting.lastSeenAt),
  ]);
