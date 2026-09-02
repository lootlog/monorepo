import { Capability, type AccessPolicy } from "@lootlog/domain/access-policy";
import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";
import { RedisService } from "@lootlog/nest-shared/redis";
import { UserLootlogConfigService } from "#src/user-lootlog-config/user-lootlog-config.service";
import { getStableNpcId } from "#src/shared/utils/get-stable-npc-id";
import { GuildsService } from "#src/guilds/guilds.service";
import type { CreateKillDto } from "./dto/create-kill.dto.js";
import type {
  GetGuildKillStatsDto,
  GetUserKillStatsDto,
} from "./dto/get-kill-stats.dto.js";
import type { GetUserNpcKillsDto } from "./dto/get-user-npc-kills.dto.js";
import type { GetMemberKillsDto } from "./dto/get-member-kills.dto.js";
import {
  buildGuildKillDedupKey,
  buildUserKillDedupKey,
} from "./utils/kill-dedup-key.js";
import {
  getKillStatsBucketStart,
  getKillStatsPeriodStart,
  type KillStatsPeriod,
} from "./utils/kill-stats-period.js";
import { KillsRepository } from "./kills.repository.js";

type Role = typeof roleTable.$inferSelect;

const KILL_DEDUP_TTL_SECONDS = 30;
const KILL_STATS_CACHE_TTL_SECONDS = 30;
const KILL_STATS_CACHE_PREFIX = "kill-stats";

const buildNpcLvlCondition = (minLvl?: number, maxLvl?: number) => {
  const normalizedMinLvl = minLvl && minLvl > 0 ? minLvl : undefined;
  const normalizedMaxLvl = maxLvl && maxLvl > 0 ? maxLvl : undefined;

  if (normalizedMinLvl === undefined && normalizedMaxLvl === undefined) {
    return {};
  }

  return {
    npcLvl: {
      ...(normalizedMinLvl !== undefined && { gte: normalizedMinLvl }),
      ...(normalizedMaxLvl !== undefined && { lte: normalizedMaxLvl }),
    },
  };
};

