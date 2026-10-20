import {
  emptyStatusResponse,
  reauthenticationRequiredResponse,
  statusCodeResponse,
} from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { createHash } from "node:crypto";
import { Clock, Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { and, asc, desc, eq, inArray, sql, sum } from "drizzle-orm";
import {
  factionWarDay,
  factionWarStandings,
  factionWarWinners,
  findChampionFactionWar,
  findCurrentFactionWar,
  findFactionWar,
  isFactionWarRunning,
  type FactionWar,
  type FactionWarDayStats,
  type FactionWarFaction,
  type FactionWarPointSource,
} from "@lootlog/domain/faction-war";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  factionWarDailyPointsTable,
  factionWarPickLockTable,
  factionWarPickTable,
  userCharactersLootlogSettingsTable,
} from "#src/database/drizzle/schema";
import { LootlogApi } from "../../lootlog-api.js";
import type { ReauthenticationRequired } from "#src/http-api/contracts/shared";
import type {
  FactionWarChampionsResponse,
  FactionWarLeaderboardResponse,
  FactionWarResponse,
  PickFactionRequest,
  PublicFactionWarResponse,
  UpdateFactionWarPickRequest,
} from "#src/contracts/faction-wars/schemas";

const LEADERBOARD_SIZE = 50;

const hashDiscordId = (discordId: string) =>
  createHash("sha256").update(discordId).digest("hex");

type StoredPick = typeof factionWarPickTable.$inferSelect;

export class FactionWarNotFound extends TaggedErrorClass<FactionWarNotFound>()(
  "FactionWarNotFound",
  { status: Schema.Literal(404) },
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
    }>;
  }
>()("@lootlog/api/http-api/faction-wars/identity") {}

type Persisted<A> = Effect.Effect<A, FactionWarsPersistenceError>;

export class FactionWarsData extends Context.Service<
  FactionWarsData,
  {
    readonly dayStats: (
      war: FactionWar,
    ) => Persisted<ReadonlyArray<FactionWarDayStats>>;
    readonly players: (
      war: FactionWar,
    ) => Persisted<Record<FactionWarFaction, number>>;
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
    /** Returns `null` when the User already picked in this war. */
    readonly createPick: (pick: StoredPick) => Persisted<StoredPick | null>;
    readonly updatePick: (
      warId: string,
      userId: string,
      payload: UpdateFactionWarPickRequest,
    ) => Persisted<StoredPick | null>;
    readonly leaderboard: (
      warId: string,
      faction: FactionWarFaction,
    ) => Persisted<
      ReadonlyArray<{
        userId: string;
        characterName: string;
        world: string;
        hidden: boolean;
        points: number;
      }>
    >;
    readonly championCharacterIds: (
      warId: string,
      factions: readonly FactionWarFaction[],
    ) => Persisted<
      ReadonlyArray<{ faction: FactionWarFaction; characterId: string }>
    >;
  }
