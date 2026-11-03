import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { isCurrentHeroSighting } from "@lootlog/domain/hero-sightings";
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

  // Open but no longer current: a roaming hero unconfirmed for too long.
  if (!isCurrentHeroSighting(sighting, now)) return "STALE";

  return sighting.state;
};

/** The board's sections, in the order to act on them; closed ones share one. */
export const HERO_SIGHTING_GROUPS = [
  "ROAMING",
  "SPAWNING",
  "STALE",
  "CLOSED",
] as const;

export type HeroSightingGroup = (typeof HERO_SIGHTING_GROUPS)[number];

export const getHeroSightingGroup = (
  status: HeroSightingStatus,
): HeroSightingGroup =>
  status === "KILLED" || status === "PROBABLY_KILLED" ? "CLOSED" : status;

/** Orders a board by status, then by the latest news within each status. */
export const sortHeroSightings = (
  sightings: readonly HeroSightingResponseDto[],
  now: number,
) =>
  sortBy(sightings, [
    (sighting) =>
      HERO_SIGHTING_GROUPS.indexOf(
        getHeroSightingGroup(getHeroSightingStatus(sighting, now)),
      ),
    (sighting) => -Date.parse(sighting.closedAt ?? sighting.lastSeenAt),
  ]);
