import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { Permission, NpcType, type Role } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';
import { isAdministrativeUser } from 'src/shared/permissions/is-administrative-user';
import { getNpcTypeByWt } from 'src/shared/utils/get-npc-type-by-wt';
import type { CreateKillDto } from './dto/create-kill.dto';
import type {
  GetGuildKillStatsDto,
  GetUserKillStatsDto,
} from './dto/get-kill-stats.dto';
import type { GetUserNpcKillsDto } from './dto/get-user-npc-kills.dto';

@Injectable()
export class KillsService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly userLootlogConfigService: UserLootlogConfigService,
  ) {}

  async createKill(discordId: string, data: CreateKillDto) {
    const npcType = getNpcTypeByWt(data.npc.wt, data.npc.prof, data.npc.type);
    const npcId = Math.abs(data.npc.id);
    const characterId = Number.parseInt(data.characterId, 10);
    const accountId = Number.parseInt(data.accountId, 10);

    // ALWAYS save to UserKillStats for personal stats
    try {
      await this.prisma.userKillStats.upsert({
        where: {
          userId_characterId_world_npcId: {
            userId: discordId,
            characterId,
            world: data.world,
            npcId,
          },
        },
        create: {
          userId: discordId,
          characterId,
          accountId,
          characterName: data.characterName,
          characterLvl: data.characterLvl,
          characterProf: data.characterProf,
          characterIcon: data.characterIcon,
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
          characterName: data.characterName,
          characterLvl: data.characterLvl,
          characterProf: data.characterProf,
          characterIcon: data.characterIcon,
          npcName: data.npc.name,
          npcLvl: data.npc.lvl,
          npcProf: data.npc.prof,
          npcIcon: data.npc.icon,
        },
      });
    } catch (error) {
      this.logger.error({
        level: 'error',
        message: 'Failed to upsert user kill stats',
        error: error instanceof Error ? error.message : error,
      });
    }

    // Also save to NpcKillStats for each guild (if any)
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

    const results = await Promise.all(
      Array.from(targetGuildIds).map(async (guildId) => {
        const member = await this.prisma.member.findUnique({
          where: { memberId: { userId: discordId, guildId } },
        });

        if (!member) {
          this.logger.log({
            level: 'debug',
            message: `Member not found for guildId ${guildId}, skipping kill stats`,
          });
          return null;
        }

        try {
          return await this.prisma.npcKillStats.upsert({
            where: {
              guildId_memberId_characterId_world_npcId: {
                guildId,
                memberId: member.id,
                characterId,
                world: data.world,
                npcId,
              },
            },
            create: {
              guildId,
              memberId: member.id,
              userId: discordId,
              characterId,
              accountId,
              characterName: data.characterName,
              characterLvl: data.characterLvl,
              characterProf: data.characterProf,
              characterIcon: data.characterIcon,
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
              characterName: data.characterName,
              characterLvl: data.characterLvl,
              characterProf: data.characterProf,
              characterIcon: data.characterIcon,
              npcName: data.npc.name,
              npcLvl: data.npc.lvl,
              npcProf: data.npc.prof,
              npcIcon: data.npc.icon,
            },
          });
        } catch (error) {
          this.logger.error({
            level: 'error',
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
    const npcTypes = query.parseNpcTypes();
    const filteredRoles = roles.filter((role) =>
      role.permissions.includes(Permission.LOOTLOG_LOOTS_READ),
    );
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

    const stats = await this.prisma.npcKillStats.findMany({
      where: {
        guildId,
        ...(npcTypes && { npcType: { in: npcTypes } }),
        ...npcLvlCondition,
        ...visibilityCondition,
      },
      include: {
        member: true,
      },
    });

    const killsByType: Record<string, number> = {};
    let totalKills = 0;

    const memberRankingMap = new Map<
      number,
      {
        memberId: number;
        memberName: string;
        totalKills: number;
        killsByType: Record<string, number>;
      }
    >();

    for (const stat of stats) {
      killsByType[stat.npcType] =
        (killsByType[stat.npcType] ?? 0) + stat.totalKills;
      totalKills += stat.totalKills;

      const existing = memberRankingMap.get(stat.memberId);
      if (existing) {
        existing.totalKills += stat.totalKills;
        existing.killsByType[stat.npcType] =
          (existing.killsByType[stat.npcType] ?? 0) + stat.totalKills;
      } else {
        memberRankingMap.set(stat.memberId, {
          memberId: stat.memberId,
          memberName: stat.member.name,
          totalKills: stat.totalKills,
          killsByType: { [stat.npcType]: stat.totalKills },
        });
      }
    }

    const memberRanking = Array.from(memberRankingMap.values()).sort(
      (a, b) => b.totalKills - a.totalKills,
    );

    return {
      overview: {
        totalKills,
        killsByType,
      },
      memberRanking,
    };
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

    andConditions.push({
      OR: [
        { npcLvl: { gte: lvlFrom } },
        ...(lvlFrom <= 0 ? [{ npcLvl: null }] : []),
      ],
    });

    andConditions.push({
      OR: [
        { npcLvl: { lte: lvlTo } },
        ...(lvlTo >= 0 ? [{ npcLvl: null }] : []),
      ],
    });

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

    if (andConditions.length === 0) {
      return null;
    }

    return {
      AND: andConditions,
    };
  }

  async getUserKillStats(discordId: string, query: GetUserKillStatsDto) {
    const npcTypes = query.parseNpcTypes();

    // Query from UserKillStats - no deduplication needed since it's already per-user
    const stats = await this.prisma.userKillStats.findMany({
      where: {
        userId: discordId,
        ...(query.characterId !== undefined && {
          characterId: query.characterId,
        }),
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

    // Group by character
    const characterMap = new Map<
      number,
      {
        characterId: number;
        characterName: string;
        characterLvl: number;
        characterProf: string | null;
        characterIcon: string | null;
        totalKills: number;
        killsByType: Record<string, number>;
      }
    >();

    for (const stat of stats) {
      const existing = characterMap.get(stat.characterId);
      if (existing) {
        existing.totalKills += stat.totalKills;
        existing.killsByType[stat.npcType] =
          (existing.killsByType[stat.npcType] ?? 0) + stat.totalKills;
        // Update character data if this record is more recent (higher level)
        if (stat.characterLvl > existing.characterLvl) {
          existing.characterName = stat.characterName;
          existing.characterLvl = stat.characterLvl;
          existing.characterProf = stat.characterProf;
          existing.characterIcon = stat.characterIcon;
        }
      } else {
        characterMap.set(stat.characterId, {
          characterId: stat.characterId,
          characterName: stat.characterName,
          characterLvl: stat.characterLvl,
          characterProf: stat.characterProf,
          characterIcon: stat.characterIcon,
          totalKills: stat.totalKills,
          killsByType: { [stat.npcType]: stat.totalKills },
        });
      }
    }

    const characters = Array.from(characterMap.values()).sort(
      (a, b) => b.totalKills - a.totalKills,
    );

    // Get top NPCs (aggregate across all characters)
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
      characters,
      topNpcs,
    };
  }

  async getUserNpcKills(discordId: string, query: GetUserNpcKillsDto) {
    const npcTypes = query.parseNpcTypes();
    const limit = query.limit ?? 20;
    const cursor = query.cursor ?? 0;

    const whereCondition = {
      userId: discordId,
      ...(query.characterId !== undefined && {
        characterId: query.characterId,
      }),
      ...(query.world && { world: query.world }),
      ...(npcTypes && npcTypes.length > 0 && { npcType: { in: npcTypes } }),
      ...(query.search && {
        npcName: { contains: query.search, mode: 'insensitive' as const },
      }),
    };

    const stats = await this.prisma.userKillStats.findMany({
      where: whereCondition,
    });

    // Aggregate by npcId (combine across characters/worlds if no specific filter)
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

    const allNpcs = Array.from(npcMap.values()).sort((a, b) =>
      query.sortOrder === 'asc'
        ? a.totalKills - b.totalKills
        : b.totalKills - a.totalKills,
    );

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
}
