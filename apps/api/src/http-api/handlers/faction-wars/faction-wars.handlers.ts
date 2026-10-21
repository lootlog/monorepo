import {
  emptyStatusResponse,
  reauthenticationRequiredResponse,
  statusCodeResponse,
} from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { createHash } from "node:crypto";
import { Clock, Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
  sum,
} from "drizzle-orm";
import {
  factionWarDay,
  factionWarStandings,
  factionWarWinners,
  findChampionFactionWar,
  findCurrentFactionWar,
  findFactionWar,
  isFactionWarRunning,
  type FactionWar,
  type FactionWarFaction,
  type FactionWarPointSource,
} from "@lootlog/domain/faction-war";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  factionWarDailyPointsTable,
  factionWarPickLockTable,
  factionWarPickTable,
  userKillCharacterTable,
} from "#src/database/drizzle/schema";
import { LootlogApi } from "../../lootlog-api.js";
import type { ReauthenticationRequired } from "#src/http-api/contracts/shared";
import type {
  DisqualifyFactionWarPlayerRequest,
  FactionWarChampionsResponse,
  FactionWarDisqualificationsResponse,
  FactionWarLeaderboardResponse,
  FactionWarResponse,
  PickFactionRequest,
  PublicFactionWarResponse,
  UpdateFactionWarPickRequest,
} from "#src/contracts/faction-wars/schemas";

const LEADERBOARD_SIZE = 50;

/** Scores and leaderboards move slowly enough to share across viewers. */
const STANDINGS_CACHE_SECONDS = 30;

/** Champions change only when a winner hides or shows their highlight. */
const CHAMPIONS_CACHE_SECONDS = 300;

const hashDiscordId = (discordId: string) =>
  createHash("sha256").update(discordId).digest("hex");

type StoredPick = typeof factionWarPickTable.$inferSelect;

type NewPick = typeof factionWarPickTable.$inferInsert;

const FactionSchema = Schema.Literals(["BARBATOS", "TANROTH"]);

const CachedStandingsInput = Schema.Struct({
  stats: Schema.Array(
    Schema.Struct({
      day: Schema.String,
      faction: FactionSchema,
      points: Schema.Number,
      activePlayers: Schema.Number,
    }),
  ),
  players: Schema.Struct({ BARBATOS: Schema.Number, TANROTH: Schema.Number }),
});

const CachedLeaderboard = Schema.Array(
  Schema.Struct({
    userId: Schema.String,
    characterName: Schema.String,
    world: Schema.String,
    hidden: Schema.Boolean,
    points: Schema.Number,
  }),
);

const CachedChampions = Schema.Array(
  Schema.Struct({ faction: FactionSchema, characterId: Schema.String }),
);

export class FactionWarNotFound extends TaggedErrorClass<FactionWarNotFound>()(
  "FactionWarNotFound",
  { status: Schema.Literal(404) },
) {}

export class FactionWarForbidden extends TaggedErrorClass<FactionWarForbidden>()(
  "FactionWarForbidden",
  { status: Schema.Literal(403) },
) {}

export class FactionWarConflict extends TaggedErrorClass<FactionWarConflict>()(
  "FactionWarConflict",
  {
    status: Schema.Literal(409),
    code: Schema.Literals([
      "FACTION_WAR_ALREADY_PICKED",
      "FACTION_WAR_NOT_RUNNING",
    ]),
  },
) {}

export class FactionWarsPersistenceError extends TaggedErrorClass<FactionWarsPersistenceError>()(
  "FactionWarsPersistenceError",
  { cause: Schema.Defect() },
) {}

export class FactionWarsIdentity extends Context.Service<
  FactionWarsIdentity,
  {
    readonly caller: Effect.Effect<{
      readonly userId: string;
      readonly discordId: string;
      /** May disqualify and restore players. */
      readonly isAdmin: boolean;
    }>;
  }
>()("@lootlog/api/http-api/faction-wars/identity") {}

/** Shared reads cached across viewers; tests and fallbacks pass through. */
export interface FactionWarsCache {
  readonly getOrSet: <S extends Schema.ConstraintDecoder<unknown>>(
    key: string,
    schema: S,
    load: Effect.Effect<S["Type"], unknown>,
    ttlSeconds: number,
  ) => Effect.Effect<S["Type"], unknown>;
}

