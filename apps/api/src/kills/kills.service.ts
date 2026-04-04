import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { getNpcTypeByWt } from "@lootlog/types";
import { Permission, NpcType, type Role } from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import { RedisService } from "@lootlog/nest-shared";
import { UserLootlogConfigService } from "src/user-lootlog-config/user-lootlog-config.service";
import { isAdministrativeUser } from "src/shared/permissions/is-administrative-user";
import { getStableNpcId } from "src/shared/utils/get-stable-npc-id";
import type { CreateKillDto } from "./dto/create-kill.dto";
import type {
  GetGuildKillStatsDto,
  GetUserKillStatsDto,
} from "./dto/get-kill-stats.dto";
import type { GetUserNpcKillsDto } from "./dto/get-user-npc-kills.dto";
import type { GetMemberKillsDto } from "./dto/get-member-kills.dto";
import {
  buildGuildKillDedupKey,
  buildUserKillDedupKey,
} from "./utils/kill-dedup-key";

const KILL_DEDUP_TTL_SECONDS = 30;

@Injectable()
export class KillsService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly userLootlogConfigService: UserLootlogConfigService,
  ) {}

  async createKill(discordId: string, data: CreateKillDto) {
    const npcType = getNpcTypeByWt(NpcType, data.npc.wt, data.npc.prof);
    const npcId = getStableNpcId(data.npc.id, data.npc.name, npcType);

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
      await this.prisma.userKillStats.upsert({
        where: {
          userId_world_npcId: {
            userId: discordId,
            world: data.world,
            npcId,
          },
        },
        create: {
          userId: discordId,
          world: data.world,
          npcId,
          npcName: data.npc.name,
          npcType,
          npcLvl: data.npc.lvl,
          npcProf: data.npc.prof,
          npcIcon: data.npc.icon,
          totalKills: 1,
        },
        update: {
          totalKills: { increment: 1 },
          lastKilledAt: new Date(),
          npcName: data.npc.name,
          npcLvl: data.npc.lvl,
          npcProf: data.npc.prof,
          npcIcon: data.npc.icon,
        },
      });
    } catch (error) {
      this.logger.error({
        level: "error",
        message: "Failed to upsert user kill stats",
        error: error instanceof Error ? error.message : error,
      });
    }

    // 3. Get guild config for this character
    const config =
      await this.userLootlogConfigService.getLootlogCharacterConfig(
        discordId,
        data.accountId,
        data.characterId,
      );

    const targetGuildIds = new Set([
      ...(config?.collectLootWhitelistGuildIds ?? []),
      ...(config?.addTimersWhitelistGuildIds ?? []),
    ]);

    if (targetGuildIds.size === 0) {
      return { updated: 0 };
    }

    // 4. Batch-fetch members for all target guilds (single query)
    const guildIdArray = Array.from(targetGuildIds);
    const members = await this.prisma.member.findMany({
      where: { userId: discordId, guildId: { in: guildIdArray } },
    });
    const membersByGuild = new Map(members.map((m) => [m.guildId, m]));

    // 5. Process each guild
    const results = await Promise.all(
      guildIdArray.map(async (guildId) => {
        const member = membersByGuild.get(guildId);

        if (!member) {
          this.logger.log({
            level: "debug",
            message: `Member not found for guildId ${guildId}, skipping kill stats`,
          });
          return null;
        }

        try {
          // 4a. Always increment member participation (memberKills)
          await this.prisma.npcKillStats.upsert({
            where: {
              guildId_memberId_world_npcId: {
                guildId,
                memberId: member.id,
                world: data.world,
                npcId,
              },
            },
            create: {
              guildId,
              memberId: member.id,
              userId: discordId,
              world: data.world,
              npcId,
              npcName: data.npc.name,
              npcType,
              npcLvl: data.npc.lvl,
              npcProf: data.npc.prof,
              npcIcon: data.npc.icon,
              memberKills: 1,
            },
            update: {
              memberKills: { increment: 1 },
              lastKilledAt: new Date(),
              npcName: data.npc.name,
              npcLvl: data.npc.lvl,
              npcProf: data.npc.prof,
              npcIcon: data.npc.icon,
            },
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
            await this.prisma.guildKillSummary.upsert({
              where: {
                guildId_world_npcId: {
                  guildId,
                  world: data.world,
                  npcId,
                },
              },
              create: {
                guildId,
                world: data.world,
                npcId,
                npcName: data.npc.name,
                npcType,
                npcLvl: data.npc.lvl,
                npcProf: data.npc.prof,
                npcIcon: data.npc.icon,
                uniqueKills: 1,
              },
              update: {
                uniqueKills: { increment: 1 },
                lastKilledAt: new Date(),
                npcName: data.npc.name,
                npcLvl: data.npc.lvl,
                npcProf: data.npc.prof,
                npcIcon: data.npc.icon,
              },
            });
          }

          return { guildId, isFirstGuildKill };
        } catch (error) {
          this.logger.error({
            level: "error",
            message: `Failed to upsert kill stats for guildId ${guildId}`,
            error: error instanceof Error ? error.message : error,
          });
          return null;
        }
      }),
    );

    const updated = results.filter(Boolean).length;

    return { updated };
  }

  async getGuildKillStats(
    guildId: string,
    permissions: Permission[],
    roles: Role[],
    query: GetGuildKillStatsDto,
  ) {
    const npcTypes = query.npcTypes;
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = isAdministrativeUser(permissions);

    const visibilityCondition = this.buildVisibilityCondition(
      filteredRoles,
      administrativeUser,
    );

    const npcLvlCondition =
      query.minLvl !== undefined || query.maxLvl !== undefined
        ? {
            npcLvl: {
              ...(query.minLvl !== undefined && { gte: query.minLvl }),
              ...(query.maxLvl !== undefined && { lte: query.maxLvl }),
            },
          }
        : {};

    // Fetch member participation stats
    const memberStats = await this.prisma.npcKillStats.findMany({
      where: {
        guildId,
        ...(npcTypes && { npcType: { in: npcTypes } }),
        ...(query.world && { world: query.world }),
        ...npcLvlCondition,
        ...visibilityCondition,
      },
      include: {
        member: true,
      },
    });

    // Fetch unique guild kills
    const guildSummary = await this.prisma.guildKillSummary.findMany({
      where: {
        guildId,
        ...(npcTypes && { npcType: { in: npcTypes } }),
        ...(query.world && { world: query.world }),
        ...npcLvlCondition,
        ...visibilityCondition,
      },
    });

    // Calculate unique kills from GuildKillSummary
    const uniqueKillsByType: Record<string, number> = {};
    let guildUniqueKills = 0;

    for (const summary of guildSummary) {
      uniqueKillsByType[summary.npcType] =
        (uniqueKillsByType[summary.npcType] ?? 0) + summary.uniqueKills;
      guildUniqueKills += summary.uniqueKills;
    }

    // Calculate member participations from NpcKillStats
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
      participationsByType[stat.npcType] =
        (participationsByType[stat.npcType] ?? 0) + stat.memberKills;
      totalMemberParticipations += stat.memberKills;

      const existing = memberRankingMap.get(stat.memberId);
      if (existing) {
        existing.totalParticipations += stat.memberKills;
        existing.participationsByType[stat.npcType] =
          (existing.participationsByType[stat.npcType] ?? 0) + stat.memberKills;
      } else {
        memberRankingMap.set(stat.memberId, {
          memberId: stat.memberId,
          memberName: stat.member.name,
          memberAvatar: stat.member.avatar,
          memberUserId: stat.member.userId,
          totalParticipations: stat.memberKills,
          participationsByType: { [stat.npcType]: stat.memberKills },
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

    const lvlFrom = role.lvlRangeFrom ?? 0;
    const lvlTo = role.lvlRangeTo ?? 500;

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

  async getUserKillStats(discordId: string, query: GetUserKillStatsDto) {
    const npcTypes = query.npcType
      ? [query.npcType, ...(query.npcTypes ?? [])]
      : query.npcTypes;

    // Query from UserKillStats - now aggregated per user (no character distinction)
    const stats = await this.prisma.userKillStats.findMany({
      where: {
        userId: discordId,
        ...(query.world && { world: query.world }),
        ...(npcTypes && npcTypes.length > 0 && { npcType: { in: npcTypes } }),
      },
    });

    // Calculate overview
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

    // Get top NPCs
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
  }

  async getUserNpcKills(discordId: string, query: GetUserNpcKillsDto) {
    const npcTypes = query.npcTypes;
    const limit = query.limit ?? 20;
    const cursor = query.cursor ?? 0;

    const whereCondition = {
      userId: discordId,
      ...(query.world && { world: query.world }),
      ...(npcTypes && npcTypes.length > 0 && { npcType: { in: npcTypes } }),
      ...(query.search && {
        npcName: { contains: query.search, mode: "insensitive" as const },
      }),
      ...((query.minLvl !== undefined || query.maxLvl !== undefined) && {
        npcLvl: {
          ...(query.minLvl !== undefined && { gte: query.minLvl }),
          ...(query.maxLvl !== undefined && { lte: query.maxLvl }),
        },
      }),
    };

    const stats = await this.prisma.userKillStats.findMany({
      where: whereCondition,
    });

    // Aggregate by npcId (combine across worlds if no specific filter)
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
        // Keep the highest level version of the NPC
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
  }

  async getGuildTopNpcs(
    guildId: string,
    permissions: Permission[],
    roles: Role[],
    limit: number = 10,
    npcType?: NpcType,
    world?: string,
    search?: string,
    minLvl?: number,
    maxLvl?: number,
  ) {
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = isAdministrativeUser(permissions);

    const visibilityCondition = this.buildVisibilityCondition(
      filteredRoles,
      administrativeUser,
    );

    const npcLvlCondition =
      minLvl !== undefined || maxLvl !== undefined
        ? {
            npcLvl: {
              ...(minLvl !== undefined && { gte: minLvl }),
              ...(maxLvl !== undefined && { lte: maxLvl }),
            },
          }
        : {};

    // Use GuildKillSummary for unique kills count
    const summaries = await this.prisma.guildKillSummary.findMany({
      where: {
        guildId,
        ...(npcType && { npcType }),
        ...(world && { world }),
        ...(search && {
          npcName: { contains: search, mode: "insensitive" as const },
        }),
        ...npcLvlCondition,
        ...visibilityCondition,
      },
    });

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
  }

  async getGuildTopKillersByType(
    guildId: string,
    permissions: Permission[],
    roles: Role[],
    npcTypes: NpcType[],
    limit: number = 5,
  ) {
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = isAdministrativeUser(permissions);

    const visibilityCondition = this.buildVisibilityCondition(
      filteredRoles,
      administrativeUser,
    );

    const stats = await this.prisma.npcKillStats.findMany({
      where: {
        guildId,
        npcType: { in: npcTypes },
        ...visibilityCondition,
      },
      include: {
        member: true,
      },
    });

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
  }

  async getNpcKillers(
    guildId: string,
    permissions: Permission[],
    roles: Role[],
    npcId: number,
    limit: number = 50,
    world?: string,
  ) {
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = isAdministrativeUser(permissions);

    const visibilityCondition = this.buildVisibilityCondition(
      filteredRoles,
      administrativeUser,
    );

    // Get member participation stats
    const stats = await this.prisma.npcKillStats.findMany({
      where: {
        guildId,
        npcId,
        ...(world && { world }),
        ...visibilityCondition,
      },
      include: {
        member: true,
      },
    });

    // Get unique kills from summary
    const summary = await this.prisma.guildKillSummary.findFirst({
      where: {
        guildId,
        npcId,
        ...(world && { world }),
        ...visibilityCondition,
      },
    });

    if (stats.length === 0 && !summary) {
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

    // Fallback to summary if no member stats
    if (!npcInfo && summary) {
      npcInfo = {
        npcId: summary.npcId,
        npcName: summary.npcName,
        npcType: summary.npcType,
        npcLvl: summary.npcLvl,
        npcProf: summary.npcProf,
        npcIcon: summary.npcIcon,
      };
    }

    const killers = Array.from(memberMap.values())
      .sort((a, b) => b.participationCount - a.participationCount)
      .slice(0, limit);

    return {
      npc: {
        ...npcInfo!,
        uniqueGuildKills: summary?.uniqueKills ?? 0,
        totalMemberParticipations,
      },
      killers,
    };
  }

  async getMemberKills(
    guildId: string,
    memberId: number,
    permissions: Permission[],
    roles: Role[],
    query: GetMemberKillsDto,
  ) {
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = isAdministrativeUser(permissions);

    const visibilityCondition = this.buildVisibilityCondition(
      filteredRoles,
      administrativeUser,
    );

    const npcTypes = query.npcTypes;
    const limit = query.limit ?? 20;
    const cursor = query.cursor ?? 0;

    // Get the member info first
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        guildId,
      },
    });

    if (!member) {
      return null;
    }

    const npcLvlCondition =
      query.minLvl !== undefined || query.maxLvl !== undefined
        ? {
            npcLvl: {
              ...(query.minLvl !== undefined && { gte: query.minLvl }),
              ...(query.maxLvl !== undefined && { lte: query.maxLvl }),
            },
          }
        : {};

    // Get all kill stats for this member with visibility conditions
    const stats = await this.prisma.npcKillStats.findMany({
      where: {
        guildId,
        memberId,
        ...(npcTypes && npcTypes.length > 0 && { npcType: { in: npcTypes } }),
        ...(query.world && { world: query.world }),
        ...(query.search && {
          npcName: { contains: query.search, mode: "insensitive" as const },
        }),
        ...npcLvlCondition,
        ...visibilityCondition,
      },
    });

    // Calculate overview
    const participationsByType: Record<string, number> = {};
    let totalParticipations = 0;

    // Aggregate NPCs by npcId
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
        // Keep the highest level version of the NPC
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

    // Sort by kills descending and paginate
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
  }
}
