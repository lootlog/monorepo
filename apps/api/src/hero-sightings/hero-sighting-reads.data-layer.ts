import { and, desc, eq, inArray } from "drizzle-orm";
import { Clock, Effect } from "effect";
import {
  getHeroSightingKey,
  HERO_SIGHTING_HISTORY_LIMIT,
} from "@lootlog/domain/hero-sightings";
import { Capability } from "@lootlog/schema/permissions";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { heroSightingTable } from "#src/database/drizzle/hero-sighting.schema";
import { selectAccessibleGuildRoles } from "#src/members/member-access-query";
import {
  heroSightingScopeCondition,
  loadHeroSightings,
} from "./hero-sighting-query.js";
import { canRead, guildReader } from "./hero-sighting-reader.js";
import type {
  HeroSightingsGuildAccess,
  HeroSightingsIdentity,
} from "./hero-sightings-data.js";
import { toHeroSightingsDataFailure } from "./hero-sighting-errors.js";

const BOARD_CLOSED_RETENTION_MS = 24 * 60 * 60 * 1000;

type Database = typeof ApiDatabase.Service;

const readBoard = Effect.fnUntraced(function* (
  database: Database,
  guildIds: ReadonlyArray<string>,
  world: string,
) {
  if (guildIds.length === 0) return [];

  const latest = yield* database
    .selectDistinctOn([heroSightingTable.guildId, heroSightingTable.heroKey], {
      id: heroSightingTable.id,
      closedAt: heroSightingTable.closedAt,
    })
    .from(heroSightingTable)
    .where(
      and(
        inArray(heroSightingTable.guildId, [...guildIds]),
        eq(heroSightingTable.world, world),
      ),
    )
    .orderBy(
      heroSightingTable.guildId,
      heroSightingTable.heroKey,
      desc(heroSightingTable.id),
    );

  const now = yield* Clock.currentTimeMillis;

  const ids = latest
    .filter(
      ({ closedAt }) =>
        closedAt === null ||
        now - closedAt.getTime() <= BOARD_CLOSED_RETENTION_MS,
    )
    .map(({ id }) => id);

  const sightings = yield* loadHeroSightings(database, ids);

  return sightings.toSorted((left, right) =>
    right.lastSeenAt.localeCompare(left.lastSeenAt),
  );
});

export const makeHeroSightingReads = (database: Database) => {
  const getAll = Effect.fn("getAllHeroSightingsData")(function* (
    identity: HeroSightingsIdentity,
    world: string,
  ) {
    const guildAccess = yield* selectAccessibleGuildRoles(
      database,
      identity.discordId,
      [Capability.LOOTLOG_HERO_SIGHTINGS_READ],
    );

    const sightings = yield* readBoard(
      database,
      [...guildAccess.keys()],
      world,
    );

    return sightings.filter((sighting) => {
      const access = guildAccess.get(sighting.guildId);

      return access !== undefined && canRead(access, sighting);
    });
  });

  const getGuildSightings = Effect.fn("getGuildHeroSightingsData")(function* (
    access: HeroSightingsGuildAccess,
    world: string,
  ) {
    const sightings = yield* readBoard(database, [access.guild.id], world);
    const reader = guildReader(access);

    return sightings.filter((sighting) => canRead(reader, sighting));
  });

  const getHistory = Effect.fn("getHeroSightingHistoryData")(function* (
    access: HeroSightingsGuildAccess,
    world: string,
    hero: string,
  ) {
    const rows = yield* database
      .select({ id: heroSightingTable.id })
      .from(heroSightingTable)
      .where(
        heroSightingScopeCondition({
          guildId: access.guild.id,
          world,
          heroKey: getHeroSightingKey(hero),
        }),
      )
      .orderBy(desc(heroSightingTable.id))
      .limit(HERO_SIGHTING_HISTORY_LIMIT);

    const sightings = yield* loadHeroSightings(
      database,
      rows.map(({ id }) => id),
    );

    const reader = guildReader(access);

    return sightings.filter((sighting) => canRead(reader, sighting));
  });

  return {
    getAll: (identity: HeroSightingsIdentity, world: string) =>
      getAll(identity, world).pipe(Effect.mapError(toHeroSightingsDataFailure)),
    getGuildSightings: (access: HeroSightingsGuildAccess, world: string) =>
      getGuildSightings(access, world).pipe(
        Effect.mapError(toHeroSightingsDataFailure),
      ),
    getHistory: (
      access: HeroSightingsGuildAccess,
      world: string,
      hero: string,
    ) =>
      getHistory(access, world, hero).pipe(
        Effect.mapError(toHeroSightingsDataFailure),
      ),
  };
};