>()("@lootlog/api/http-api/faction-wars/data") {
  static readonly layerDatabase = Layer.effect(
    FactionWarsData,
    Effect.map(ApiDatabase, (database) => {
      const persisted = <A, E>(effect: Effect.Effect<A, E>) =>
        effect.pipe(
          Effect.mapError(
            (cause) => new FactionWarsPersistenceError({ cause }),
          ),
        );

      const pickOf = (warId: string, userId: string) =>
        and(
          eq(factionWarPickTable.warId, warId),
          eq(factionWarPickTable.userId, userId),
        );

      const pointsOfPick = and(
        eq(factionWarDailyPointsTable.warId, factionWarPickTable.warId),
        eq(factionWarDailyPointsTable.userId, factionWarPickTable.userId),
      );

      const total = sql<number>`COALESCE(${sum(factionWarDailyPointsTable.points)}, 0)::int`;

      return FactionWarsData.of({
        dayStats: (war) =>
          persisted(
            database
              .select({
                day: factionWarDailyPointsTable.day,
                faction: factionWarPickTable.faction,
                points: total,
                activePlayers: sql<number>`count(DISTINCT ${factionWarDailyPointsTable.userId}) FILTER (WHERE ${factionWarDailyPointsTable.points} > 0)::int`,
              })
              .from(factionWarDailyPointsTable)
              .innerJoin(factionWarPickTable, pointsOfPick)
              .where(eq(factionWarDailyPointsTable.warId, war.id))
              .groupBy(
                factionWarDailyPointsTable.day,
                factionWarPickTable.faction,
              ),
          ),
        players: (war) =>
          persisted(
            database
              .select({
                faction: factionWarPickTable.faction,
                players: sql<number>`count(*)::int`,
              })
              .from(factionWarPickTable)
              .where(eq(factionWarPickTable.warId, war.id))
              .groupBy(factionWarPickTable.faction)
              .pipe(
                Effect.map((rows) => {
                  const players = { BARBATOS: 0, TANROTH: 0 };

                  for (const row of rows) players[row.faction] = row.players;

                  return players;
                }),
              ),
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
              )
              .pipe(
                Effect.map((rows) =>
                  rows.map((row) => ({
                    ...row,
                    source: row.source,
                  })),
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
          persisted(
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
                ),
              )
              .groupBy(factionWarPickTable.warId, factionWarPickTable.userId)
              .orderBy(desc(total), asc(factionWarPickTable.pickedAt)),
          ),
        championCharacterIds: (warId, factions) =>
          persisted(
            factions.length === 0
              ? Effect.succeed([])
              : Effect.gen(function* () {
                  const where = and(
                    eq(factionWarPickTable.warId, warId),
                    inArray(factionWarPickTable.faction, [...factions]),
                    eq(factionWarPickTable.championHighlightHidden, false),
                  );

                  const [picked, registered] = yield* Effect.all([
                    database
                      .select({
                        faction: factionWarPickTable.faction,
                        characterId: factionWarPickTable.characterId,
                      })
                      .from(factionWarPickTable)
                      .where(where),
                    database
                      .selectDistinct({
                        faction: factionWarPickTable.faction,
                        characterId:
                          userCharactersLootlogSettingsTable.characterId,
                      })
                      .from(factionWarPickTable)
                      .innerJoin(
                        userCharactersLootlogSettingsTable,
                        eq(
                          userCharactersLootlogSettingsTable.userId,
                          factionWarPickTable.discordId,
                        ),
                      )
                      .where(where),
                  ]);

                  return [...picked, ...registered].map((row) => ({
                    faction: row.faction,
                    characterId: row.characterId,
                  }));
                }),
          ),
      });
    }),
  );
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

  const [stats, players] = yield* Effect.all([
    data.dayStats(war),
    data.players(war),
  ]);

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
    isChampion: pick !== null && winners.includes(pick.faction),
    highlightHidden: pick?.championHighlightHidden ?? false,
  };
});

const warForCaller = Effect.fn("warForCaller")(function* (war: FactionWar) {
  const data = yield* FactionWarsData;
  const { userId } = yield* (yield* FactionWarsIdentity).caller;
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
      points: points.reduce((sum, row) => sum + row.points, 0),
      todayBySource,
    },
    champion,
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
  const { userId, discordId } = yield* (yield* FactionWarsIdentity).caller;

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
    const { userId } = yield* (yield* FactionWarsIdentity).caller;

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
    const { userId } = yield* (yield* FactionWarsIdentity).caller;
    const rows = yield* data.leaderboard(war.id, faction);

    const entries = rows
      .map((row, index) => ({
        rank: index + 1,
        characterName: row.hidden ? null : row.characterName,
        world: row.hidden ? null : row.world,
        points: row.points,
        isMe: row.userId === userId,
      }))
      .filter((entry) => entry.rank <= LEADERBOARD_SIZE || entry.isMe);

    return { faction, entries } satisfies FactionWarLeaderboardResponse;
  },
);

export const getFactionWarChampions = Effect.fn("getFactionWarChampions")(
  function* () {
    const data = yield* FactionWarsData;
    const at = yield* now;
    const war = findChampionFactionWar(at);

    if (!war) return { warId: null, champions: [] };

    const { winners } = yield* standingsOf(war);
    const rows = yield* data.championCharacterIds(war.id, winners);

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

type FactionWarsHttpFailure =
  | FactionWarNotFound
  | FactionWarConflict
  | FactionWarsPersistenceError
  | ReauthenticationRequired;

const toHttpResponse = <A, R>(
  effect: Effect.Effect<A, FactionWarsHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    FactionWarNotFound: emptyStatusResponse,
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
      .handle("FactionWarsControllerGetChampions", () =>
        toHttpResponse(getFactionWarChampions()),
      )
      .handle("FactionWarsControllerGetPublicCurrentWar", () =>
        toHttpResponse(getPublicCurrentFactionWar()),
      ),
);
