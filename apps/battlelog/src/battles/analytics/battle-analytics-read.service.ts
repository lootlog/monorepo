import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  ne,
  notInArray,
  sql,
} from "drizzle-orm";
import { Effect } from "effect";
import type { DrizzleDatabase } from "#src/database/database";
import { battles, battleWarriors } from "#src/database/schema";
import type { BattleAnalyticsQuery } from "./battle-analytics-query.service.js";
import type {
  BattleStatisticsQuery,
  PlayerVsPlayerQuery,
} from "./query-battle-statistics.js";
import type {
  AbyssSeason,
  BattleDurationStats,
  BattleStreak,
  HeadToHeadRecord,
} from "./battle-statistics-response.js";
import { filterAndSortHeadToHeadRecords } from "./head-to-head-calculator.service.js";

import { selectedWarriorOrder } from "#src/battles/battle-warrior-query";
import { battleWarriorNumberStat } from "#src/battles/statistics/battle-warrior-stats-query";

const snapshotColumns = {
  id: battleWarriors.id,
  originalId: battleWarriors.originalId,
  name: battleWarriors.name,
  icon: battleWarriors.icon,
  prof: battleWarriors.prof,
  lvl: battleWarriors.lvl,
  team: battleWarriors.team,
  ph: battleWarriors.ph,
  fireDamage: battleWarriorNumberStat("fireDamage"),
  frostDamage: battleWarriorNumberStat("frostDamage"),
  lightningDamage: battleWarriorNumberStat("lightningDamage"),
  poisonDamageTaken: battleWarriorNumberStat("poisonDamageTaken"),
  woundDamageTaken: battleWarriorNumberStat("woundDamageTaken"),
  critWoundDamageTaken: battleWarriorNumberStat("critWoundDamageTaken"),
};

