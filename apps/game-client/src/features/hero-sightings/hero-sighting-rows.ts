import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { groupByToMap } from "@/lib/group-by-to-map";

type HeroSightingClaim = HeroSightingResponseDto["claims"][number];

/** A claim, marked when the claimer also detected the hero. */
export type HeroSightingClaimer = HeroSightingClaim & {
  readonly isDetector: boolean;
};

/**
 * Member ids belong to one Organization, so a claimer is the detector only
 * when both are the same member of the sighting's own Organization.
 */
export const isHeroSightingDetectorClaim = (
  sighting: HeroSightingResponseDto,
  claim: HeroSightingClaim,
): boolean => claim.member.memberId === sighting.detectedBy.memberId;

/**
 * One hero in the list. With timer grouping on, the same hero detected on the
 * same map by several Organizations is one row, like a grouped timer; each
 * Organization's sighting keeps its own claims.
 */
export type HeroSightingRow = {
  readonly key: string;
  readonly world: string;
  readonly hero: HeroSightingResponseDto["hero"];
  readonly state: HeroSightingResponseDto["state"];
  readonly mapName: string;
  readonly lastSeenAt: string;
  readonly closeReason: HeroSightingResponseDto["closeReason"];
  readonly isCurrent: boolean;
  /** Who detected the hero first among the merged sightings. */
  readonly detectedBy: HeroSightingResponseDto["detectedBy"];
  /** Each claimer once, even when they claimed in several Organizations. */
  readonly claims: readonly HeroSightingClaimer[];
  readonly sightings: readonly HeroSightingResponseDto[];
};

type HeroSightingRowContext = {
  /** The selected Lootlog, the only one shown while grouping is off. */
  readonly guildId: string | undefined;
  readonly isGrouping: boolean;
};

const getRowKey = (sighting: HeroSightingResponseDto, isGrouping: boolean) =>
  JSON.stringify([
    isGrouping ? null : sighting.guildId,
    sighting.hero.key,
    sighting.state,
    sighting.mapName,
    sighting.closedAt === null,
  ]);

/** The same person may claim through two Organizations; a User counts once. */
const getClaimerKey = (
  sighting: HeroSightingResponseDto,
  claim: HeroSightingClaim,
) => claim.member.userId ?? `${sighting.guildId}:${claim.member.memberId}`;

/** API timestamps may differ in precision, so they are compared as instants. */
const compareInstants = (a: string, b: string) => Date.parse(a) - Date.parse(b);

const toRow = (
  key: string,
  sightings: HeroSightingResponseDto[],
): HeroSightingRow => {
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

  const claims = new Map<string, HeroSightingClaimer>();

  for (const sighting of sightings)
    for (const claim of sighting.claims) {
      const claimerKey = getClaimerKey(sighting, claim);
      const isDetector = isHeroSightingDetectorClaim(sighting, claim);
      const known = claims.get(claimerKey);

      if (!known) claims.set(claimerKey, { ...claim, isDetector });
      else if (isDetector && !known.isDetector)
        claims.set(claimerKey, { ...known, isDetector });
    }

  return {
    key,
    world: first.world,
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
  sightings: readonly HeroSightingResponseDto[],
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
