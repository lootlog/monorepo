import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { Clock, Effect, Result } from "effect";
import { partition } from "es-toolkit";
import { AccessRequirement } from "@lootlog/domain/access-policy";
import {
  getHeroSightingKey,
  HERO_SIGHTING_HISTORY_LIMIT,
  resolveHeroSightingTransition,
} from "@lootlog/domain/hero-sightings";
import {
  canReadHeroSighting,
  HERO_SIGHTING_WRITE_PERMISSION,
  NPC_FEATURE_PERMISSIONS,
  HERO_SIGHTING_READ_FEATURE,
  type RolePermissionData,
} from "@lootlog/domain/npc-permissions";
import { getProfByShortname } from "@lootlog/domain/profession";
import { HeroSightingCloseReason } from "@lootlog/schema/hero-sightings";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  heroSightingClaimTable,
  heroSightingTable,
  userCharactersLootlogSettingsTable,
} from "#src/database/drizzle/schema";
import {
  findActiveGuildMember,
  selectAccessibleGuildRoles,
  selectAccessibleGuilds,
} from "#src/members/member-access-query";
import {
  buildHeroSightingLockKey,
  findOpenHeroSighting,
  loadHeroSightings,
} from "#src/hero-sightings/hero-sighting-query";
import { upsertActorCharacter } from "#src/http-api/handlers/timers/timer-actor-snapshot";
import {
  InvalidRequestError,
  PermissionDeniedError,
  ResourceConflictError,
} from "#src/shared/http/http-errors";
import type {
  ClaimHeroSightingRequest,
  CreateHeroSightingRequest,
  CreateHeroSightingResponse,
  HeroSightingResponse,
} from "#src/contracts/hero-sightings/schemas";
import type {
  HeroSightingsGuildAccess,
  HeroSightingsIdentity,
} from "./hero-sightings.handlers.js";
import {
  HeroSightingsMemberNotFound,
  HeroSightingsNotFound,
  toHeroSightingsDataFailure,
} from "./hero-sighting-errors.js";

/** A detector answer reaches the API within seconds; older ones are replays. */
const MAX_OBSERVATION_AGE_MS = 15 * 60 * 1000;

/** How long a hero's last sighting stays on the board after it closed. */
const BOARD_CLOSED_RETENTION_MS = 24 * 60 * 60 * 1000;

export interface HeroSightingPorts {
  readonly publish: (
    sighting: HeroSightingResponse,
  ) => Effect.Effect<unknown, unknown>;
  readonly withLock: <A, E>(
    key: string,
    effect: Effect.Effect<A, E>,
  ) => Effect.Effect<A, E | unknown>;
}

type Database = typeof ApiDatabase.Service;

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const canRead = (
  access: {
    readonly administers: boolean;
    readonly roles: readonly RolePermissionData[];
  },
  sighting: Pick<HeroSightingResponse, "hero">,
) => access.administers || canReadHeroSighting(access.roles, sighting.hero.lvl);

const guildReader = (access: HeroSightingsGuildAccess) => ({
  administers: access.accessPolicy.allowsAny(AccessRequirement.ADMINISTER),
  roles: access.roles,
});

const publishAll = (
  ports: HeroSightingPorts,
  sightings: ReadonlyArray<HeroSightingResponse>,
) => Effect.forEach(sightings, ports.publish, { discard: true });

/**
 * Keeps the newest sightings of a hero. The current one is always the newest
 * row, so it is never pruned.
 */
const pruneHeroSightings = Effect.fnUntraced(function* (
  transaction: Pick<Database, "select" | "delete">,
  guildId: string,
  world: string,
  heroKey: string,
) {
  const stale = yield* transaction
    .select({ id: heroSightingTable.id })
    .from(heroSightingTable)
    .where(
      and(
        eq(heroSightingTable.guildId, guildId),
        eq(heroSightingTable.world, world),
        eq(heroSightingTable.heroKey, heroKey),
      ),
    )
    .orderBy(desc(heroSightingTable.id))
    .offset(HERO_SIGHTING_HISTORY_LIMIT);

  if (stale.length > 0)
    yield* transaction.delete(heroSightingTable).where(
      inArray(
        heroSightingTable.id,
        stale.map(({ id }) => id),
      ),
    );
});