const passThroughCache: FactionWarsCache = {
  getOrSet: (_key, _schema, load) => load,
};

type Persisted<A> = Effect.Effect<A, FactionWarsPersistenceError>;

type StandingsInput = typeof CachedStandingsInput.Type;

type LeaderboardRows = typeof CachedLeaderboard.Type;

type Disqualification = FactionWarDisqualificationsResponse[number];

export class FactionWarsData extends Context.Service<
  FactionWarsData,
  {
    /** Daily points and players of every faction, without disqualified picks. */
    readonly standingsInput: (war: FactionWar) => Persisted<StandingsInput>;
    readonly findPick: (
      warId: string,
      userId: string,
    ) => Persisted<StoredPick | null>;
    readonly userPoints: (
      warId: string,
      userId: string,
    ) => Persisted<
      ReadonlyArray<{
        day: string;
        source: FactionWarPointSource;
        points: number;
      }>
    >;
    /** Returns `null` when the User or their Discord account already picked. */
    readonly createPick: (pick: NewPick) => Persisted<StoredPick | null>;
    readonly updatePick: (
      warId: string,
      userId: string,
      payload: UpdateFactionWarPickRequest,
    ) => Persisted<StoredPick | null>;
    readonly leaderboard: (
      warId: string,
      faction: FactionWarFaction,
    ) => Persisted<LeaderboardRows>;
    readonly championCharacterIds: (
      warId: string,
      factions: readonly FactionWarFaction[],
      world: string,
    ) => Persisted<
      ReadonlyArray<{ faction: FactionWarFaction; characterId: string }>
    >;
    readonly disqualifications: (
      warId: string,
    ) => Persisted<ReadonlyArray<Disqualification>>;
    /** Sets or clears a disqualification; `false` when the User never picked. */
    readonly setDisqualification: (
      warId: string,
      userId: string,
      disqualification: { readonly at: Date; readonly reason: string } | null,
    ) => Persisted<boolean>;
  }
