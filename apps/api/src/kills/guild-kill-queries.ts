import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Effect, Schema } from "effect";
import type { ApplicationLogger } from "#src/shared/application-logger";
import {
  GuildKillStatsResponse,
  GuildTopKillersByTypeResponse,
  GuildTopNpcsResponse,
  NpcKillersResponse,
  type GuildKillStatsQuery as GetGuildKillStatsDto,
} from "#src/contracts/kills/schemas";

import type { KillStatsPersistence } from "./kill-stats-persistence.js";
import {
  buildKillQueryCacheKey,
  buildNpcLevelFilter,
  cachedKillQuery,
  type KillQueryCache,
  type KillQueryRole,
  readableRoles,
  visibilityCacheScope,
  visibilityFilter,
} from "./kill-query-support.js";
import {
  getKillStatsPeriodStart,
  type KillStatsPeriod,
} from "./kill-stats-period.js";

export class GuildKillQueriesError extends TaggedErrorClass<GuildKillQueriesError>()(
  "GuildKillQueriesError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeGuildKillQueries = (
  persistence: KillStatsPersistence,
  cache: KillQueryCache,
  logger: ApplicationLogger,
) => {
  const protect = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new GuildKillQueriesError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "kills", retryCount: 0 },
      }),
    );

  const context = (
    accessPolicy: AccessPolicy,
    roles: ReadonlyArray<KillQueryRole>,
  ) => {
    const visibleRoles = readableRoles(roles);
    return {
      filter: visibilityFilter(accessPolicy, visibleRoles),
      cacheScope: visibilityCacheScope(accessPolicy, visibleRoles),
    };
  };

  const getGuildKillStats = (
    guildId: string,
    accessPolicy: AccessPolicy,
    roles: ReadonlyArray<KillQueryRole>,
    query: GetGuildKillStatsDto,
  ) => {
    const visibility = context(accessPolicy, roles);
    const periodStart = getKillStatsPeriodStart(query.period);
    const filter = {
      guildId,
      ...(query.npcTypes && { npcType: { in: query.npcTypes } }),
      ...(query.world && { world: query.world }),
      ...buildNpcLevelFilter(query.minLvl, query.maxLvl),
      ...visibility.filter,
      ...(periodStart && { periodStart: { gte: periodStart } }),
    };

    return protect(
      "kills.guild-overview",
      cachedKillQuery({
        cache,
        logger,
        key: buildKillQueryCacheKey("guild-overview", guildId, {
          query,
          visibility: visibility.cacheScope,
        }),
        label: "guild kill stats",
        schema: GuildKillStatsResponse,
        load: Effect.gen(function* () {
          const [memberStats, guildSummary] = yield* Effect.all(
            [
              persistence.groupMemberStats(filter, periodStart !== undefined),
              persistence.groupGuildSummaries(
                filter,
                periodStart !== undefined,
              ),
            ],
            { concurrency: "unbounded" },
          );
          const members = yield* persistence.findMembers([
            ...new Set(memberStats.map((stat) => stat.memberId)),
          ]);
          const membersById = new Map(
            members.map((member) => [member.id, member] as const),
          );
          const killsByType: Record<string, number> = {};
          let guildUniqueKills = 0;
          for (const summary of guildSummary) {
            const uniqueKills = summary._sum.uniqueKills ?? 0;
            killsByType[summary.npcType] =
              (killsByType[summary.npcType] ?? 0) + uniqueKills;
            guildUniqueKills += uniqueKills;
          }

          const participationsByType: Record<string, number> = {};
          let totalMemberParticipations = 0;
          const ranking = new Map<
            number,
            {
              memberId: number;
              memberName: string;
              memberAvatar: string | null;
              memberUserId: string;
              totalParticipations: number;
              participationsByType: Record<string, number>;
            }
          >();
          for (const stat of memberStats) {
            const memberKills = stat._sum.memberKills ?? 0;
            participationsByType[stat.npcType] =
              (participationsByType[stat.npcType] ?? 0) + memberKills;
            totalMemberParticipations += memberKills;
            const existing = ranking.get(stat.memberId);
            if (existing) {
              existing.totalParticipations += memberKills;
              existing.participationsByType[stat.npcType] =
                (existing.participationsByType[stat.npcType] ?? 0) +
                memberKills;
              continue;
            }
            const member = membersById.get(stat.memberId);
            if (member) {
              ranking.set(stat.memberId, {
                memberId: stat.memberId,
                memberName: member.name,
                memberAvatar: member.avatar,
                memberUserId: member.userId,
                totalParticipations: memberKills,
                participationsByType: { [stat.npcType]: memberKills },
              });
            }
          }

          return {
            overview: {
              guildUniqueKills,
              totalMemberParticipations,
              killsByType,
              participationsByType,
            },
            memberRanking: Array.from(ranking.values()).sort(
              (left, right) =>
                right.totalParticipations - left.totalParticipations,
            ),
          };
        }),
      }),
    );
  };

  const getGuildTopNpcs = (
    guildId: string,
    accessPolicy: AccessPolicy,
    roles: ReadonlyArray<KillQueryRole>,
    limit = 10,
    npcType?: NpcType,
    world?: string,
    search?: string,
    minLvl?: number,
    maxLvl?: number,
    period?: KillStatsPeriod,
  ) => {
    const visibility = context(accessPolicy, roles);
    const periodStart = getKillStatsPeriodStart(period);
    return protect(
      "kills.guild-top-npcs",
      cachedKillQuery({
        cache,
        logger,
        key: buildKillQueryCacheKey("guild-top-npcs", guildId, {
          limit,
          maxLvl,
          minLvl,
          npcType,
          period,
          search,
          visibility: visibility.cacheScope,
          world,
        }),
        label: "guild top npcs",
        schema: GuildTopNpcsResponse,
        load: persistence
          .topGuildNpcs(
            {
              guildId,
              ...(npcType && { npcType }),
              ...(world && { world }),
              ...(search && {
                npcName: { contains: search, mode: "insensitive" as const },
              }),
              ...buildNpcLevelFilter(minLvl, maxLvl),
              ...visibility.filter,
              ...(periodStart && { periodStart: { gte: periodStart } }),
            },
            periodStart !== undefined,
            limit,
          )
          .pipe(Effect.map((topNpcs) => ({ topNpcs }))),
      }),
    );
  };

  const getGuildTopKillersByType = (
    guildId: string,
    accessPolicy: AccessPolicy,
    roles: ReadonlyArray<KillQueryRole>,
    npcTypes: ReadonlyArray<NpcType>,
    limit = 5,
    period?: KillStatsPeriod,
  ) => {
    const visibility = context(accessPolicy, roles);
    const periodStart = getKillStatsPeriodStart(period);
    return protect(
      "kills.guild-top-killers",
      cachedKillQuery({
        cache,
        logger,
        key: buildKillQueryCacheKey("guild-top-killers", guildId, {
          limit,
          npcTypes,
          period,
          visibility: visibility.cacheScope,
        }),
        label: "guild top killers",
        schema: GuildTopKillersByTypeResponse,
        load: persistence
          .topMembersByType(
            {
              guildId,
              npcType: { in: npcTypes },
              ...visibility.filter,
              ...(periodStart && { periodStart: { gte: periodStart } }),
            },
            periodStart !== undefined,
            limit,
          )
          .pipe(
            Effect.map((stats) =>
              Object.fromEntries(
                npcTypes.map((npcType) => [
                  npcType,
                  stats
                    .filter((stat) => stat.npcType === npcType)
                    .map(
                      ({ npcType: _type, rank: _rank, ...member }) => member,
                    ),
                ]),
              ),
            ),
          ),
      }),
    );
  };

  const getNpcKillers = (
    guildId: string,
    accessPolicy: AccessPolicy,
    roles: ReadonlyArray<KillQueryRole>,
    npcId: number,
    limit = 50,
    world?: string,
    period?: KillStatsPeriod,
  ) => {
    const visibility = context(accessPolicy, roles);
    const periodStart = getKillStatsPeriodStart(period);
    const filter = {
      guildId,
      npcId,
      ...(world && { world }),
      ...visibility.filter,
      ...(periodStart && { periodStart: { gte: periodStart } }),
    };
    return protect(
      "kills.guild-npc-killers",
      cachedKillQuery({
        cache,
        logger,
        key: buildKillQueryCacheKey("guild-npc-killers", guildId, {
          limit,
          npcId,
          period,
          visibility: visibility.cacheScope,
          world,
        }),
        label: "npc killers",
        schema: NpcKillersResponse,
        load: Effect.gen(function* () {
          const [killers, summaries, memberNpc] = yield* Effect.all(
            [
              persistence.topNpcKillers(
                filter,
                periodStart !== undefined,
                limit,
              ),
              persistence.topGuildNpcs(filter, periodStart !== undefined, 1),
              persistence.findMemberNpcMetadata(
                filter,
                periodStart !== undefined,
              ),
            ],
            { concurrency: "unbounded" },
          );
          const fallback =
            !memberNpc && summaries.length === 0
              ? yield* persistence.topGuildNpcs(
                  { guildId, npcId, ...visibility.filter },
                  false,
                  1,
                )
              : [];
          const summary = summaries[0] ?? fallback[0];
          const npc =
            memberNpc ??
            (summary
              ? {
                  npcId: summary.npcId,
                  npcName: summary.npcName,
                  npcType: summary.npcType,
                  npcLvl: summary.npcLvl,
                  npcProf: summary.npcProf,
                  npcIcon: summary.npcIcon,
                }
              : null);
          if (!npc) return null;
          return {
            npc: {
              ...npc,
              uniqueGuildKills: summaries[0]?.uniqueKills ?? 0,
              totalMemberParticipations:
                killers[0]?.totalMemberParticipations ?? 0,
            },
            killers: killers.map(
              ({ totalMemberParticipations: _total, ...member }) => member,
            ),
          };
        }),
      }),
    );
  };

  return {
    getGuildKillStats,
    getGuildTopNpcs,
    getGuildTopKillersByType,
    getNpcKillers,
  } as const;
};

export type GuildKillQueries = ReturnType<typeof makeGuildKillQueries>;
