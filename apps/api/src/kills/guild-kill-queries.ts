import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Effect, Schema } from "effect";
import type { ApplicationLogger } from "#src/shared/logging/application-logger";
import type { GetGuildKillStatsDto } from "./dto/get-kill-stats.dto.js";
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
} from "./utils/kill-stats-period.js";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class GuildKillQueriesError extends Schema.TaggedError<GuildKillQueriesError>()(
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
        load: persistence
          .findGuildSummaries(
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
          )
          .pipe(
            Effect.map((summaries) => {
              const npcs = new Map<
                number,
                {
                  npcId: number;
                  npcName: string;
                  npcType: string;
                  npcLvl: number;
                  npcProf: string | null;
                  npcIcon: string | null;
                  uniqueKills: number;
                }
              >();
              for (const summary of summaries) {
                const existing = npcs.get(summary.npcId);
                if (existing) {
                  existing.uniqueKills += summary.uniqueKills;
                  if (summary.npcLvl > existing.npcLvl) {
                    existing.npcLvl = summary.npcLvl;
                    existing.npcName = summary.npcName;
                    existing.npcProf = summary.npcProf;
                    existing.npcIcon = summary.npcIcon;
                  }
                } else {
                  npcs.set(summary.npcId, {
                    npcId: summary.npcId,
                    npcName: summary.npcName,
                    npcType: summary.npcType,
                    npcLvl: summary.npcLvl,
                    npcProf: summary.npcProf,
                    npcIcon: summary.npcIcon,
                    uniqueKills: summary.uniqueKills,
                  });
                }
              }
              return {
                topNpcs: Array.from(npcs.values())
                  .sort((left, right) => right.uniqueKills - left.uniqueKills)
                  .slice(0, limit),
              };
            }),
          ),
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
        load: persistence
          .findMemberStats(
            {
              guildId,
              npcType: { in: npcTypes },
              ...visibility.filter,
              ...(periodStart && { periodStart: { gte: periodStart } }),
            },
            periodStart !== undefined,
            true,
          )
          .pipe(
            Effect.map((stats) => {
              const result: Record<
                string,
                Array<{
                  memberId: number;
                  memberName: string;
                  memberAvatar: string | null;
                  memberUserId: string;
                  totalParticipations: number;
                }>
              > = {};
              for (const npcType of npcTypes) {
                const members = new Map<
                  number,
                  {
                    memberId: number;
                    memberName: string;
                    memberAvatar: string | null;
                    memberUserId: string;
                    totalParticipations: number;
                  }
                >();
                for (const stat of stats) {
                  if (stat.npcType !== npcType) continue;
                  const existing = members.get(stat.memberId);
                  if (existing) {
                    existing.totalParticipations += stat.memberKills;
                  } else {
                    members.set(stat.memberId, {
                      memberId: stat.memberId,
                      memberName: stat.member.name,
                      memberAvatar: stat.member.avatar,
                      memberUserId: stat.member.userId,
                      totalParticipations: stat.memberKills,
                    });
                  }
                }
                result[npcType] = Array.from(members.values())
                  .sort(
                    (left, right) =>
                      right.totalParticipations - left.totalParticipations,
                  )
                  .slice(0, limit);
              }
              return result;
            }),
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
        load: Effect.gen(function* () {
          const [stats, summaries] = yield* Effect.all(
            [
              persistence.findMemberStats(
                filter,
                periodStart !== undefined,
                true,
              ),
              persistence.findGuildSummaries(filter, periodStart !== undefined),
            ],
            { concurrency: "unbounded" },
          );
          const metadata =
            stats.length === 0 && summaries.length === 0
              ? yield* persistence.findGuildSummaries(
                  { guildId, npcId, ...visibility.filter },
                  false,
                )
              : [];
          if (
            stats.length === 0 &&
            summaries.length === 0 &&
            metadata.length === 0
          ) {
            return null;
          }

          const members = new Map<
            number,
            {
              memberId: number;
              memberName: string;
              memberAvatar: string | null;
              memberUserId: string;
              participationCount: number;
            }
          >();
          let totalMemberParticipations = 0;
          let npcInfo: {
            npcId: number;
            npcName: string;
            npcType: string;
            npcLvl: number;
            npcProf: string | null;
            npcIcon: string | null;
          } | null = null;
          for (const stat of stats) {
            totalMemberParticipations += stat.memberKills;
            if (!npcInfo || stat.npcLvl > npcInfo.npcLvl) {
              npcInfo = {
                npcId: stat.npcId,
                npcName: stat.npcName,
                npcType: stat.npcType,
                npcLvl: stat.npcLvl,
                npcProf: stat.npcProf,
                npcIcon: stat.npcIcon,
              };
            }
            const existing = members.get(stat.memberId);
            if (existing) {
              existing.participationCount += stat.memberKills;
            } else {
              members.set(stat.memberId, {
                memberId: stat.memberId,
                memberName: stat.member.name,
                memberAvatar: stat.member.avatar,
                memberUserId: stat.member.userId,
                participationCount: stat.memberKills,
              });
            }
          }
          const metadataSource = summaries.length > 0 ? summaries : metadata;
          if (!npcInfo && metadataSource.length > 0) {
            const summary = metadataSource.reduce((highest, current) =>
              current.npcLvl > highest.npcLvl ? current : highest,
            );
            npcInfo = {
              npcId: summary.npcId,
              npcName: summary.npcName,
              npcType: summary.npcType,
              npcLvl: summary.npcLvl,
              npcProf: summary.npcProf,
              npcIcon: summary.npcIcon,
            };
          }
          if (!npcInfo) return null;
          return {
            npc: {
              ...npcInfo,
              uniqueGuildKills: summaries.reduce(
                (total, summary) => total + summary.uniqueKills,
                0,
              ),
              totalMemberParticipations,
            },
            killers: Array.from(members.values())
              .sort(
                (left, right) =>
                  right.participationCount - left.participationCount,
              )
              .slice(0, limit),
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