>()("@lootlog/api/http-api/faction-wars/data") {
  static readonly make = (cache: FactionWarsCache) =>
    Layer.effect(
      FactionWarsData,
      Effect.map(ApiDatabase, (database) => {
        const persisted = <A, E>(effect: Effect.Effect<A, E>) =>
          effect.pipe(
            Effect.mapError(
              (cause) => new FactionWarsPersistenceError({ cause }),
            ),
          );

        const cached = <S extends Schema.ConstraintDecoder<unknown>>(
          key: string,
          schema: S,
          load: Effect.Effect<S["Type"], unknown>,
          ttlSeconds: number,
        ) => persisted(cache.getOrSet(key, schema, load, ttlSeconds));

        const pickOf = (warId: string, userId: string) =>
          and(
            eq(factionWarPickTable.warId, warId),
            eq(factionWarPickTable.userId, userId),
          );

        const counting = isNull(factionWarPickTable.disqualifiedAt);

        const pointsOfPick = and(
          eq(factionWarDailyPointsTable.warId, factionWarPickTable.warId),
          eq(factionWarDailyPointsTable.userId, factionWarPickTable.userId),
        );

        const total = sql<number>`COALESCE(${sum(factionWarDailyPointsTable.points)}, 0)::int`;

        return FactionWarsData.of({
          standingsInput: (war) =>
            cached(
              `faction-war:${war.id}:standings`,
              CachedStandingsInput,
              Effect.all({
                stats: database
                  .select({
                    day: factionWarDailyPointsTable.day,
                    faction: factionWarPickTable.faction,
                    points: total,
                    activePlayers: sql<number>`count(DISTINCT ${factionWarDailyPointsTable.userId}) FILTER (WHERE ${factionWarDailyPointsTable.points} > 0)::int`,
                  })
                  .from(factionWarDailyPointsTable)
                  .innerJoin(factionWarPickTable, and(pointsOfPick, counting))
                  .where(eq(factionWarDailyPointsTable.warId, war.id))
                  .groupBy(
                    factionWarDailyPointsTable.day,
                    factionWarPickTable.faction,
                  ),
                players: database
                  .select({
                    faction: factionWarPickTable.faction,
                    players: sql<number>`count(*)::int`,
                  })
                  .from(factionWarPickTable)
                  .where(and(eq(factionWarPickTable.warId, war.id), counting))
                  .groupBy(factionWarPickTable.faction)
                  .pipe(
                    Effect.map((rows) => {
                      const players = { BARBATOS: 0, TANROTH: 0 };

                      for (const row of rows) {
                        players[row.faction] = row.players;
                      }

                      return players;
                    }),
                  ),
              }),
              STANDINGS_CACHE_SECONDS,
            ),
          findPick: (warId, userId) =>
            persisted(
              database
                .select()
                .from(factionWarPickTable)
                .where(pickOf(warId, userId))
                .limit(1)
                .pipe(Effect.map((rows) => rows[0] ?? null)),
            ),
          userPoints: (warId, userId) =>
            persisted(
              database
                .select({
                  day: factionWarDailyPointsTable.day,
                  source: factionWarDailyPointsTable.source,
                  points: factionWarDailyPointsTable.points,
                })
                .from(factionWarDailyPointsTable)
                .where(
                  and(
                    eq(factionWarDailyPointsTable.warId, warId),
                    eq(factionWarDailyPointsTable.userId, userId),
                  ),
                ),
            ),
          createPick: (pick) =>
            persisted(
              database.transaction((transaction) =>
                Effect.gen(function* () {
                  const locked = yield* transaction
                    .insert(factionWarPickLockTable)
                    .values({
                      warId: pick.warId,
                      discordIdHash: hashDiscordId(pick.discordId),
                    })
                    .onConflictDoNothing()
                    .returning({ warId: factionWarPickLockTable.warId });

                  if (locked.length === 0) return null;

                  const [created] = yield* transaction
                    .insert(factionWarPickTable)
                    .values(pick)
                    .onConflictDoNothing()
                    .returning();

                  return created ?? null;
                }),
              ),
            ),
          updatePick: (warId, userId, payload) =>
            persisted(
              Object.keys(payload).length === 0
                ? database
                    .select()
                    .from(factionWarPickTable)
                    .where(pickOf(warId, userId))
                    .limit(1)
                    .pipe(Effect.map((rows) => rows[0] ?? null))
                : database
                    .update(factionWarPickTable)
                    .set(payload)
                    .where(pickOf(warId, userId))
                    .returning()
                    .pipe(Effect.map((rows) => rows[0] ?? null)),
            ),
          leaderboard: (warId, faction) =>
            cached(
              `faction-war:${warId}:leaderboard:${faction}`,
              CachedLeaderboard,
              database
                .select({
                  userId: factionWarPickTable.userId,
                  characterName: factionWarPickTable.characterName,
                  world: factionWarPickTable.world,
                  hidden: factionWarPickTable.hiddenFromLeaderboard,
                  points: total,
                })
                .from(factionWarPickTable)
                .leftJoin(factionWarDailyPointsTable, pointsOfPick)
                .where(
                  and(
                    eq(factionWarPickTable.warId, warId),
                    eq(factionWarPickTable.faction, faction),
                    counting,
                  ),
                )
                .groupBy(factionWarPickTable.warId, factionWarPickTable.userId)
                .orderBy(desc(total), asc(factionWarPickTable.pickedAt)),
              STANDINGS_CACHE_SECONDS,
            ),
          championCharacterIds: (warId, factions, world) =>
            factions.length === 0
              ? Effect.succeed([])
              : cached(
                  `faction-war:${warId}:champions:${world}`,
                  CachedChampions,
                  Effect.gen(function* () {
                    const champions = and(
                      eq(factionWarPickTable.warId, warId),
                      inArray(factionWarPickTable.faction, [...factions]),
                      eq(factionWarPickTable.championHighlightHidden, false),
                      counting,
                    );

                    // The picking character, plus every character the
                    // champion's account played on this world.
                    const [picked, played] = yield* Effect.all([
                      database
                        .select({
                          faction: factionWarPickTable.faction,
                          characterId: factionWarPickTable.characterId,
                        })
                        .from(factionWarPickTable)
                        .where(
                          and(champions, eq(factionWarPickTable.world, world)),
                        ),
                      database
                        .selectDistinct({
                          faction: factionWarPickTable.faction,
                          characterId: userKillCharacterTable.characterId,
                        })
                        .from(factionWarPickTable)
                        .innerJoin(
                          userKillCharacterTable,
                          and(
                            eq(
                              userKillCharacterTable.discordUserId,
                              factionWarPickTable.discordId,
                            ),
                            eq(userKillCharacterTable.world, world),
                          ),
                        )
                        .where(champions),
                    ]);

                    return [...picked, ...played];
                  }),
                  CHAMPIONS_CACHE_SECONDS,
                ),
          disqualifications: (warId) =>
            persisted(
              database
                .select({
                  userId: factionWarPickTable.userId,
                  faction: factionWarPickTable.faction,
                  characterName: factionWarPickTable.characterName,
                  world: factionWarPickTable.world,
                  disqualifiedAt: factionWarPickTable.disqualifiedAt,
                  reason: factionWarPickTable.disqualificationReason,
                })
                .from(factionWarPickTable)
                .where(
                  and(
                    eq(factionWarPickTable.warId, warId),
                    isNotNull(factionWarPickTable.disqualifiedAt),
                  ),
                )
                .orderBy(desc(factionWarPickTable.disqualifiedAt))
                .pipe(
                  Effect.map((rows) =>
                    rows.flatMap(({ disqualifiedAt, ...row }) =>
                      disqualifiedAt ? [{ ...row, disqualifiedAt }] : [],
                    ),
                  ),
                ),
            ),
          setDisqualification: (warId, userId, disqualification) =>
            persisted(
              database
                .update(factionWarPickTable)
                .set({
                  disqualifiedAt: disqualification?.at ?? null,
                  disqualificationReason: disqualification?.reason ?? null,
                })
                .where(pickOf(warId, userId))
                .returning({ userId: factionWarPickTable.userId })
                .pipe(Effect.map((rows) => rows.length > 0)),
            ),
        });
      }),
    );

  /** Uncached reads straight from the database, as tests use them. */
  static readonly layerDatabase = FactionWarsData.make(passThroughCache);
}

