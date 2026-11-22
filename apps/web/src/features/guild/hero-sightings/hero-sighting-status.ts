import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { isCurrentHeroSighting } from "@lootlog/domain/hero-sightings";
import { sortBy } from "es-toolkit";

export type HeroSightingStatus =
  | "ROAMING"
  | "SPAWNING"
  | "STALE"
  | "PROBABLY_KILLED"
  | "KILLED"
  | "WITHDRAWN"
  | "CLOSED";

export const getHeroSightingStatus = (
  sighting: HeroSightingResponseDto,
  now: number,
): HeroSightingStatus => {
  if (sighting.closedAt !== null) return sighting.closeReason ?? "CLOSED";

  if (!isCurrentHeroSighting(sighting, now)) return "STALE";

  return sighting.state;
};

export const HERO_SIGHTING_GROUPS = [
  "SPAWNING",
  "ROAMING",
  "STALE",
  "CLOSED",
] as const;

export type HeroSightingGroup = (typeof HERO_SIGHTING_GROUPS)[number];

export const getHeroSightingGroup = (
  status: HeroSightingStatus,
): HeroSightingGroup =>
  status === "KILLED" || status === "PROBABLY_KILLED" || status === "WITHDRAWN"
    ? "CLOSED"
    : status;

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
