import { and, eq, isNull, or, sql } from "drizzle-orm";
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
  type FactionWarFaction,
  type FactionWarPointSource,
} from "@lootlog/domain/faction-war";
import type { UserOnlineCheckpointV1 } from "@lootlog/protocol/rabbit/events";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  factionWarAwardTable,
  factionWarDailyPointsTable,
  factionWarOnlineSegmentTable,
  factionWarPickTable,
  userCharactersLootlogSettingsTable,
} from "#src/database/drizzle/schema";

type Database = typeof ApiDatabase.Service;

export type FactionWarTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

type Transaction = FactionWarTransaction;

type Picker = { readonly discordId: string } | { readonly userId: string };

/** What one award added, for feedback to the player who earned it. */
export type FactionWarAward = {
  readonly faction: FactionWarFaction;
  readonly points: number;
};

const DAY_MS = 86_400_000;

const OnlineSecondsResult = Schema.Struct({
  rows: Schema.Array(
    Schema.Struct({ seconds: Schema.Union([Schema.Number, Schema.String]) }),
  ),
});

/**
 * Awards faction war points, only for play after the User picked. Every award
 * is idempotent: kills commit in the same transaction as the per-User kill
 * stats their dedup guards, loots and battles claim the award ledger once,
 * and online points are recomputed from the stored segments.
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
      .select({
        userId: factionWarPickTable.userId,
        faction: factionWarPickTable.faction,
        pickedAt: factionWarPickTable.pickedAt,
      })
      .from(factionWarPickTable)
      .where(
        and(
          eq(factionWarPickTable.warId, war.id),
          "discordId" in picker
            ? eq(factionWarPickTable.discordId, picker.discordId)
            : eq(factionWarPickTable.userId, picker.userId),
          // A disqualified pick earns nothing more.
          isNull(factionWarPickTable.disqualifiedAt),
        ),
      )
      .limit(1)
      .pipe(Effect.map((rows) => rows[0]));

  /** Adds up to the day's cap and returns how many points it really added. */
  const addCapped = Effect.fn("FactionWarPoints.addCapped")(function* (
    transaction: Transaction,
    war: FactionWar,
    userId: string,
    source: FactionWarPointSource,
    at: Date,
    points: number,
  ) {
    const cap = war.scoring.dailyCaps[source];
    const day = factionWarDay(at);

    const [current] = yield* transaction
      .select({ points: factionWarDailyPointsTable.points })
      .from(factionWarDailyPointsTable)
      .where(
        and(
          eq(factionWarDailyPointsTable.warId, war.id),
          eq(factionWarDailyPointsTable.userId, userId),
          eq(factionWarDailyPointsTable.day, day),
          eq(factionWarDailyPointsTable.source, source),
        ),
      )
      .limit(1);

    const added = Math.max(0, Math.min(points, cap - (current?.points ?? 0)));

    if (added === 0) return 0;

    // LEAST keeps the cap even if a concurrent award raced the read above.
    yield* transaction
      .insert(factionWarDailyPointsTable)
      .values({
        warId: war.id,
        userId,
        day,
        source,
        points: added,
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
          points: sql`LEAST(${cap}, ${factionWarDailyPointsTable.points} + ${added})`,
          updatedAt: at,
        },
      });

    return added;
  });

  type AwardOptions = {
    readonly picker: Picker;
    readonly source: FactionWarPointSource;
    readonly at: Date;
    /** Claims the award ledger, so the same loot or battle counts once. */
    readonly sourceKey?: string;
    readonly points: (war: FactionWar) => number;
  };

  /** The points the award really added for the picker's faction, if any. */
  const awardIn = Effect.fn("FactionWarPoints.awardIn")(function* (
    transaction: Transaction,
    options: AwardOptions,
  ) {
    const war = findRunningFactionWar(options.at.getTime(), wars);

    if (!war) return null;
    const points = options.points(war);

    if (points <= 0) return null;
    const pick = yield* findPick(transaction, war, options.picker);

    // Play before the pick never counts, however late its fact arrives.
    if (!pick || options.at < pick.pickedAt) return null;

    if (options.sourceKey !== undefined) {
      const claimed = yield* transaction
        .insert(factionWarAwardTable)
        .values({
          warId: war.id,
          source: options.source,
          sourceKey: options.sourceKey,
          userId: pick.userId,
          awardedAt: options.at,
        })
        .onConflictDoNothing()
        .returning({ userId: factionWarAwardTable.userId });

      if (claimed.length === 0) return null;
    }

    const added = yield* addCapped(
      transaction,
      war,
      pick.userId,
      options.source,
      options.at,
      points,
    );

    return { faction: pick.faction, points: added };
  });

  const award = (options: AwardOptions) =>
    database.transaction((transaction) => awardIn(transaction, options));

  const now = Effect.map(Clock.currentTimeMillis, (millis) => new Date(millis));

  /** Runs in the transaction that counts the kill for the User. */
  const awardKill = (
    transaction: Transaction,
    kill: {
      readonly discordId: string;
      readonly npcType: string;
      readonly killedAt: Date;
    },
  ) =>
    awardIn(transaction, {
      picker: { discordId: kill.discordId },
      source: "KILL",
      at: kill.killedAt,
      points: (war) => factionWarKillPoints(war, kill.npcType),
    });

  /**
   * Pays the loot to the submitter and to every party member whose character
   * a Lootlog User registered, each once per loot, as kills pay the party.
   * Returns the submitter's award.
   */
  const awardLoot = Effect.fn("FactionWarPoints.awardLoot")(function* (loot: {
    readonly submitterDiscordId: string;
    readonly lootId: number;
    readonly rarities: readonly string[];
    readonly party: ReadonlyArray<{
      readonly accountId: string;
      readonly characterId: string;
    }>;
  }) {
    const at = yield* now;

    const partyDiscordIds =
      loot.party.length === 0
        ? []
        : yield* database
            .selectDistinct({
              discordId: userCharactersLootlogSettingsTable.userId,
            })
            .from(userCharactersLootlogSettingsTable)
            .where(
              or(
                ...loot.party.map((member) =>
                  and(
                    eq(
                      userCharactersLootlogSettingsTable.accountId,
                      member.accountId,
                    ),
                    eq(
                      userCharactersLootlogSettingsTable.characterId,
                      member.characterId,
                    ),
                  ),
                ),
              ),
            );

    const discordIds = new Set([
      loot.submitterDiscordId,
      ...partyDiscordIds.map((row) => row.discordId),
    ]);

    let submitterAward: FactionWarAward | null = null;

    for (const discordId of discordIds) {
      const awarded = yield* award({
        picker: { discordId },
        source: "LOOT",
        at,
        sourceKey: String(loot.lootId),
        points: (war) => factionWarLootPoints(war, loot.rarities),
      });

      if (discordId === loot.submitterDiscordId) submitterAward = awarded;
    }

    return submitterAward;
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
        const pick = yield* findPick(transaction, war, {
          userId: checkpoint.userId,
        });

        // Only presence after the pick counts; a segment keeps its start, so
        // every checkpoint of it clips to the same instant.
        if (!pick || endedAt <= pick.pickedAt) return;
        const userId = pick.userId;

        const countedFrom =
          startedAt < pick.pickedAt ? pick.pickedAt : startedAt;

        // A segment keeps its start and only grows, so redeliveries and
        // out-of-order checkpoints settle on the longest one.
        yield* transaction
          .insert(factionWarOnlineSegmentTable)
          .values({
            warId: war.id,
            userId,
            sessionId: checkpoint.sessionId,
            segmentId: checkpoint.segmentId,
            startedAt: countedFrom,
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
          let at = countedFrom.getTime();
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