const now = Clock.currentTimeMillis;

const statusOf = (war: FactionWar, at: number) =>
  isFactionWarRunning(war, at)
    ? ("RUNNING" as const)
    : Date.parse(war.startsAt) > at
      ? ("UPCOMING" as const)
      : ("ENDED" as const);

const standingsOf = Effect.fn("standingsOf")(function* (war: FactionWar) {
  const data = yield* FactionWarsData;
  const at = yield* now;
  const { stats, players } = yield* data.standingsInput(war);
  const standings = factionWarStandings(war, stats);
  const status = statusOf(war, at);

  return {
    ...standings,
    status,
    players,
    winners:
      status === "ENDED"
        ? factionWarWinners(standings.score, war.factions)
        : [],
  };
});

const publicWarOf = (
  war: FactionWar,
  standings: Effect.Success<ReturnType<typeof standingsOf>>,
) =>
  ({
    id: war.id,
    status: standings.status,
    startsAt: new Date(war.startsAt),
    endsAt: new Date(war.endsAt),
    scoring: {
      killPoints: { ...war.scoring.killPoints },
      lootPoints: { ...war.scoring.lootPoints },
      onlineSecondsPerPoint: war.scoring.onlineSecondsPerPoint,
      pvpWinPoints: war.scoring.pvpWinPoints,
      underdogBonusCap: war.scoring.underdogBonusCap,
      dailyCaps: { ...war.scoring.dailyCaps },
    },
    totals: war.factions.map((faction) => ({
      faction,
      points: standings.score[faction],
      rawPoints: standings.rawPoints[faction],
      players: standings.players[faction],
      multiplier: standings.currentMultipliers[faction],
    })),
    winners: standings.winners,
  }) satisfies PublicFactionWarResponse;

const requireWar = (warId: string) => {
  const war = findFactionWar(warId);

  return war
    ? Effect.succeed(war)
    : Effect.fail(new FactionWarNotFound({ status: 404 }));
};

const currentWar = Effect.gen(function* () {
  const war = findCurrentFactionWar(yield* now);

  if (!war) return yield* new FactionWarNotFound({ status: 404 });

  return war;
});

const caller = Effect.flatMap(
  FactionWarsIdentity,
  (identity) => identity.caller,
);