const getObservedAt = (observedAt: string, now: number) => {
  const time = Date.parse(observedAt);

  if (now - time > MAX_OBSERVATION_AGE_MS)
    throw new InvalidRequestError({ code: "HERO_SIGHTING_TOO_OLD" });

  // A reporter's clock may run ahead; nothing is detected in the future.
  return new Date(Math.min(time, now));
};

/**
 * Applies one detection to an Organization's sightings of the hero and
 * returns the current sighting and every sighting it changed.
 */
const recordDetection = Effect.fnUntraced(function* (
  transaction: Transaction,
  options: {
    readonly guildId: string;
    readonly discordId: string;
    readonly payload: CreateHeroSightingRequest;
    readonly observedAt: Date;
  },
) {
  const { guildId, payload, observedAt } = options;
  const heroKey = getHeroSightingKey(payload.hero.name);

  const member = yield* findActiveGuildMember(
    transaction,
    options.discordId,
    guildId,
  );

  if (!member)
    return yield* Effect.die(
      new HeroSightingsMemberNotFound({
        guildId,
        discordId: options.discordId,
      }),
    );

  const current = yield* findOpenHeroSighting(
    transaction,
    guildId,
    payload.world,
    heroKey,
  );

  const transition = resolveHeroSightingTransition(
    current && {
      state: current.state,
      mapName: current.mapName,
      lastSeenAt: current.lastSeenAt.getTime(),
    },
    {
      state: payload.state,
      mapName: payload.mapName,
      observedAt: observedAt.getTime(),
    },
  );

  const hero = {
    heroName: payload.hero.name,
    heroLvl: payload.hero.lvl,
    heroProf: getProfByShortname(payload.hero.prof ?? "") ?? null,
  };

  const now = new Date(yield* Clock.currentTimeMillis);

  if (current && transition === "STALE")
    return { currentId: current.id, changedIds: [current.id] };

  if (current && (transition === "CONFIRM" || transition === "SPAWNED")) {
    const newer = observedAt > current.lastSeenAt;

    yield* transaction
      .update(heroSightingTable)
      .set({
        ...hero,
        ...(newer && { lastSeenAt: observedAt, lastSeenById: member.id }),
        ...(transition === "SPAWNED" && {
          state: payload.state,
          spawnedAt: observedAt,
        }),
        updatedAt: now,
      })
      .where(eq(heroSightingTable.id, current.id));

    return { currentId: current.id, changedIds: [current.id] };
  }

  const changedIds: number[] = [];

  if (current) {
    yield* transaction
      .update(heroSightingTable)
      .set({
        closedAt: observedAt,
        closeReason: HeroSightingCloseReason.PROBABLY_KILLED,
        updatedAt: now,
      })
      .where(eq(heroSightingTable.id, current.id));
    changedIds.push(current.id);
  }

  const actorCharacter = yield* upsertActorCharacter(
    transaction,
    payload.world,
    payload.actorCharacter,
  );

  const inserted = yield* transaction
    .insert(heroSightingTable)
    .values({
      ...hero,
      guildId,
      world: payload.world,
      heroKey,
      state: payload.state,
      mapName: payload.mapName,
      firstSeenAt: observedAt,
      lastSeenAt: observedAt,
      detectedById: member.id,
      detectorCharacterSnapshotId: actorCharacter?.id ?? null,
      detectorCharacterLvl: payload.actorCharacter?.lvl ?? null,
      lastSeenById: member.id,
      updatedAt: now,
    })
    .returning({ id: heroSightingTable.id });

  const currentId = inserted[0]?.id;

  if (currentId === undefined)
    return yield* Effect.die(new Error("Hero sighting insert returned no row"));

  yield* pruneHeroSightings(transaction, guildId, payload.world, heroKey);

  return { currentId, changedIds: [...changedIds, currentId] };
});

