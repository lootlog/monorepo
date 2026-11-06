import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  heroSightingClaimTable,
  heroSightingTable,
} from "#src/database/drizzle/hero-sighting.schema";
import { memberTable } from "#src/database/drizzle/organization.schema";
import { playerSnapshotTable } from "#src/database/drizzle/loot.schema";
import { getDiscordAvatarUrl } from "#src/reservations/reservation-presentation";
import type { HeroSightingResponse } from "#src/contracts/hero-sightings/schemas";

type QueryDatabase = Pick<typeof ApiDatabase.Service, "select">;

type Member = typeof memberTable.$inferSelect;

type PlayerSnapshot = typeof playerSnapshotTable.$inferSelect;

const detector = alias(memberTable, "detector");

const lastSeenBy = alias(memberTable, "lastSeenBy");

const presentMember = (member: Member) => ({
  memberId: member.id,
  userId: member.globalUserId,
  displayName: member.name,
  avatarUrl: getDiscordAvatarUrl(member.userId, member.avatar),
});

const presentCharacter = (
  snapshot: PlayerSnapshot | null,
  lvl: number | null,
) =>
  snapshot
    ? {
        name: snapshot.name,
        lvl,
        prof: snapshot.prof,
        icon: snapshot.icon,
      }
    : null;

/** Sightings with their Members, detector character and claims, by id. */
export const loadHeroSightings = Effect.fnUntraced(function* (
  database: QueryDatabase,
  ids: ReadonlyArray<number>,
) {
  if (ids.length === 0) return [];

  const [rows, claimRows] = yield* Effect.all(
    [
      database
        .select({
          sighting: heroSightingTable,
          detector,
          lastSeenBy,
          detectorCharacter: playerSnapshotTable,
        })
        .from(heroSightingTable)
        .innerJoin(detector, eq(detector.id, heroSightingTable.detectedById))
        .innerJoin(
          lastSeenBy,
          eq(lastSeenBy.id, heroSightingTable.lastSeenById),
        )
        .leftJoin(
          playerSnapshotTable,
          eq(
            playerSnapshotTable.id,
            heroSightingTable.detectorCharacterSnapshotId,
          ),
        )
        .where(inArray(heroSightingTable.id, [...ids])),
      database
        .select({
          claim: heroSightingClaimTable,
          member: memberTable,
          character: playerSnapshotTable,
        })
        .from(heroSightingClaimTable)
        .innerJoin(
          memberTable,
          eq(memberTable.id, heroSightingClaimTable.memberId),
        )
        .leftJoin(
          playerSnapshotTable,
          eq(
            playerSnapshotTable.id,
            heroSightingClaimTable.characterSnapshotId,
          ),
        )
        .where(inArray(heroSightingClaimTable.sightingId, [...ids]))
        .orderBy(asc(heroSightingClaimTable.createdAt)),
    ],
    { concurrency: "unbounded" },
  );

  const claimsBySighting = Map.groupBy(
    claimRows,
    ({ claim }) => claim.sightingId,
  );

  const byId = new Map(
    rows.map(({ sighting, detector, lastSeenBy, detectorCharacter }) => [
      sighting.id,
      {
        id: sighting.id,
        guildId: sighting.guildId,
        world: sighting.world,
        hero: {
          key: sighting.heroKey,
          name: sighting.heroName,
          lvl: sighting.heroLvl,
          prof: sighting.heroProf,
        },
        state: sighting.state,
        mapName: sighting.mapName,
        firstSeenAt: sighting.firstSeenAt.toISOString(),
        lastSeenAt: sighting.lastSeenAt.toISOString(),
        spawnedAt: sighting.spawnedAt?.toISOString() ?? null,
        closedAt: sighting.closedAt?.toISOString() ?? null,
        closeReason: sighting.closeReason,
        detectedBy: presentMember(detector),
        detectorCharacter: presentCharacter(
          detectorCharacter,
          sighting.detectorCharacterLvl,
        ),
        lastSeenBy: presentMember(lastSeenBy),
        claims: (claimsBySighting.get(sighting.id) ?? []).map(
          ({ claim, member, character }) => ({
            member: presentMember(member),
            character: presentCharacter(character, claim.characterLvl),
            createdAt: claim.createdAt.toISOString(),
          }),
        ),
      } satisfies HeroSightingResponse,
    ]),
  );

  // Keep the caller's order.
  return ids.flatMap((id) => {
    const sighting = byId.get(id);

    return sighting ? [sighting] : [];
  });
});

/** One hero in one Organization world: the unit sightings are kept per. */
export type HeroSightingScope = {
  readonly guildId: string;
  readonly world: string;
  readonly heroKey: string;
};

/** Every sighting, current or past, of the scope's hero. */
export const heroSightingScopeCondition = (scope: HeroSightingScope) =>
  and(
    eq(heroSightingTable.guildId, scope.guildId),
    eq(heroSightingTable.world, scope.world),
    eq(heroSightingTable.heroKey, scope.heroKey),
  );

/** The current sighting of a hero in one Organization world. */
export const findOpenHeroSighting = (
  database: QueryDatabase,
  scope: HeroSightingScope,
) =>
  database
    .select()
    .from(heroSightingTable)
    .where(
      and(
        heroSightingScopeCondition(scope),
        isNull(heroSightingTable.closedAt),
      ),
    )
    .limit(1)
    .pipe(Effect.map((rows) => rows[0] ?? null));

export const buildHeroSightingLockKey = (scope: HeroSightingScope) =>
  `hero-sighting:lock:${scope.guildId}:${scope.world}:${scope.heroKey}`;