@Injectable()
export class KillsService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly repository: KillsRepository,
    private readonly redis: RedisService,
    private readonly userLootlogConfigService: UserLootlogConfigService,
    private readonly guildsService: GuildsService,
  ) {}

  private buildKillStatsCacheKey(
    scope: string,
    ownerId: string,
    params: Record<string, unknown>,
  ) {
    const encodedParams = Buffer.from(this.stableSerialize(params)).toString(
      "base64url",
    );
    return `${KILL_STATS_CACHE_PREFIX}:${scope}:${ownerId}:${encodedParams}`;
  }

  private stableSerialize(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => this.stableSerialize(entry)).join(",")}]`;
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

      return `{${entries
        .map(
          ([key, entry]) =>
            `${JSON.stringify(key)}:${this.stableSerialize(entry)}`,
        )
        .join(",")}}`;
    }

    return JSON.stringify(value);
  }

  private buildVisibilityCacheScope(
    administrativeUser: boolean,
    roles: Role[],
  ) {
    if (administrativeUser) {
      return { administrativeUser: true };
    }

    return {
      administrativeUser: false,
      roles: roles
        .map((role) => ({
          id: role.id,
          lvlRangeFrom: role.lvlRangeFrom,
          lvlRangeTo: role.lvlRangeTo,
          permissions: [...role.permissions].sort(),
        }))
        .sort((leftRole, rightRole) => leftRole.id.localeCompare(rightRole.id)),
    };
  }

  private async deleteKillStatsCacheByPattern(pattern: string) {
    try {
      await this.redis.deleteByPattern(pattern);
    } catch (error) {
      this.logger.warn("Failed to invalidate kill stats cache", {
        error,
        pattern,
      });
    }
  }

  private async invalidateKillStatsCaches(options: {
    userId?: string;
    guildIds?: string[];
  }) {
    const patterns: string[] = [];

    if (options.userId) {
      patterns.push(`${KILL_STATS_CACHE_PREFIX}:user-*:${options.userId}:*`);
    }

    for (const guildId of new Set(options.guildIds ?? [])) {
      patterns.push(`${KILL_STATS_CACHE_PREFIX}:guild-*:${guildId}:*`);
      patterns.push(`${KILL_STATS_CACHE_PREFIX}:member-kills:${guildId}:*`);
    }

    await Promise.all(
      patterns.map((pattern) => this.deleteKillStatsCacheByPattern(pattern)),
    );
  }

  private async getCachedKillStats<T>(
    cacheKey: string,
    label: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.redis.getJson<T>(cacheKey);

    if (cached !== null) {
      this.logger.log({
        level: "debug",
        message: `Cache hit for ${label}`,
        cacheKey,
      });
      return cached;
    }

    this.logger.log({
      level: "debug",
      message: `Cache miss for ${label}`,
      cacheKey,
    });

    return this.redis.getOrSetJson({
      key: cacheKey,
      ttlSeconds: KILL_STATS_CACHE_TTL_SECONDS,
      factory,
    });
  }

  async createKill(discordId: string, data: CreateKillDto) {
    const npcType = getNpcTypeByWt(NpcType, data.npc.wt, data.npc.prof);
    const npcId = getStableNpcId(data.npc.id, data.npc.name, npcType);
    const killedAt = new Date();
    const periodStart = getKillStatsBucketStart(killedAt);
    const killInput = {
      userId: discordId,
      world: data.world,
      npcId,
      npcName: data.npc.name,
      npcType,
      npcLvl: data.npc.lvl,
      npcProf: data.npc.prof ?? null,
      npcIcon: data.npc.icon ?? null,
      lastKilledAt: killedAt,
    };
    let userStatsUpdated = false;

    // 1. User deduplication (30s window) - same user killing same NPC
    const userDedupKey = buildUserKillDedupKey(discordId, {
      world: data.world,
      npcId,
    });
    const isNewUserKill = await this.redis.setNX(
      userDedupKey,
      "1",
      KILL_DEDUP_TTL_SECONDS,
    );

    if (!isNewUserKill) {
      return { deduplicated: true, updated: 0 };
    }

    // 2. Save to UserKillStats for personal stats
    try {
      await this.repository.incrementUser(killInput);
      userStatsUpdated = true;
      await this.repository.incrementUserBucket({ ...killInput, periodStart });
    } catch (error) {
      this.logger.error({
        message: "Failed to upsert user kill stats",
        error: error instanceof Error ? error.message : error,
      });
    }

    // 3. Get guild config for this character
    const guildContextPromise = Promise.all([
      this.userLootlogConfigService.getLootlogCharacterConfig(
        discordId,
        data.accountId,
        data.characterId,
      ),
      this.guildsService.getGuildsForRequiredPermissions(discordId, [
        Permission.LOOTLOG_LOOTS_WRITE,
      ]),
    ]);

    if (userStatsUpdated) {
      await Promise.all([
        this.invalidateKillStatsCaches({ userId: discordId }),
        guildContextPromise,
      ]);
    }

    const [config, writableGuilds] = await guildContextPromise;

    const writableGuildIds = new Set(writableGuilds.map((guild) => guild.id));
    const targetGuildIds = new Set(config?.catchingGuildIds ?? []);
    const guildIdArray = Array.from(targetGuildIds).filter((guildId) =>
      writableGuildIds.has(guildId),
    );

    if (guildIdArray.length === 0) {
      return { updated: 0 };
    }

    // 4. Batch-fetch members for all target guilds (single query)
    const members = await this.repository.findMembersByGuilds(
      discordId,
      guildIdArray,
    );
    const membersByGuild = new Map(members.map((m) => [m.guildId, m]));

    // 5. Process each guild
    const results = await Promise.all(
      guildIdArray.map(async (guildId) => {
        const member = membersByGuild.get(guildId);
        let guildStatsUpdated = false;

        if (!member) {
          this.logger.log({
            level: "debug",
            message: `Member not found for guildId ${guildId}, skipping kill stats`,
          });
          return null;
        }

        try {
          // 4a. Always increment member participation (memberKills)
          const memberKillInput = {
            ...killInput,
            guildId,
            memberId: member.id,
          };
          await this.repository.incrementMember(memberKillInput);
          guildStatsUpdated = true;
          await this.repository.incrementMemberBucket({
            ...memberKillInput,
            periodStart,
          });

          // 4b. Guild unique kill deduplication (30s window)
          const guildDedupKey = buildGuildKillDedupKey(guildId, {
            world: data.world,
            npcId,
          });
          const isFirstGuildKill = await this.redis.setNX(
            guildDedupKey,
            "1",
            KILL_DEDUP_TTL_SECONDS,
          );

          if (isFirstGuildKill) {
            // First guild member to report this kill - increment unique kills
            const guildKillInput = { ...killInput, guildId };
            await this.repository.incrementGuild(guildKillInput);
            guildStatsUpdated = true;
            await this.repository.incrementGuildBucket({
              ...guildKillInput,
              periodStart,
            });
          }

          return { guildId, shouldInvalidate: true, succeeded: true };
        } catch (error) {
          this.logger.error({
            message: `Failed to upsert kill stats for guildId ${guildId}`,
            error: error instanceof Error ? error.message : error,
          });
          return guildStatsUpdated
            ? { guildId, shouldInvalidate: true, succeeded: false }
            : null;
        }
      }),
    );

    const updatedGuildIds = results
      .filter(
        (
          result,
        ): result is {
          guildId: string;
          shouldInvalidate: true;
          succeeded: boolean;
        } => result?.shouldInvalidate === true,
      )
      .map((result) => result.guildId);
    await this.invalidateKillStatsCaches({ guildIds: updatedGuildIds });

    const updated = results.filter((result) => result?.succeeded).length;

    return { updated };
  }

  getGuildKillStats(
    guildId: string,
    accessPolicy: AccessPolicy,
    roles: Role[],
    query: GetGuildKillStatsDto,
  ) {
    const npcTypes = query.npcTypes;
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = accessPolicy.allows(Capability.ADMIN);

    const visibilityCondition = this.buildVisibilityCondition(
      filteredRoles,
      administrativeUser,
    );

    const npcLvlCondition = buildNpcLvlCondition(query.minLvl, query.maxLvl);
    const periodStart = getKillStatsPeriodStart(query.period);
    const memberStatsWhere = {
      guildId,
      ...(npcTypes && { npcType: { in: npcTypes } }),
      ...(query.world && { world: query.world }),
      ...npcLvlCondition,
      ...visibilityCondition,
    };

    const guildSummaryWhere = {
      guildId,
      ...(npcTypes && { npcType: { in: npcTypes } }),
      ...(query.world && { world: query.world }),
      ...npcLvlCondition,
      ...visibilityCondition,
    };

    const cacheKey = this.buildKillStatsCacheKey("guild-overview", guildId, {
      query,
      visibility: this.buildVisibilityCacheScope(
        administrativeUser,
        filteredRoles,
      ),
    });

    return this.getCachedKillStats(cacheKey, "guild kill stats", async () => {
      const [memberStats, guildSummary] = await Promise.all([
        this.repository.groupMemberStats(
          {
            ...memberStatsWhere,
            ...(periodStart && { periodStart: { gte: periodStart } }),
          },
          periodStart !== undefined,
        ),
        this.repository.groupGuildSummaries(
          {
            ...guildSummaryWhere,
            ...(periodStart && { periodStart: { gte: periodStart } }),
          },
          periodStart !== undefined,
        ),
      ]);

      const memberIds = [...new Set(memberStats.map((stat) => stat.memberId))];
      const members =
        memberIds.length > 0
          ? await this.repository.findMembers(memberIds)
          : [];
      const membersById = new Map(members.map((member) => [member.id, member]));

      const uniqueKillsByType: Record<string, number> = {};
      let guildUniqueKills = 0;

      for (const summary of guildSummary) {
        const uniqueKills = summary._sum.uniqueKills ?? 0;
        uniqueKillsByType[summary.npcType] =
          (uniqueKillsByType[summary.npcType] ?? 0) + uniqueKills;
        guildUniqueKills += uniqueKills;
      }

      const participationsByType: Record<string, number> = {};
      let totalMemberParticipations = 0;

      const memberRankingMap = new Map<
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

        const existing = memberRankingMap.get(stat.memberId);
        if (existing) {
          existing.totalParticipations += memberKills;
          existing.participationsByType[stat.npcType] =
            (existing.participationsByType[stat.npcType] ?? 0) + memberKills;
        } else {
          const member = membersById.get(stat.memberId);
          if (!member) {
            continue;
          }

          memberRankingMap.set(stat.memberId, {
            memberId: stat.memberId,
            memberName: member.name,
            memberAvatar: member.avatar,
            memberUserId: member.userId,
            totalParticipations: memberKills,
            participationsByType: { [stat.npcType]: memberKills },
          });
        }
      }

      const memberRanking = Array.from(memberRankingMap.values()).sort(
        (a, b) => b.totalParticipations - a.totalParticipations,
      );

      return {
        overview: {
          guildUniqueKills,
          totalMemberParticipations,
          killsByType: uniqueKillsByType,
          participationsByType,
        },
        memberRanking,
      };
    });
  }

  private filterReadableRoles(roles: Role[]): Role[] {
    return roles.filter((role) =>
      role.permissions.includes(Permission.LOOTLOG_LOOTS_READ),
    );
  }

  private buildVisibilityCondition(
    roles: Role[],
    administrativeUser: boolean,
  ): Record<string, unknown> {
    if (administrativeUser || roles.length === 0) {
      return {};
    }

    const orConditions: Record<string, unknown>[] = [];

    for (const role of roles) {
      const roleCondition = this.buildRoleVisibilityCondition(role);
      if (roleCondition) {
        orConditions.push(roleCondition);
      }
    }

    if (orConditions.length === 0) {
      return {};
    }

    return {
      OR: orConditions,
    };
  }

  private buildRoleVisibilityCondition(
    role: Role,
  ): Record<string, unknown> | null {
    const hasReadTitans = role.permissions?.includes(
      Permission.LOOTLOG_LOOTS_TITANS_READ,
    );
    const hasReadHeroes = role.permissions?.includes(
      Permission.LOOTLOG_LOOTS_HEROES_READ,
    );

    const lvlFrom = Number(role.lvlRangeFrom ?? 0);
    const lvlTo = Number(role.lvlRangeTo ?? 500);

    const andConditions: Record<string, unknown>[] = [];

    andConditions.push({ npcLvl: { gte: lvlFrom } });
    andConditions.push({ npcLvl: { lte: lvlTo } });

    if (!hasReadTitans) {
      andConditions.push({
        npcType: {
          not: NpcType.TITAN,
        },
      });
    }

    if (!hasReadHeroes) {
      andConditions.push({
        npcType: {
          notIn: [NpcType.HERO, NpcType.EVENT_HERO],
        },
      });
    }

    return {
      AND: andConditions,
    };
  }

  getUserKillStats(discordId: string, query: GetUserKillStatsDto) {
    const npcTypes = query.npcType
      ? [query.npcType, ...(query.npcTypes ?? [])]
      : query.npcTypes;
    const periodStart = getKillStatsPeriodStart(query.period);
    const statsWhere = {
      userId: discordId,
      ...(query.world && { world: query.world }),
      ...(npcTypes && npcTypes.length > 0 && { npcType: { in: npcTypes } }),
    };

    const cacheKey = this.buildKillStatsCacheKey("user-overview", discordId, {
      query: { ...query, npcTypes },
    });

    return this.getCachedKillStats(cacheKey, "user kill stats", async () => {
      const stats = await this.repository.findUserStats(
        {
          ...statsWhere,
          ...(periodStart && { periodStart: { gte: periodStart } }),
        },
        periodStart !== undefined,
      );

      const killsByType: Record<string, number> = {};
      const killsByWorld: Record<string, number> = {};
      let totalKills = 0;

      for (const stat of stats) {
        killsByType[stat.npcType] =
          (killsByType[stat.npcType] ?? 0) + stat.totalKills;
        killsByWorld[stat.world] =
          (killsByWorld[stat.world] ?? 0) + stat.totalKills;
        totalKills += stat.totalKills;
      }

      const npcMap = new Map<
        string,
        {
          npcId: number;
          npcName: string;
          npcType: string;
          npcLvl: number;
          npcProf: string | null;
          npcIcon: string | null;
          totalKills: number;
        }
      >();

      for (const stat of stats) {
        const key = `${stat.world}:${stat.npcId}`;
        const existing = npcMap.get(key);
        if (existing) {
          existing.totalKills += stat.totalKills;
        } else {
          npcMap.set(key, {
            npcId: stat.npcId,
            npcName: stat.npcName,
            npcType: stat.npcType,
            npcLvl: stat.npcLvl,
            npcProf: stat.npcProf,
            npcIcon: stat.npcIcon,
            totalKills: stat.totalKills,
          });
        }
      }

      const topNpcs = Array.from(npcMap.values())
        .sort((a, b) => b.totalKills - a.totalKills)
        .slice(0, query.topNpcsLimit ?? 5);

      return {
        overview: {
          totalKills,
          killsByType,
          killsByWorld,
        },
        topNpcs,
      };
    });
  }

  getUserNpcKills(discordId: string, query: GetUserNpcKillsDto) {
    const npcTypes = query.npcTypes;
    const limit = query.limit ?? 20;
    const cursor = query.cursor ?? 0;
    const periodStart = getKillStatsPeriodStart(query.period);

    const whereCondition = {
      userId: discordId,
      ...(query.world && { world: query.world }),
      ...(npcTypes && npcTypes.length > 0 && { npcType: { in: npcTypes } }),
      ...(query.search && {
        npcName: { contains: query.search, mode: "insensitive" as const },
      }),
      ...buildNpcLvlCondition(query.minLvl, query.maxLvl),
    };

    const cacheKey = this.buildKillStatsCacheKey("user-npcs", discordId, {
      query,
    });

    return this.getCachedKillStats(cacheKey, "user npc kills", async () => {
      const stats = await this.repository.findUserStats(
        {
          ...whereCondition,
          ...(periodStart && { periodStart: { gte: periodStart } }),
        },
        periodStart !== undefined,
      );

      const npcMap = new Map<
        number,
        {
          npcId: number;
          npcName: string;
          npcType: string;
          npcLvl: number;
          npcProf: string | null;
          npcIcon: string | null;
          totalKills: number;
        }
      >();

      for (const stat of stats) {
        const existing = npcMap.get(stat.npcId);
        if (existing) {
          existing.totalKills += stat.totalKills;
          if (stat.npcLvl > existing.npcLvl) {
            existing.npcLvl = stat.npcLvl;
            existing.npcName = stat.npcName;
            existing.npcProf = stat.npcProf;
            existing.npcIcon = stat.npcIcon;
          }
        } else {
          npcMap.set(stat.npcId, {
            npcId: stat.npcId,
            npcName: stat.npcName,
            npcType: stat.npcType,
            npcLvl: stat.npcLvl,
            npcProf: stat.npcProf,
            npcIcon: stat.npcIcon,
            totalKills: stat.totalKills,
          });
        }
      }

      const sortBy = query.sortBy ?? "kills";
      const sortAsc = query.sortOrder === "asc";

      const allNpcs = Array.from(npcMap.values()).sort((a, b) => {
        if (sortBy === "level") {
          return sortAsc ? a.npcLvl - b.npcLvl : b.npcLvl - a.npcLvl;
        }
        return sortAsc
          ? a.totalKills - b.totalKills
          : b.totalKills - a.totalKills;
      });

      const total = allNpcs.length;
      const paginatedNpcs = allNpcs.slice(cursor, cursor + limit);
      const hasNext = cursor + limit < total;

      return {
        npcs: paginatedNpcs,
        pagination: {
          total,
          cursor,
          limit,
          hasNext,
        },
      };
    });
  }

  getGuildTopNpcs(
    guildId: string,
    accessPolicy: AccessPolicy,
    roles: Role[],
    limit: number = 10,
    npcType?: NpcType,
    world?: string,
    search?: string,
    minLvl?: number,
    maxLvl?: number,
    period?: KillStatsPeriod,
  ) {
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = accessPolicy.allows(Capability.ADMIN);

    const visibilityCondition = this.buildVisibilityCondition(
      filteredRoles,
      administrativeUser,
    );

    const npcLvlCondition = buildNpcLvlCondition(minLvl, maxLvl);
    const periodStart = getKillStatsPeriodStart(period);
    const summariesWhere = {
      guildId,
      ...(npcType && { npcType }),
      ...(world && { world }),
      ...(search && {
        npcName: { contains: search, mode: "insensitive" as const },
      }),
      ...npcLvlCondition,
      ...visibilityCondition,
    };

    const cacheKey = this.buildKillStatsCacheKey("guild-top-npcs", guildId, {
      limit,
      maxLvl,
      minLvl,
      npcType,
      period,
      search,
      visibility: this.buildVisibilityCacheScope(
        administrativeUser,
        filteredRoles,
      ),
      world,
    });

    return this.getCachedKillStats(cacheKey, "guild top npcs", async () => {
      const summaries = await this.repository.findGuildSummaries(
        {
          ...summariesWhere,
          ...(periodStart && { periodStart: { gte: periodStart } }),
        },
        periodStart !== undefined,
      );

      const npcMap = new Map<
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
        const existing = npcMap.get(summary.npcId);
        if (existing) {
          existing.uniqueKills += summary.uniqueKills;
          if (summary.npcLvl > existing.npcLvl) {
            existing.npcLvl = summary.npcLvl;
            existing.npcName = summary.npcName;
            existing.npcProf = summary.npcProf;
            existing.npcIcon = summary.npcIcon;
          }
        } else {
          npcMap.set(summary.npcId, {
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

      const topNpcs = Array.from(npcMap.values())
        .sort((a, b) => b.uniqueKills - a.uniqueKills)
        .slice(0, limit);

      return { topNpcs };
    });
  }

  getGuildTopKillersByType(
    guildId: string,
    accessPolicy: AccessPolicy,
    roles: Role[],
    npcTypes: NpcType[],
    limit: number = 5,
    period?: KillStatsPeriod,
  ) {
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = accessPolicy.allows(Capability.ADMIN);

    const visibilityCondition = this.buildVisibilityCondition(
      filteredRoles,
      administrativeUser,
    );
    const periodStart = getKillStatsPeriodStart(period);
    const statsWhere = {
      guildId,
      npcType: { in: npcTypes },
      ...visibilityCondition,
    };

    const cacheKey = this.buildKillStatsCacheKey("guild-top-killers", guildId, {
      limit,
      npcTypes,
      period,
      visibility: this.buildVisibilityCacheScope(
        administrativeUser,
        filteredRoles,
      ),
    });

    return this.getCachedKillStats(cacheKey, "guild top killers", async () => {
      const stats = await this.repository.findMemberStats(
        {
          ...statsWhere,
          ...(periodStart && { periodStart: { gte: periodStart } }),
        },
        periodStart !== undefined,
        true,
      );

      const resultByType: Record<
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
        const memberMap = new Map<
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

          const existing = memberMap.get(stat.memberId);
          if (existing) {
            existing.totalParticipations += stat.memberKills;
          } else {
            memberMap.set(stat.memberId, {
              memberId: stat.memberId,
              memberName: stat.member.name,
              memberAvatar: stat.member.avatar,
              memberUserId: stat.member.userId,
              totalParticipations: stat.memberKills,
            });
          }
        }

        resultByType[npcType] = Array.from(memberMap.values())
          .sort((a, b) => b.totalParticipations - a.totalParticipations)
          .slice(0, limit);
      }

      return resultByType;
    });
  }

  getNpcKillers(
    guildId: string,
    accessPolicy: AccessPolicy,
    roles: Role[],
    npcId: number,
    limit: number = 50,
    world?: string,
    period?: KillStatsPeriod,
  ) {
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = accessPolicy.allows(Capability.ADMIN);

    const visibilityCondition = this.buildVisibilityCondition(
      filteredRoles,
      administrativeUser,
    );
    const periodStart = getKillStatsPeriodStart(period);
    const statsWhere = {
      guildId,
      npcId,
      ...(world && { world }),
      ...visibilityCondition,
    };

    const summaryWhere = {
      guildId,
      npcId,
      ...(world && { world }),
      ...visibilityCondition,
    };

    const cacheKey = this.buildKillStatsCacheKey("guild-npc-killers", guildId, {
      limit,
      npcId,
      period,
      visibility: this.buildVisibilityCacheScope(
        administrativeUser,
        filteredRoles,
      ),
      world,
    });

    return this.getCachedKillStats(cacheKey, "npc killers", async () => {
      const stats = await this.repository.findMemberStats(
        {
          ...statsWhere,
          ...(periodStart && { periodStart: { gte: periodStart } }),
        },
        periodStart !== undefined,
        true,
      );

      const summaries = await this.repository.findGuildSummaries(
        {
          ...summaryWhere,
          ...(periodStart && { periodStart: { gte: periodStart } }),
        },
        periodStart !== undefined,
      );

      const metadataSummaries =
        stats.length === 0 && summaries.length === 0
          ? await this.repository.findGuildSummaries(
              { guildId, npcId, ...visibilityCondition },
              false,
            )
          : [];

      if (
        stats.length === 0 &&
        summaries.length === 0 &&
        metadataSummaries.length === 0
      ) {
        return null;
      }

      const memberMap = new Map<
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

        const existing = memberMap.get(stat.memberId);
        if (existing) {
          existing.participationCount += stat.memberKills;
        } else {
          memberMap.set(stat.memberId, {
            memberId: stat.memberId,
            memberName: stat.member.name,
            memberAvatar: stat.member.avatar,
            memberUserId: stat.member.userId,
            participationCount: stat.memberKills,
          });
        }
      }

      const npcInfoSummaries =
        summaries.length > 0 ? summaries : metadataSummaries;
      if (!npcInfo && npcInfoSummaries.length > 0) {
        const summary = npcInfoSummaries.reduce((highest, current) =>
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

      if (!npcInfo) {
        return null;
      }

      const killers = Array.from(memberMap.values())
        .sort((a, b) => b.participationCount - a.participationCount)
        .slice(0, limit);

      return {
        npc: {
          ...npcInfo,
          uniqueGuildKills: summaries.reduce(
            (total, summary) => total + summary.uniqueKills,
            0,
          ),
          totalMemberParticipations,
        },
        killers,
      };
    });
  }

  getMemberKills(
    guildId: string,
    memberId: number,
    accessPolicy: AccessPolicy,
    roles: Role[],
    query: GetMemberKillsDto,
  ) {
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = accessPolicy.allows(Capability.ADMIN);

    const visibilityCondition = this.buildVisibilityCondition(
      filteredRoles,
      administrativeUser,
    );

    const npcTypes = query.npcTypes;
    const limit = query.limit ?? 20;
    const cursor = query.cursor ?? 0;
    const periodStart = getKillStatsPeriodStart(query.period);

    const npcLvlCondition = buildNpcLvlCondition(query.minLvl, query.maxLvl);
    const statsWhere = {
      guildId,
      memberId,
      ...(npcTypes && npcTypes.length > 0 && { npcType: { in: npcTypes } }),
      ...(query.world && { world: query.world }),
      ...(query.search && {
        npcName: { contains: query.search, mode: "insensitive" as const },
      }),
      ...npcLvlCondition,
      ...visibilityCondition,
    };

    const cacheKey = this.buildKillStatsCacheKey("member-kills", guildId, {
      memberId,
      query,
      visibility: this.buildVisibilityCacheScope(
        administrativeUser,
        filteredRoles,
      ),
    });

    return this.getCachedKillStats(cacheKey, "member kills", async () => {
      const member = await this.repository.findMember(guildId, memberId);

      if (!member) {
        return null;
      }

      const stats = await this.repository.findMemberStats(
        {
          ...statsWhere,
          ...(periodStart && { periodStart: { gte: periodStart } }),
        },
        periodStart !== undefined,
      );

      const participationsByType: Record<string, number> = {};
      let totalParticipations = 0;

      const npcMap = new Map<
        number,
        {
          npcId: number;
          npcName: string;
          npcType: string;
          npcLvl: number;
          npcProf: string | null;
          npcIcon: string | null;
          totalKills: number;
        }
      >();

      for (const stat of stats) {
        participationsByType[stat.npcType] =
          (participationsByType[stat.npcType] ?? 0) + stat.memberKills;
        totalParticipations += stat.memberKills;

        const existing = npcMap.get(stat.npcId);
        if (existing) {
          existing.totalKills += stat.memberKills;
          if (stat.npcLvl > existing.npcLvl) {
            existing.npcLvl = stat.npcLvl;
            existing.npcName = stat.npcName;
            existing.npcProf = stat.npcProf;
            existing.npcIcon = stat.npcIcon;
          }
        } else {
          npcMap.set(stat.npcId, {
            npcId: stat.npcId,
            npcName: stat.npcName,
            npcType: stat.npcType,
            npcLvl: stat.npcLvl,
            npcProf: stat.npcProf,
            npcIcon: stat.npcIcon,
            totalKills: stat.memberKills,
          });
        }
      }

      const allNpcs = Array.from(npcMap.values()).sort(
        (a, b) => b.totalKills - a.totalKills,
      );

      const total = allNpcs.length;
      const paginatedNpcs = allNpcs.slice(cursor, cursor + limit);
      const hasNext = cursor + limit < total;

      return {
        member: {
          memberId: member.id,
          memberName: member.name,
          memberAvatar: member.avatar,
          memberUserId: member.userId,
        },
        overview: {
          totalParticipations,
          participationsByType,
        },
        npcs: paginatedNpcs,
        pagination: {
          total,
          cursor,
          limit,
          hasNext,
        },
      };
    });
  }
}