const requireAdmin = Effect.gen(function* () {
  const identity = yield* caller;

  if (!identity.isAdmin) return yield* new FactionWarForbidden({ status: 403 });

  return identity;
});

const emptySources = (): Record<FactionWarPointSource, number> => ({
  KILL: 0,
  LOOT: 0,
  ONLINE: 0,
  PVP: 0,
});

const championOf = Effect.fn("championOf")(function* (userId: string) {
  const data = yield* FactionWarsData;
  const war = findChampionFactionWar(yield* now);

  if (!war) return null;

  const [{ winners }, pick] = yield* Effect.all([
    standingsOf(war),
    data.findPick(war.id, userId),
  ]);

  return {
    warId: war.id,
    winners,
    isChampion:
      pick !== null &&
      pick.disqualifiedAt === null &&
      winners.includes(pick.faction),
    highlightHidden: pick?.championHighlightHidden ?? false,
  };
});

const warForCaller = Effect.fn("warForCaller")(function* (war: FactionWar) {
  const data = yield* FactionWarsData;
  const { userId, isAdmin } = yield* caller;
  const today = factionWarDay(new Date(yield* now));

  const [standings, pick, points, champion] = yield* Effect.all([
    standingsOf(war),
    data.findPick(war.id, userId),
    data.userPoints(war.id, userId),
    championOf(userId),
  ]);

  const todayBySource = emptySources();

  for (const row of points) {
    if (row.day === today) todayBySource[row.source] += row.points;
  }

  return {
    ...publicWarOf(war, standings),
    days: standings.days,
    pick: pick && {
      faction: pick.faction,
      characterName: pick.characterName,
      world: pick.world,
      pickedAt: pick.pickedAt,
      hiddenFromLeaderboard: pick.hiddenFromLeaderboard,
      disqualified: pick.disqualifiedAt !== null,
      points: points.reduce((sum, row) => sum + row.points, 0),
      todayBySource,
    },
    champion,
    isAdmin,
  } satisfies FactionWarResponse;
});

export const getCurrentFactionWar = Effect.fn("getCurrentFactionWar")(
  function* () {
    return yield* warForCaller(yield* currentWar);
  },
);

export const getPublicCurrentFactionWar = Effect.fn(
  "getPublicCurrentFactionWar",
)(function* () {
  const war = yield* currentWar;

  return publicWarOf(war, yield* standingsOf(war));
});

export const pickFaction = Effect.fn("pickFaction")(function* (
  warId: string,
  payload: PickFactionRequest,
) {
  const war = yield* requireWar(warId);
  const at = yield* now;

  if (!isFactionWarRunning(war, at) || !war.factions.includes(payload.faction))
    return yield* new FactionWarConflict({
      status: 409,
      code: "FACTION_WAR_NOT_RUNNING",
    });

  const data = yield* FactionWarsData;
  const { userId, discordId } = yield* caller;

  const created = yield* data.createPick({
    warId: war.id,
    userId,
    discordId,
    faction: payload.faction,
    characterId: payload.characterId,
    characterName: payload.characterName,
    world: payload.world,
    hiddenFromLeaderboard: false,
    championHighlightHidden: false,
    pickedAt: new Date(at),
  });

  if (created === null)
    return yield* new FactionWarConflict({
      status: 409,
      code: "FACTION_WAR_ALREADY_PICKED",
    });

  return yield* warForCaller(war);
});

export const updateFactionWarPick = Effect.fn("updateFactionWarPick")(
  function* (warId: string, payload: UpdateFactionWarPickRequest) {
    const war = yield* requireWar(warId);
    const data = yield* FactionWarsData;
    const { userId } = yield* caller;

    if ((yield* data.updatePick(war.id, userId, payload)) === null)
      return yield* new FactionWarNotFound({ status: 404 });

    const current = findCurrentFactionWar(yield* now) ?? war;

    return yield* warForCaller(current);
  },
);

