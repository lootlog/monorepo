import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { groupByToMap } from "@/lib/group-by-to-map";

type HeroSightingClaim = HeroSightingResponseDto["claims"][number];

type HeroSightingMember = HeroSightingResponseDto["detectedBy"];

export type HeroSightingClaimer = HeroSightingClaim & {
  readonly isDetector: boolean;
};

export const isHeroSightingDetectorClaim = (
  sighting: HeroSightingResponseDto,
  claim: HeroSightingClaim,
): boolean => claim.member.memberId === sighting.detectedBy.memberId;

export const isWithdrawableHeroSighting = (
  sighting: HeroSightingResponseDto,
  userId: string | undefined,
): boolean =>
  sighting.manual &&
  sighting.closedAt === null &&
  userId !== undefined &&
  sighting.detectedBy.userId === userId;

export type HeroSightingRow = {
  readonly key: string;
  readonly world: string;
  readonly hero: HeroSightingResponseDto["hero"];
  readonly state: HeroSightingResponseDto["state"];
  readonly mapName: string;
  readonly lastSeenAt: string;
  readonly closeReason: HeroSightingResponseDto["closeReason"];
  readonly isCurrent: boolean;
  readonly detectedBy: HeroSightingMember;
  readonly manual: boolean;
  readonly refreshedBy: HeroSightingMember | null;
  readonly claims: readonly HeroSightingClaimer[];
  readonly sightings: readonly HeroSightingResponseDto[];
};

type HeroSightingRowContext = {
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

const getMemberKey = (guildId: string, member: HeroSightingMember) =>
  member.userId ?? `${guildId}:${member.memberId}`;

export const getHeroSightingRefresher = (
  sighting: HeroSightingResponseDto,
): HeroSightingMember | null =>
  sighting.lastSeenBy.memberId === sighting.detectedBy.memberId
    ? null
    : sighting.lastSeenBy;

const compareInstants = (a: string, b: string) => Date.parse(a) - Date.parse(b);

const toRow = (
  key: string,
  sightings: HeroSightingResponseDto[],
): HeroSightingRow => {
  const [first] = sightings.toSorted((a, b) =>
    compareInstants(a.firstSeenAt, b.firstSeenAt),
  );

  if (!first) throw new Error("A hero sighting row needs a sighting");

  const latest = sightings.reduce((newest, sighting) =>
    compareInstants(sighting.lastSeenAt, newest.lastSeenAt) > 0
      ? sighting
      : newest,
  );

  const isRefreshedByDetector =
    getMemberKey(latest.guildId, latest.lastSeenBy) ===
    getMemberKey(first.guildId, first.detectedBy);

  const claims = new Map<string, HeroSightingClaimer>();

  for (const sighting of sightings)
    for (const claim of sighting.claims) {
      const claimerKey = getMemberKey(sighting.guildId, claim.member);
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
    lastSeenAt: latest.lastSeenAt,
    closeReason: first.closeReason,
    isCurrent: first.closedAt === null,
    detectedBy: first.detectedBy,
    manual: first.manual,
    refreshedBy: isRefreshedByDetector ? null : latest.lastSeenBy,
    claims: [...claims.values()].toSorted((a, b) =>
      compareInstants(a.createdAt, b.createdAt),
    ),
    sightings,
  };
};

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
        Number(b.isCurrent && b.state === "SPAWNING") -
          Number(a.isCurrent && a.state === "SPAWNING") ||
        compareInstants(b.lastSeenAt, a.lastSeenAt),
    );
};
