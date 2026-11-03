import type { HeroSighting } from "@/api/hero-sightings.api";
import { groupByToMap } from "@/lib/group-by-to-map";

type HeroSightingClaim = HeroSighting["claims"][number];

/**
 * One hero in the list. With timer grouping on, the same hero detected on the
 * same map by several Organizations is one row, like a grouped timer; each
 * Organization's sighting keeps its own claims.
 */
export type HeroSightingRow = {
  readonly key: string;
  readonly hero: HeroSighting["hero"];
  readonly state: HeroSighting["state"];
  readonly mapName: string;
  readonly lastSeenAt: string;
  readonly closeReason: HeroSighting["closeReason"];
  readonly isCurrent: boolean;
  /** Who detected the hero first among the merged sightings. */
  readonly detectedBy: HeroSighting["detectedBy"];
  /** Each claimer once, even when they claimed in several Organizations. */
  readonly claims: readonly HeroSightingClaim[];
  readonly sightings: readonly HeroSighting[];
};

type HeroSightingRowContext = {
  /** The selected Lootlog, the only one shown while grouping is off. */
  readonly guildId: string | undefined;
  readonly isGrouping: boolean;
};

const getRowKey = (sighting: HeroSighting, isGrouping: boolean) =>
  JSON.stringify([
    isGrouping ? null : sighting.guildId,
    sighting.hero.key,
    sighting.state,
    sighting.mapName,
    sighting.closedAt === null,
  ]);

/** The same person may claim through two Organizations; a User counts once. */
const getClaimerKey = (sighting: HeroSighting, claim: HeroSightingClaim) =>
  claim.member.userId ?? `${sighting.guildId}:${claim.member.memberId}`;

/** API timestamps may differ in precision, so they are compared as instants. */
const compareInstants = (a: string, b: string) => Date.parse(a) - Date.parse(b);

const toRow = (key: string, sightings: HeroSighting[]): HeroSightingRow => {
  const [first] = sightings.toSorted((a, b) =>
    compareInstants(a.firstSeenAt, b.firstSeenAt),
  );

  if (!first) throw new Error("A hero sighting row needs a sighting");

  const lastSeenAt = sightings.reduce(
    (latest, sighting) =>
      compareInstants(sighting.lastSeenAt, latest) > 0
        ? sighting.lastSeenAt
        : latest,
    first.lastSeenAt,
  );

  const claims = new Map<string, HeroSightingClaim>();

  for (const sighting of sightings)
    for (const claim of sighting.claims) {
      const claimerKey = getClaimerKey(sighting, claim);

      if (!claims.has(claimerKey)) claims.set(claimerKey, claim);
    }

  return {
    key,
    hero: first.hero,
    state: first.state,
    mapName: first.mapName,
    lastSeenAt,
    closeReason: first.closeReason,
    isCurrent: first.closedAt === null,
    detectedBy: first.detectedBy,
    claims: [...claims.values()].toSorted((a, b) =>
      compareInstants(a.createdAt, b.createdAt),
    ),
    sightings,
  };
};

/** Current heroes first, the latest confirmed on top; ended sightings last. */
export const projectHeroSightingRows = (
  sightings: readonly HeroSighting[],
  { guildId, isGrouping }: HeroSightingRowContext,
): HeroSightingRow[] => {
  const visible = isGrouping
    ? sightings
    : sightings.filter((sighting) => sighting.guildId === guildId);

  const groups = groupByToMap(visible, (sighting) =>
    getRowKey(sighting, isGrouping),
  );

  return [...groups]
    .map(([key, group]) => toRow(key, group))
    .toSorted(
      (a, b) =>
        Number(b.isCurrent) - Number(a.isCurrent) ||
        compareInstants(b.lastSeenAt, a.lastSeenAt),
    );
};

export const isClaimedBy = (
  sighting: HeroSighting,
  userId: string | undefined,
): boolean =>
  userId !== undefined &&
  sighting.claims.some((claim) => claim.member.userId === userId);
