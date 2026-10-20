import { and, eq, sql } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import {
  FACTION_WARS,
  FACTION_WAR_TIMEZONE,
  factionWarDay,
  factionWarKillPoints,
  factionWarLootPoints,
  factionWarOnlinePoints,
  findRunningFactionWar,
  type FactionWar,
  type FactionWarPointSource,
} from "@lootlog/domain/faction-war";
import type { UserOnlineCheckpointV1 } from "@lootlog/protocol/rabbit/events";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  factionWarAwardTable,
  factionWarDailyPointsTable,
  factionWarOnlineSegmentTable,
  factionWarPickTable,
} from "#src/database/drizzle/schema";

type Database = typeof ApiDatabase.Service;

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

type Picker = { readonly discordId: string } | { readonly userId: string };

const DAY_MS = 86_400_000;

const OnlineSecondsResult = Schema.Struct({
  rows: Schema.Array(
    Schema.Struct({ seconds: Schema.Union([Schema.Number, Schema.String]) }),
  ),
});

/**
 * Awards faction war points. Every award is idempotent: kills rely on the
 * per-User kill dedup that runs before them, loots and battles on the award
 * ledger, and online points are recomputed from the stored segments.
 */
export const makeFactionWarPoints = (
  database: Database,
  wars: readonly FactionWar[] = FACTION_WARS,
) => {
  const findPick = (
    executor: Database | Transaction,
    war: FactionWar,
    picker: Picker,
  ) =>
    executor
      .select({ userId: factionWarPickTable.userId })
      .from(factionWarPickTable)
      .where(
        and(
          eq(factionWarPickTable.warId, war.id),
          "discordId" in picker
            ? eq(factionWarPickTable.discordId, picker.discordId)
            : eq(factionWarPickTable.userId, picker.userId),
        ),
      )
      .limit(1)
      .pipe(Effect.map((rows) => rows[0]?.userId));

  const addCapped = (
    transaction: Transaction,
    war: FactionWar,
    userId: string,
    source: FactionWarPointSource,
    at: Date,
    points: number,
  ) => {
    const cap = war.scoring.dailyCaps[source];

    return transaction
      .insert(factionWarDailyPointsTable)
      .values({
        warId: war.id,
        userId,
        day: factionWarDay(at),
        source,
        points: Math.min(cap, points),
        updatedAt: at,
      })
      .onConflictDoUpdate({
        target: [
          factionWarDailyPointsTable.warId,
          factionWarDailyPointsTable.userId,
          factionWarDailyPointsTable.day,
          factionWarDailyPointsTable.source,
        ],
        set: {
          points: sql`LEAST(${cap}, ${factionWarDailyPointsTable.points} + ${points})`,
          updatedAt: at,
        },
      });
  };

  /**
   * Adds points once per `sourceKey`; without a key the caller guarantees the
   * award runs once.
   */
  const award = Effect.fn("FactionWarPoints.award")(function* (options: {
    readonly picker: Picker;
    readonly source: FactionWarPointSource;
    readonly at: Date;
    readonly sourceKey?: string;
    readonly points: (war: FactionWar) => number;
  }) {
    const war = findRunningFactionWar(options.at.getTime(), wars);

    if (!war) return;
    const points = options.points(war);

    if (points <= 0) return;

    yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const userId = yield* findPick(transaction, war, options.picker);

        if (!userId) return;

        if (options.sourceKey !== undefined) {
          const claimed = yield* transaction
            .insert(factionWarAwardTable)
            .values({
              warId: war.id,
              source: options.source,
              sourceKey: options.sourceKey,
              userId,
              awardedAt: options.at,
            })
            .onConflictDoNothing()
            .returning({ userId: factionWarAwardTable.userId });

          if (claimed.length === 0) return;
        }

        yield* addCapped(
          transaction,
          war,
          userId,
          options.source,
          options.at,
          points,
        );
      }),
    );
  });

  const now = Effect.map(Clock.currentTimeMillis, (millis) => new Date(millis));

  const awardKill = Effect.fn("FactionWarPoints.awardKill")(function* (
    discordId: string,
    npcType: string,
  ) {
    yield* award({
      picker: { discordId },
      source: "KILL",
      at: yield* now,
      points: (war) => factionWarKillPoints(war, npcType),
    });
  });

  const awardLoot = Effect.fn("FactionWarPoints.awardLoot")(function* (
    discordId: string,
    lootId: number,
    rarities: readonly string[],
  ) {
    yield* award({
      picker: { discordId },
      source: "LOOT",
      at: yield* now,
      sourceKey: String(lootId),
      points: (war) => factionWarLootPoints(war, rarities),
    });
  });

  const awardPvpWin = (userId: string, battleId: string, wonAt: Date) =>
    award({
      picker: { userId },
      source: "PVP",
      at: wonAt,
      sourceKey: battleId,
      points: (war) => war.scoring.pvpWinPoints,
    });

  /**
   * Online seconds of one Warsaw day inside the war, with overlapping
   * sessions counted once. `range_agg` has no query-builder equivalent.
   */
  const onlineSeconds = (
    transaction: Transaction,
    war: FactionWar,
    userId: string,
    day: string,
  ) =>
    transaction
      .execute(
        sql`WITH bounds AS (
          SELECT
            GREATEST((${day}::date::timestamp AT TIME ZONE ${FACTION_WAR_TIMEZONE}), ${war.startsAt}::timestamptz) AS start,
            LEAST((((${day}::date + 1)::timestamp) AT TIME ZONE ${FACTION_WAR_TIMEZONE}), ${war.endsAt}::timestamptz) AS finish
        ), spans AS (
          SELECT unnest(range_agg(tstzrange(${factionWarOnlineSegmentTable.startedAt}, ${factionWarOnlineSegmentTable.endedAt}, '[)'))) AS span
          FROM ${factionWarOnlineSegmentTable}, bounds
          WHERE ${factionWarOnlineSegmentTable.warId} = ${war.id}
            AND ${factionWarOnlineSegmentTable.userId} = ${userId}
            AND ${factionWarOnlineSegmentTable.startedAt} < bounds.finish
            AND ${factionWarOnlineSegmentTable.endedAt} > bounds.start
        )
        SELECT COALESCE(sum(EXTRACT(epoch FROM (LEAST(upper(span), bounds.finish) - GREATEST(lower(span), bounds.start)))), 0) AS seconds
        FROM bounds LEFT JOIN spans ON true`,
      )
      .pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(OnlineSecondsResult)),
        Effect.map(({ rows }) => Number(rows[0]?.seconds ?? 0)),
      );

  const recordOnline = Effect.fn("FactionWarPoints.recordOnline")(function* (
    checkpoint: UserOnlineCheckpointV1,
  ) {
    const startedAt = new Date(checkpoint.startedAt);
    const endedAt = new Date(checkpoint.endedAt);

    const war =
      findRunningFactionWar(endedAt.getTime(), wars) ??
      findRunningFactionWar(startedAt.getTime(), wars);

    if (!war) return;

    yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const userId = yield* findPick(transaction, war, {
          userId: checkpoint.userId,
        });

        if (!userId) return;

        // A segment keeps its start and only grows, so redeliveries and
        // out-of-order checkpoints settle on the longest one.
        yield* transaction
          .insert(factionWarOnlineSegmentTable)
          .values({
            warId: war.id,
            userId,
            sessionId: checkpoint.sessionId,
            segmentId: checkpoint.segmentId,
            startedAt,
            endedAt,
          })
          .onConflictDoUpdate({
            target: [
              factionWarOnlineSegmentTable.warId,
              factionWarOnlineSegmentTable.userId,
              factionWarOnlineSegmentTable.sessionId,
              factionWarOnlineSegmentTable.segmentId,
            ],
            set: {
              endedAt: sql`GREATEST(${factionWarOnlineSegmentTable.endedAt}, excluded."endedAt")`,
            },
          });

        const days = new Set<string>();

        for (
          let at = startedAt.getTime();
          at < endedAt.getTime() + DAY_MS;
          at += DAY_MS
        ) {
          days.add(factionWarDay(new Date(Math.min(at, endedAt.getTime()))));
        }

        for (const day of days) {
          const points = factionWarOnlinePoints(
            war,
            yield* onlineSeconds(transaction, war, userId, day),
          );

          yield* transaction
            .insert(factionWarDailyPointsTable)
            .values({
              warId: war.id,
              userId,
              day,
              source: "ONLINE",
              points,
              updatedAt: endedAt,
            })
            .onConflictDoUpdate({
              target: [
                factionWarDailyPointsTable.warId,
                factionWarDailyPointsTable.userId,
                factionWarDailyPointsTable.day,
                factionWarDailyPointsTable.source,
              ],
              set: {
                points: sql`GREATEST(${factionWarDailyPointsTable.points}, excluded."points")`,
                updatedAt: endedAt,
              },
            });
        }
      }),
    );
  });

  return { awardKill, awardLoot, awardPvpWin, recordOnline };
};

export type FactionWarPoints = ReturnType<typeof makeFactionWarPoints>;