export const getFactionWarLeaderboard = Effect.fn("getFactionWarLeaderboard")(
  function* (warId: string, faction: FactionWarFaction) {
    const war = yield* requireWar(warId);
    const data = yield* FactionWarsData;
    const { userId, isAdmin } = yield* caller;
    const rows = yield* data.leaderboard(war.id, faction);

    const entries = rows
      .map((row, index) => ({
        rank: index + 1,
        // Hidden players stay anonymous to everyone but war admins.
        characterName: row.hidden && !isAdmin ? null : row.characterName,
        world: row.hidden && !isAdmin ? null : row.world,
        points: row.points,
        isMe: row.userId === userId,
        // Admins need the id to disqualify; nobody else learns it.
        userId: isAdmin ? row.userId : null,
      }))
      .filter((entry) => entry.rank <= LEADERBOARD_SIZE || entry.isMe);

    return { faction, entries } satisfies FactionWarLeaderboardResponse;
  },
);

export const getFactionWarChampions = Effect.fn("getFactionWarChampions")(
  function* (world: string) {
    const data = yield* FactionWarsData;
    const war = findChampionFactionWar(yield* now);

    if (!war) return { warId: null, champions: [] };

    const { winners } = yield* standingsOf(war);
    const rows = yield* data.championCharacterIds(war.id, winners, world);

    return {
      warId: war.id,
      champions: winners.map((faction) => ({
        faction,
        characterIds: [
          ...new Set(
            rows
              .filter((row) => row.faction === faction)
              .map((row) => row.characterId),
          ),
        ],
      })),
    } satisfies FactionWarChampionsResponse;
  },
);

export const getFactionWarDisqualifications = Effect.fn(
  "getFactionWarDisqualifications",
)(function* (warId: string) {
  yield* requireAdmin;
  const war = yield* requireWar(warId);

  return yield* (yield* FactionWarsData).disqualifications(war.id);
});

export const setFactionWarDisqualification = Effect.fn(
  "setFactionWarDisqualification",
)(function* (
  warId: string,
  userId: string,
  payload: DisqualifyFactionWarPlayerRequest | null,
) {
  yield* requireAdmin;
  const war = yield* requireWar(warId);
  const data = yield* FactionWarsData;

  const updated = yield* data.setDisqualification(
    war.id,
    userId,
    payload && { at: new Date(yield* now), reason: payload.reason },
  );

  if (!updated) return yield* new FactionWarNotFound({ status: 404 });

  return yield* data.disqualifications(war.id);
});

type FactionWarsHttpFailure =
  | FactionWarNotFound
  | FactionWarForbidden
  | FactionWarConflict
  | FactionWarsPersistenceError
  | ReauthenticationRequired;

const toHttpResponse = <A, R>(
  effect: Effect.Effect<A, FactionWarsHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    FactionWarNotFound: emptyStatusResponse,
    FactionWarForbidden: emptyStatusResponse,
    FactionWarConflict: statusCodeResponse,
    ReauthenticationRequired: reauthenticationRequiredResponse,
    FactionWarsPersistenceError: (error) => Effect.die(error.cause),
  });

export const FactionWarsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "faction-wars",
  (handlers) =>
    handlers
      .handle("FactionWarsControllerGetCurrentWar", () =>
        toHttpResponse(getCurrentFactionWar()),
      )
      .handle("FactionWarsControllerPickFaction", ({ params, payload }) =>
        toHttpResponse(pickFaction(params.warId, payload)),
      )
      .handle("FactionWarsControllerUpdatePick", ({ params, payload }) =>
        toHttpResponse(updateFactionWarPick(params.warId, payload)),
      )
      .handle("FactionWarsControllerGetLeaderboard", ({ params, query }) =>
        toHttpResponse(getFactionWarLeaderboard(params.warId, query.faction)),
      )
      .handle("FactionWarsControllerGetChampions", ({ query }) =>
        toHttpResponse(getFactionWarChampions(query.world)),
      )
      .handle("FactionWarsControllerGetDisqualifications", ({ params }) =>
        toHttpResponse(getFactionWarDisqualifications(params.warId)),
      )
      .handle("FactionWarsControllerDisqualifyPlayer", ({ params, payload }) =>
        toHttpResponse(
          setFactionWarDisqualification(params.warId, params.userId, payload),
        ),
      )
      .handle("FactionWarsControllerRestorePlayer", ({ params }) =>
        toHttpResponse(
          setFactionWarDisqualification(params.warId, params.userId, null),
        ),
      )
      .handle("FactionWarsControllerGetPublicCurrentWar", () =>
        toHttpResponse(getPublicCurrentFactionWar()),
      ),
);