export const makeCreateHeroSighting = (
  database: Database,
  ports: HeroSightingPorts,
) => {
  const writeGuildSighting = (
    identity: HeroSightingsIdentity,
    guildId: string,
    payload: CreateHeroSightingRequest,
    observedAt: Date,
  ) =>
    Effect.gen(function* () {
      const result = yield* ports.withLock(
        buildHeroSightingLockKey(
          guildId,
          payload.world,
          getHeroSightingKey(payload.hero.name),
        ),
        database.transaction((transaction) =>
          recordDetection(transaction, {
            guildId,
            discordId: identity.discordId,
            payload,
            observedAt,
          }),
        ),
      );

      const changed = yield* loadHeroSightings(database, result.changedIds);

      // The current sighting is published even when unchanged, so a retry of
      // a request whose publication failed still reaches every client.
      yield* publishAll(ports, changed);

      const current = changed.find(({ id }) => id === result.currentId);

      if (!current)
        return yield* Effect.die(new Error("Current hero sighting not loaded"));

      return current;
    });

  const operation = Effect.fn("createHeroSightingData")(function* (
    identity: HeroSightingsIdentity,
    payload: CreateHeroSightingRequest,
  ) {
    const now = yield* Clock.currentTimeMillis;

    const observedAt = yield* Effect.try({
      try: () => getObservedAt(payload.observedAt, now),
      catch: (cause) => cause,
    });

    const guildRows = yield* selectAccessibleGuilds(
      database,
      identity.discordId,
      [HERO_SIGHTING_WRITE_PERMISSION],
    );

    if (guildRows.length === 0)
      return yield* Effect.fail(new PermissionDeniedError());

    const configs = yield* database
      .select({
        catchingGuildIds: userCharactersLootlogSettingsTable.catchingGuildIds,
      })
      .from(userCharactersLootlogSettingsTable)
      .where(
        and(
          eq(userCharactersLootlogSettingsTable.userId, identity.discordId),
          eq(userCharactersLootlogSettingsTable.accountId, payload.accountId),
          eq(
            userCharactersLootlogSettingsTable.characterId,
            payload.characterId,
          ),
        ),
      )
      .orderBy(desc(userCharactersLootlogSettingsTable.createdAt))
      .limit(1);

    const catching = new Set(configs[0]?.catchingGuildIds ?? []);

    const [targets, excluded] = partition(guildRows, ({ guild }) =>
      catching.has(guild.id),
    );

    const rejectedGuilds: Array<
      CreateHeroSightingResponse["rejectedGuilds"][number]
    > = excluded.map(({ guild }) => ({
      guildId: guild.id,
      guildName: guild.name,
      reason: "NOT_ON_CATCHING_WHITELIST",
    }));

    if (targets.length === 0)
      return yield* Effect.fail(
        new InvalidRequestError({
          code: "NO_GUILDS_ON_THE_CATCHING_WHITELIST",
          details: { submittedGuilds: [], rejectedGuilds },
        }),
      );

    const outcomes = yield* Effect.forEach(
      targets,
      ({ guild }) =>
        writeGuildSighting(identity, guild.id, payload, observedAt).pipe(
          Effect.result,
          Effect.map((result) => ({ guild, result })),
        ),
      { concurrency: 3 },
    );

    const submittedGuilds: Array<
      CreateHeroSightingResponse["submittedGuilds"][number]
    > = [];

    for (const { guild, result } of outcomes) {
      if (Result.isSuccess(result)) {
        submittedGuilds.push({
          guildId: guild.id,
          guildName: guild.name,
          sighting: result.success,
        });
      } else {
        yield* Effect.logWarning("Hero sighting submission failed").pipe(
          Effect.annotateLogs({ guildId: guild.id, cause: result.failure }),
        );
        rejectedGuilds.push({
          guildId: guild.id,
          guildName: guild.name,
          reason: "SIGHTING_SUBMIT_FAILED",
        });
      }
    }

    if (submittedGuilds.length === 0)
      return yield* Effect.fail(
        new InvalidRequestError({
          code: "NO_GUILD_ACCEPTS_THIS_SIGHTING",
          details: { submittedGuilds: [], rejectedGuilds },
        }),
      );

    return { submittedGuilds, rejectedGuilds };
  });

  return (
    identity: HeroSightingsIdentity,
    payload: CreateHeroSightingRequest,
  ) =>
    operation(identity, payload).pipe(
      Effect.mapError(toHeroSightingsDataFailure),
    );
};