export const makeBattleAnalyticsRead = (
  db: Pick<DrizzleDatabase, "select">,
  queryModule: BattleAnalyticsQuery,
) => {
  const source = (
    userId: string,
    query: Partial<BattleStatisticsQuery>,
    characterIds: string[],
    options: {
      hasFlee?: boolean;
      ph?: boolean;
      allTypes?: boolean;
      opponentId?: string;
      excludeBattleId?: string;
      ratingDelta?: boolean;
      rating?: boolean;
      requireOpponent?: boolean;
    } = {},
  ) => {
    const user = db
      .select(snapshotColumns)
      .from(battleWarriors)
      .where(
        and(
          eq(battleWarriors.battleId, battles.id),
          inArray(battleWarriors.originalId, characterIds),
        ),
      )
      .orderBy(...selectedWarriorOrder(battles))
      .limit(1)
      .as("analytics_user");

    const opponent = db
      .select(snapshotColumns)
      .from(battleWarriors)
      .where(
        and(
          eq(battleWarriors.battleId, battles.id),
          notInArray(battleWarriors.originalId, characterIds),
        ),
      )
      .orderBy(asc(battleWarriors.originalId), asc(battleWarriors.id))
      .limit(1)
      .as("analytics_opponent");

    const buildWhere = options.allTypes
      ? queryModule.buildCombatProfileWhere
      : queryModule.buildAnalyticsWhere;

    const where = and(
      buildWhere(battles, {
        userId,
        world: query.world,
        ...queryModule.getDateRangeFilter(query),
        matchmaking: query.matchmaking,
        characterIds,
        phFilter: options.ph ?? query.ph,
        hasFlee: options.hasFlee,
        ratingDeltaNotNull: options.ratingDelta,
        ratingNotNull: options.rating,
      }),
      query.minLevel === undefined
        ? undefined
        : gte(opponent.lvl, query.minLevel),
      query.maxLevel === undefined
        ? undefined
        : lte(opponent.lvl, query.maxLevel),
      options.opponentId === undefined
        ? undefined
        : queryModule.warriorExists(
            battles,
            eq(battleWarriors.originalId, options.opponentId),
          ),
      options.excludeBattleId === undefined
        ? undefined
        : ne(battles.id, options.excludeBattleId),
      options.requireOpponent ? isNotNull(opponent.originalId) : undefined,
    );

    return { user, opponent, where };
  };

  const getDuration = Effect.fnUntraced(function* (
    userId: string,
    query: BattleStatisticsQuery,
    characterIds: string[],
  ): Effect.fn.Return<BattleDurationStats, unknown> {
    const { user, opponent, where } = source(userId, query, characterIds, {
      hasFlee: false,
    });

    const [row] = yield* db
      .select({
        avgWinDuration:
          sql<number>`coalesce(avg(${battles.duration}) filter (where ${user.team} = ${battles.winningTeam}), 0)`.mapWith(
            Number,
          ),
        avgLossDuration:
          sql<number>`coalesce(avg(${battles.duration}) filter (where ${user.team} <> ${battles.winningTeam}), 0)`.mapWith(
            Number,
          ),
      })
      .from(battles)
      .innerJoinLateral(user, sql`true`)
      .leftJoinLateral(opponent, sql`true`)
      .where(where);

    const fastest = yield* db
      .select({ duration: battles.duration, battleId: battles.id })
      .from(battles)
      .innerJoinLateral(user, sql`true`)
      .leftJoinLateral(opponent, sql`true`)
      .where(where)
      .orderBy(asc(battles.duration), asc(battles.id))
      .limit(1);

    const longest = yield* db
      .select({ duration: battles.duration, battleId: battles.id })
      .from(battles)
      .innerJoinLateral(user, sql`true`)
      .leftJoinLateral(opponent, sql`true`)
      .where(where)
      .orderBy(desc(battles.duration), desc(battles.id))
      .limit(1);

    return {
      avgWinDuration: Math.round(row?.avgWinDuration ?? 0),
      avgLossDuration: Math.round(row?.avgLossDuration ?? 0),
      fastest: fastest[0] ?? null,
      longest: longest[0] ?? null,
    };
  });

  const getStreak = Effect.fnUntraced(function* (
    userId: string,
    query: BattleStatisticsQuery,
    characterIds: string[],
  ): Effect.fn.Return<BattleStreak, unknown> {
    const { user, opponent, where } = source(userId, query, characterIds, {
      hasFlee: false,
    });

    const isWin = sql<boolean>`${user.team} = ${battles.winningTeam}`;

    const ranked = db
      .select({
        isWin: isWin.as("is_win"),
        position:
          sql<number>`row_number() over (order by ${battles.createdAt} desc, ${battles.id} desc)`.as(
            "position",
          ),
        run: sql<number>`row_number() over (order by ${battles.createdAt} desc, ${battles.id} desc) - row_number() over (partition by ${isWin} order by ${battles.createdAt} desc, ${battles.id} desc)`.as(
          "run",
        ),
      })
      .from(battles)
      .innerJoinLateral(user, sql`true`)
      .leftJoinLateral(opponent, sql`true`)
      .where(where)
      .as("ranked_battles");

    const runs = db
      .select({
        isWin: ranked.isWin,
        length: sql<number>`count(*)`.as("length"),
        start: sql<number>`min(${ranked.position})`.as("start"),
      })
      .from(ranked)
      .groupBy(ranked.isWin, ranked.run)
      .as("battle_runs");

    const [row] = yield* db
      .select({
        currentWin: sql<
          boolean | null
        >`bool_or(${runs.isWin}) filter (where ${runs.start} = 1)`,
        currentCount:
          sql<number>`coalesce(max(${runs.length}) filter (where ${runs.start} = 1), 0)`.mapWith(
            Number,
          ),
        wins: sql<number>`coalesce(max(${runs.length}) filter (where ${runs.isWin}), 0)`.mapWith(
          Number,
        ),
        losses:
          sql<number>`coalesce(max(${runs.length}) filter (where not ${runs.isWin}), 0)`.mapWith(
            Number,
          ),
      })
      .from(runs);

    if (!row || row.currentWin === null)
      return {
        current: { type: "none", count: 0 },
        longest: { wins: 0, losses: 0 },
      };

    return {
      current: {
        type: row.currentWin ? "wins" : "losses",
        count: row.currentCount,
      },
      longest: { wins: row.wins, losses: row.losses },
    };
  });

  const getPhGrowth = Effect.fnUntraced(function* (
    userId: string,
    query: BattleStatisticsQuery,
    characterIds: string[],
  ) {
    const { user, opponent, where } = source(userId, query, characterIds, {
      ph: true,
    });

    const rows = yield* db
      .select({
        date: battles.createdAt,
        ph: user.ph,
        cumulativePh:
          sql<number>`sum(${user.ph}) over (order by ${battles.createdAt}, ${battles.id} rows unbounded preceding)`.mapWith(
            Number,
          ),
        battleId: battles.id,
      })
      .from(battles)
      .innerJoinLateral(user, sql`true`)
      .leftJoinLateral(opponent, sql`true`)
      .where(where)
      .orderBy(asc(battles.createdAt), asc(battles.id));

    return rows.map((row) => ({ ...row, date: row.date.toISOString() }));
  });

  const getRatingGrowth = Effect.fnUntraced(function* (
    userId: string,
    query: BattleStatisticsQuery,
    characterIds: string[],
  ) {
    const { user, opponent, where } = source(
      userId,
      { ...query, matchmaking: true },
      characterIds,
      { rating: true, ratingDelta: true },
    );

    const rows = yield* db
      .select({
        date: battles.createdAt,
        ratingDelta: battles.ratingDelta,
        rating: battles.rating,
        battleId: battles.id,
      })
      .from(battles)
      .innerJoinLateral(user, sql`true`)
      .leftJoinLateral(opponent, sql`true`)
      .where(where)
      .orderBy(asc(battles.createdAt), asc(battles.id));

    return rows.map((row) => ({
      ...row,
      date: row.date.toISOString(),
      ratingDelta: row.ratingDelta ?? 0,
      rating: row.rating ?? 0,
    }));
  });

  const opponentRecords = (
    userId: string,
    query: BattleStatisticsQuery,
    characterIds: string[],
    ratingOnly = false,
  ) => {
    const { user, opponent, where } = source(userId, query, characterIds, {
      hasFlee: false,
      ratingDelta: ratingOnly,
    });

    const partition = sql`partition by ${opponent.originalId}`;

    const ranked = db
      .select({
        opponentId: sql<string>`${opponent.originalId}`.as("opponent_id"),
        userWarriorId: sql<string>`${user.id}`.as("user_warrior_id"),
        opponentWarriorId: sql<string>`${opponent.id}`.as(
          "opponent_warrior_id",
        ),
        lastBattleDate: battles.createdAt,
        lastBattleResult: sql<
          "won" | "lost"
        >`case when ${user.team} = ${battles.winningTeam} then 'won' else 'lost' end`.as(
          "battle_result",
        ),
        wins: sql<number>`count(*) filter (where ${user.team} = ${battles.winningTeam}) over (${partition})`
          .mapWith(Number)
          .as("wins"),
        losses:
          sql<number>`count(*) filter (where ${user.team} <> ${battles.winningTeam} and ${user.team} = ${battles.losingTeam}) over (${partition})`
            .mapWith(Number)
            .as("losses"),
        totalRatingDelta:
          sql<number>`coalesce(sum(${battles.ratingDelta}) over (${partition}), 0)`
            .mapWith(Number)
            .as("total_rating_delta"),
        battlesWithRating:
          sql<number>`count(*) filter (where ${battles.ratingDelta} <> 0) over (${partition})`
            .mapWith(Number)
            .as("battles_with_rating"),
        position:
          sql<number>`row_number() over (${partition} order by ${battles.createdAt} desc, ${battles.id} desc)`.as(
            "position",
          ),
      })
      .from(battles)
      .innerJoinLateral(user, sql`true`)
      .leftJoinLateral(opponent, sql`true`)
      .where(where)
      .as("opponent_records");

    // Keep window rows narrow. Only the latest record for each opponent needs
    // presentation data and packed statistics; resolve those by warrior PK.
    const latest = db
      .select()
      .from(ranked)
      .where(and(eq(ranked.position, 1), isNotNull(ranked.opponentId)))
      .as("latest_opponent_records");

    const latestUser = db
      .select(snapshotColumns)
      .from(battleWarriors)
      .where(eq(battleWarriors.id, latest.userWarriorId))
      .as("latest_user");

    const latestOpponent = db
      .select(snapshotColumns)
      .from(battleWarriors)
      .where(eq(battleWarriors.id, latest.opponentWarriorId))
      .as("latest_opponent");

    return db
      .select({
        opponentId: latest.opponentId,
        opponentName: latestOpponent.name,
        opponentIcon: latestOpponent.icon,
        opponentProf: latestOpponent.prof,
        opponentLvl: latestOpponent.lvl,
        lastBattleDate: latest.lastBattleDate,
        lastBattleResult: latest.lastBattleResult,
        wins: latest.wins,
        losses: latest.losses,
        totalRatingDelta: latest.totalRatingDelta,
        battlesWithRating: latest.battlesWithRating,
        position: latest.position,
        lastBattleUserWarrior: sql<
          HeadToHeadRecord["lastBattleUserWarrior"]
        >`jsonb_build_object('name', ${latestUser.name}, 'icon', ${latestUser.icon}, 'prof', ${latestUser.prof}, 'lvl', ${latestUser.lvl}, 'fireDamage', ${latestUser.fireDamage}, 'frostDamage', ${latestUser.frostDamage}, 'lightningDamage', ${latestUser.lightningDamage}, 'poisonDamageTaken', ${latestUser.poisonDamageTaken}, 'woundDamageTaken', ${latestUser.woundDamageTaken}, 'critWoundDamageTaken', ${latestUser.critWoundDamageTaken})`.as(
          "user_snapshot",
        ),
        lastBattleOpponentWarrior: sql<
          HeadToHeadRecord["lastBattleOpponentWarrior"]
        >`jsonb_build_object('name', ${latestOpponent.name}, 'icon', ${latestOpponent.icon}, 'prof', ${latestOpponent.prof}, 'lvl', ${latestOpponent.lvl}, 'fireDamage', ${latestOpponent.fireDamage}, 'frostDamage', ${latestOpponent.frostDamage}, 'lightningDamage', ${latestOpponent.lightningDamage}, 'poisonDamageTaken', ${latestOpponent.poisonDamageTaken}, 'woundDamageTaken', ${latestOpponent.woundDamageTaken}, 'critWoundDamageTaken', ${latestOpponent.critWoundDamageTaken})`.as(
          "opponent_snapshot",
        ),
      })
      .from(latest)
      .innerJoinLateral(latestUser, sql`true`)
      .innerJoinLateral(latestOpponent, sql`true`)
      .orderBy(desc(latest.lastBattleDate));
  };

  const getHeadToHead = Effect.fnUntraced(function* (
    userId: string,
    query: BattleStatisticsQuery,
    characterIds: string[],
  ) {
    const rows = yield* opponentRecords(userId, query, characterIds);

    const records = rows.map(
      ({ position: _position, battlesWithRating, ...row }) => ({
        ...row,
        totalBattles: row.wins + row.losses,
        winRate:
          row.wins + row.losses > 0
            ? (row.wins / (row.wins + row.losses)) * 100
            : 0,
        lastBattleDate: row.lastBattleDate.toISOString(),
        totalRatingDelta: query.matchmaking ? row.totalRatingDelta : undefined,
        avgRatingDelta: query.matchmaking
          ? battlesWithRating > 0
            ? Math.round((row.totalRatingDelta / battlesWithRating) * 100) / 100
            : 0
          : undefined,
      }),
    );

    return filterAndSortHeadToHeadRecords(records, query);
  });

  const getRatingByOpponent = Effect.fnUntraced(function* (
    userId: string,
    query: BattleStatisticsQuery,
    characterIds: string[],
  ) {
    const rows = yield* opponentRecords(
      userId,
      { ...query, matchmaking: true },
      characterIds,
      true,
    );

    return rows
      .map((row) => ({
        opponentId: row.opponentId,
        opponentName: row.opponentName,
        opponentIcon: row.opponentIcon,
        opponentProf: row.opponentProf,
        opponentLvl: row.opponentLvl,
        wins: row.wins,
        losses: row.losses,
        totalBattles: row.wins + row.losses,
        totalRatingDelta: row.totalRatingDelta,
        avgRatingDelta:
          row.battlesWithRating > 0
            ? Math.round((row.totalRatingDelta / row.battlesWithRating) * 100) /
              100
            : 0,
        lastBattleDate: row.lastBattleDate.toISOString(),
      }))
      .sort((left, right) => right.totalRatingDelta - left.totalRatingDelta);
  });

  const getSeasons = Effect.fnUntraced(function* (
    userId: string,
    characterIds: string[],
  ): Effect.fn.Return<AbyssSeason[], unknown> {
    // Season discovery intentionally spans all worlds and battle types for the selected characters.
    const { user, opponent, where } = source(
      userId,
      { matchmaking: true },
      characterIds,
      { allTypes: true },
    );

    const gaps = db
      .select({
        createdAt: battles.createdAt,
        id: battles.id,
        rating: battles.rating,
        pointsGained: battles.pointsGained,
        ratingDelta: battles.ratingDelta,
        isWin:
          sql<boolean>`not ${battles.hasFlee} and ${user.team} = ${battles.winningTeam}`.as(
            "is_win",
          ),
        isLoss:
          sql<boolean>`not ${battles.hasFlee} and ${user.team} <> ${battles.winningTeam} and ${user.team} = ${battles.losingTeam}`.as(
            "is_loss",
          ),
        startsSeason:
          sql<number>`case when ${battles.createdAt} - lag(${battles.createdAt}) over (order by ${battles.createdAt}, ${battles.id}) > interval '14 days' then 1 else 0 end`.as(
            "starts_season",
          ),
      })
      .from(battles)
      .innerJoinLateral(user, sql`true`)
      .leftJoinLateral(opponent, sql`true`)
      .where(where)
      .as("season_gaps");

    const grouped = db
      .select({
        createdAt: gaps.createdAt,
        id: gaps.id,
        rating: gaps.rating,
        pointsGained: gaps.pointsGained,
        ratingDelta: gaps.ratingDelta,
        isWin: gaps.isWin,
        isLoss: gaps.isLoss,
        season:
          sql<number>`sum(${gaps.startsSeason}) over (order by ${gaps.createdAt}, ${gaps.id} rows unbounded preceding)`.as(
            "season",
          ),
      })
      .from(gaps)
      .as("season_battles");

    const rows = yield* db
      .select({
        startedAt: sql<Date>`min(${grouped.createdAt})`.mapWith(
          battles.createdAt,
        ),
        endedAt: sql<Date>`max(${grouped.createdAt})`.mapWith(
          battles.createdAt,
        ),
        totalBattles: sql<number>`count(*)`.mapWith(Number),
        wins: sql<number>`count(*) filter (where ${grouped.isWin})`.mapWith(
          Number,
        ),
        losses: sql<number>`count(*) filter (where ${grouped.isLoss})`.mapWith(
          Number,
        ),
        totalRatingDelta:
          sql<number>`coalesce(sum(${grouped.ratingDelta}), 0)`.mapWith(Number),
        peakRating: sql<number | null>`max(${grouped.rating})`,
        totalPointsGained: sql<
          number | null
        >`sum(${grouped.pointsGained})`.mapWith((value) =>
          value === null ? null : Number(value),
        ),
      })
      .from(grouped)
      .groupBy(grouped.season)
      .orderBy(desc(sql`min(${grouped.createdAt})`));

    return rows.map((row) => ({
      ...row,
      id: `abyss-${row.startedAt.getTime()}-${row.endedAt.getTime()}`,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt.toISOString(),
      winRate:
        row.wins + row.losses > 0
          ? Math.round((row.wins / (row.wins + row.losses)) * 10000) / 100
          : 0,
    }));
  });

  const getPlayerVsPlayerCount = Effect.fnUntraced(function* (
    userId: string,
    query: PlayerVsPlayerQuery,
    characterIds: string[],
  ) {
    const { user, opponent, where } = source(userId, query, characterIds, {
      opponentId: query.opponentId,
      excludeBattleId: query.excludeBattleId,
      requireOpponent: true,
    });

    const [row] = yield* db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(battles)
      .innerJoinLateral(user, sql`true`)
      .leftJoinLateral(opponent, sql`true`)
      .where(where);

    return row?.total ?? 0;
  });

  const getPlayerVsPlayerPage = Effect.fnUntraced(function* (
    userId: string,
    query: PlayerVsPlayerQuery,
    characterIds: string[],
    page: { offset: number; size: number },
  ) {
    const { user, opponent, where } = source(userId, query, characterIds, {
      opponentId: query.opponentId,
      excludeBattleId: query.excludeBattleId,
      requireOpponent: true,
    });

    const selectedOpponent = db
      .select(snapshotColumns)
      .from(battleWarriors)
      .where(
        and(
          eq(battleWarriors.battleId, battles.id),
          eq(battleWarriors.originalId, query.opponentId),
        ),
      )
      .orderBy(asc(battleWarriors.id))
      .limit(1)
      .as("selected_opponent");

    const rows = yield* db
      .select({
        battleId: battles.id,
        createdAt: battles.createdAt,
        duration: battles.duration,
        winner: battles.winner,
        loser: battles.loser,
        hasFlee: battles.hasFlee,
        matchmaking: battles.matchmaking,
        ratingDelta: battles.ratingDelta,
        userRating: battles.rating,
        opponentRating: battles.opponentRating,
        userWarrior: {
          name: user.name,
          icon: user.icon,
          prof: user.prof,
          lvl: user.lvl,
          fireDamage: user.fireDamage,
          frostDamage: user.frostDamage,
          lightningDamage: user.lightningDamage,
          poisonDamageTaken: user.poisonDamageTaken,
          woundDamageTaken: user.woundDamageTaken,
          critWoundDamageTaken: user.critWoundDamageTaken,
        },
        opponentWarrior: {
          name: selectedOpponent.name,
          icon: selectedOpponent.icon,
          prof: selectedOpponent.prof,
          lvl: selectedOpponent.lvl,
          fireDamage: selectedOpponent.fireDamage,
          frostDamage: selectedOpponent.frostDamage,
          lightningDamage: selectedOpponent.lightningDamage,
          poisonDamageTaken: selectedOpponent.poisonDamageTaken,
          woundDamageTaken: selectedOpponent.woundDamageTaken,
          critWoundDamageTaken: selectedOpponent.critWoundDamageTaken,
        },
      })
      .from(battles)
      .innerJoinLateral(user, sql`true`)
      .leftJoinLateral(opponent, sql`true`)
      .where(where)
      .innerJoinLateral(selectedOpponent, sql`true`)
      .orderBy(desc(battles.createdAt), desc(battles.id))
      .limit(page.size)
      .offset(page.offset);

    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  });

  return {
    getDuration,
    getStreak,
    getPhGrowth,
    getRatingGrowth,
    getHeadToHead,
    getRatingByOpponent,
    getSeasons,
    getPlayerVsPlayerCount,
    getPlayerVsPlayerPage,
  };
};

export type BattleAnalyticsRead = ReturnType<typeof makeBattleAnalyticsRead>;