/** The latest sighting of each hero: the current one, or the last closed one for a day. */
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
      [NPC_FEATURE_PERMISSIONS[HERO_SIGHTING_READ_FEATURE].base],
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
        and(
          eq(heroSightingTable.guildId, access.guild.id),
          eq(heroSightingTable.world, world),
          eq(heroSightingTable.heroKey, getHeroSightingKey(hero)),
        ),
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

const notFound = () =>
  new HeroSightingsNotFound({ status: 404, code: "HERO_SIGHTING_NOT_FOUND" });

/** A sighting of this Organization the caller can see, or not found. */
const loadVisibleSighting = Effect.fnUntraced(function* (
  database: Pick<Database, "select">,
  access: HeroSightingsGuildAccess,
  sightingId: number,
) {
  const [sighting] = yield* loadHeroSightings(database, [sightingId]);

  if (
    !sighting ||
    sighting.guildId !== access.guild.id ||
    !canRead(guildReader(access), sighting)
  )
    return yield* Effect.fail(notFound());

  return sighting;
});

export const makeHeroSightingClaims = (
  database: Database,
  ports: Pick<HeroSightingPorts, "publish">,
) => {
  const claim = Effect.fn("claimHeroSightingData")(function* (
    access: HeroSightingsGuildAccess,
    sightingId: number,
    payload: ClaimHeroSightingRequest,
  ) {
    const sighting = yield* loadVisibleSighting(database, access, sightingId);

    if (sighting.closedAt !== null)
      return yield* Effect.fail(
        new ResourceConflictError({ code: "HERO_SIGHTING_CLOSED" }),
      );

    yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const character = yield* upsertActorCharacter(
          transaction,
          sighting.world,
          payload.actorCharacter,
        );

        // A repeated declaration keeps the first one and its time.
        yield* transaction
          .insert(heroSightingClaimTable)
          .values({
            sightingId,
            memberId: access.member.id,
            characterSnapshotId: character?.id ?? null,
            characterLvl: payload.actorCharacter?.lvl ?? null,
          })
          .onConflictDoNothing();
      }),
    );

    const [updated] = yield* loadHeroSightings(database, [sightingId]);

    if (!updated) return yield* Effect.fail(notFound());
    yield* ports.publish(updated);

    return updated;
  });

  const unclaim = Effect.fn("unclaimHeroSightingData")(function* (
    access: HeroSightingsGuildAccess,
    sightingId: number,
  ) {
    yield* loadVisibleSighting(database, access, sightingId);

    yield* database
      .delete(heroSightingClaimTable)
      .where(
        and(
          eq(heroSightingClaimTable.sightingId, sightingId),
          eq(heroSightingClaimTable.memberId, access.member.id),
        ),
      );

    const [updated] = yield* loadHeroSightings(database, [sightingId]);

    if (!updated) return yield* Effect.fail(notFound());
    yield* ports.publish(updated);

    return updated;
  });

  return {
    claim: (
      access: HeroSightingsGuildAccess,
      sightingId: number,
      payload: ClaimHeroSightingRequest,
    ) =>
      claim(access, sightingId, payload).pipe(
        Effect.mapError(toHeroSightingsDataFailure),
      ),
    unclaim: (access: HeroSightingsGuildAccess, sightingId: number) =>
      unclaim(access, sightingId).pipe(
        Effect.mapError(toHeroSightingsDataFailure),
      ),
  };
};

/**
 * Closes the current sighting of a hero Lootlog saw killed. Runs inside the
 * writer of the kill, and returns the closed sighting for publication.
 */
export const closeKilledHeroSighting = Effect.fnUntraced(function* (
  transaction: Pick<Database, "update">,
  options: {
    readonly guildId: string;
    readonly world: string;
    readonly heroName: string;
    readonly killedAt: Date;
  },
) {
  const closed = yield* transaction
    .update(heroSightingTable)
    .set({
      closedAt: options.killedAt,
      closeReason: HeroSightingCloseReason.KILLED,
      updatedAt: options.killedAt,
    })
    .where(
      and(
        eq(heroSightingTable.guildId, options.guildId),
        eq(heroSightingTable.world, options.world),
        eq(heroSightingTable.heroKey, getHeroSightingKey(options.heroName)),
        isNull(heroSightingTable.closedAt),
      ),
    )
    .returning({ id: heroSightingTable.id });

  return closed[0]?.id ?? null;
});
