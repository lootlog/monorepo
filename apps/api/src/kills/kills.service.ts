import {
  Injectable,
  Inject,
  type OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import Redlock, { ExecutionError } from 'redlock';
import { PrismaService } from 'src/db/prisma.service';
import { RedisService } from 'src/lib/redis/redis.service';
import { getNpcTypeByWt } from 'src/shared/utils/get-npc-type-by-wt';
import { getProfByShortname } from 'src/shared/utils/get-prof-by-shortname';
import type { CreateKillDto } from './dto/create-kill.dto';
import type {
  GetGuildKillStatsDto,
  GetPlayerKillStatsDto,
} from './dto/get-kill-stats.dto';
import { NpcType, Prisma } from 'generated/client';

const DEDUP_WINDOW_SECONDS = 30;
const DEDUP_TTL_SECONDS = 60;
const LOCK_TTL_MS = 10000;

@Injectable()
export class KillsService implements OnModuleInit {
  private redlock: Redlock;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    const client = await this.redis.getClient();
    this.redlock = new Redlock([client], {
      driftFactor: 0.01,
      retryCount: 3,
      retryDelay: 100,
      retryJitter: 50,
      automaticExtensionThreshold: 5000,
    });
  }

  private getWindowId(timestamp: number = Date.now()): number {
    return Math.floor(timestamp / (DEDUP_WINDOW_SECONDS * 1000));
  }

  private getDedupKey(world: string, npcId: number, windowId: number): string {
    return `kill:dedup:${world}:${npcId}:${windowId}`;
  }

  private getLockKey(world: string, npcId: number, windowId: number): string {
    return `kill:lock:${world}:${npcId}:${windowId}`;
  }

  async createKillForGuild(
    discordId: string,
    guildId: string,
    data: CreateKillDto,
  ) {
    const now = Date.now();
    const windowId = this.getWindowId(now);
    const npcId = Math.abs(data.npc.id);
    const npcType = getNpcTypeByWt(data.npc.wt, data.npc.prof, data.npc.type);

    const dedupKey = this.getDedupKey(data.world, npcId, windowId);
    const lockKey = this.getLockKey(data.world, npcId, windowId);

    let existingKillId = await this.redis.get(dedupKey);
    let isNewKill = false;
    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      if (!existingKillId) {
        lock = await this.redlock.acquire([lockKey], LOCK_TTL_MS);

        existingKillId = await this.redis.get(dedupKey);

        if (!existingKillId) {
          const kill = await this.prisma.kill.create({
            data: {
              world: data.world,
              npcId,
              npcName: data.npc.name,
              npcType,
              npcLvl: data.npc.lvl,
              npcIcon: data.npc.icon,
            },
          });

          existingKillId = kill.id;
          isNewKill = true;

          await this.redis.set(dedupKey, existingKillId, DEDUP_TTL_SECONDS);

          this.logger.log({
            level: 'debug',
            message: `Created new kill ${existingKillId} for NPC ${npcId} in world ${data.world}`,
          });
        }
      }

      const characterProf = data.characterProf
        ? getProfByShortname(data.characterProf)
        : undefined;

      await this.prisma.killParticipant.upsert({
        where: {
          killId_characterId: {
            killId: existingKillId,
            characterId: Number.parseInt(data.characterId, 10),
          },
        },
        create: {
          killId: existingKillId,
          accountId: Number.parseInt(data.accountId, 10),
          characterId: Number.parseInt(data.characterId, 10),
          characterName: data.characterName,
          characterLvl: data.characterLvl,
          characterProf,
          characterIcon: data.characterIcon,
          world: data.world,
        },
        update: {},
      });

      const member = await this.prisma.member.findUnique({
        where: { memberId: { userId: discordId, guildId } },
      });

      if (!member) {
        throw new BadRequestException({ message: 'Member not found in guild' });
      }

      const guildKill = await this.prisma.guildKill.upsert({
        where: {
          killId_guildId: {
            killId: existingKillId,
            guildId,
          },
        },
        create: {
          killId: existingKillId,
          guildId,
          memberId: member.id,
        },
        update: {},
      });

      this.updateAggregatedStatsAsync(
        existingKillId,
        discordId,
        guildId,
        member.id,
        Number.parseInt(data.accountId, 10),
        Number.parseInt(data.characterId, 10),
        data.world,
        npcType,
      );

      return {
        killId: existingKillId,
        isNewKill,
        guildKillId: guildKill.id,
      };
    } catch (error) {
      if (error instanceof ExecutionError) {
        this.logger.log({
          level: 'error',
          message: 'Lock acquisition failed for createKillForGuild',
          world: data.world,
          npcId,
        });
        throw new BadRequestException({
          message: 'Kill creation in progress, please retry',
        });
      }
      throw error;
    } finally {
      await lock?.release();
    }
  }

  private async updateAggregatedStatsAsync(
    killId: string,
    userId: string,
    guildId: string,
    memberId: number,
    accountId: number,
    characterId: number,
    world: string,
    npcType: NpcType,
  ) {
    try {
      await Promise.all([
        this.prisma.playerKillStats.upsert({
          where: {
            userId_accountId_characterId_world_npcType: {
              userId,
              accountId,
              characterId,
              world,
              npcType,
            },
          },
          create: {
            userId,
            accountId,
            characterId,
            world,
            npcType,
            totalKills: 1,
          },
          update: {
            totalKills: { increment: 1 },
          },
        }),

        this.prisma.guildMemberKillStats.upsert({
          where: {
            guildId_memberId_npcType: {
              guildId,
              memberId,
              npcType,
            },
          },
          create: {
            guildId,
            memberId,
            npcType,
            totalKills: 1,
          },
          update: {
            totalKills: { increment: 1 },
          },
        }),

        this.prisma.guildKillStats.upsert({
          where: {
            guildId_npcType: {
              guildId,
              npcType,
            },
          },
          create: {
            guildId,
            npcType,
            totalKills: 1,
          },
          update: {
            totalKills: { increment: 1 },
          },
        }),
      ]);

      this.logger.log({
        level: 'debug',
        message: `Updated aggregated stats for kill ${killId}`,
      });
    } catch (error) {
      this.logger.error({
        level: 'error',
        message: 'Failed to update aggregated stats',
        error: error instanceof Error ? error.message : error,
        killId,
      });
    }
  }

  async getGuildKillStats(guildId: string, query: GetGuildKillStatsDto) {
    const npcTypes = query.parseNpcTypes();
    const recentKillsLimit = query.recentKillsLimit ?? 20;

    const whereConditions: Prisma.GuildKillWhereInput = {
      guildId,
      kill: {
        ...(npcTypes && { npcType: { in: npcTypes } }),
        ...(query.minLvl !== undefined && { npcLvl: { gte: query.minLvl } }),
        ...(query.maxLvl !== undefined && { npcLvl: { lte: query.maxLvl } }),
      },
    };

    const [guildStats, memberStats, recentGuildKills] = await Promise.all([
      this.prisma.guildKillStats.findMany({
        where: {
          guildId,
          ...(npcTypes && { npcType: { in: npcTypes } }),
        },
      }),

      this.prisma.guildMemberKillStats.findMany({
        where: {
          guildId,
          ...(npcTypes && { npcType: { in: npcTypes } }),
        },
        include: {
          member: true,
        },
      }),

      this.prisma.guildKill.findMany({
        where: whereConditions,
        include: {
          kill: {
            include: {
              participants: true,
            },
          },
          member: true,
        },
        orderBy: {
          kill: {
            killedAt: 'desc',
          },
        },
        take: recentKillsLimit,
      }),
    ]);

    const killsByType: Record<string, number> = {};
    let totalKills = 0;

    for (const stat of guildStats) {
      killsByType[stat.npcType] = stat.totalKills;
      totalKills += stat.totalKills;
    }

    const memberRankingMap = new Map<
      number,
      {
        memberId: number;
        memberName: string;
        totalKills: number;
        killsByType: Record<string, number>;
      }
    >();

    for (const stat of memberStats) {
      const existing = memberRankingMap.get(stat.memberId);
      if (existing) {
        existing.totalKills += stat.totalKills;
        existing.killsByType[stat.npcType] = stat.totalKills;
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

    const recentKills = recentGuildKills.map((gk) => ({
      killId: gk.kill.id,
      npcName: gk.kill.npcName,
      npcType: gk.kill.npcType,
      npcLvl: gk.kill.npcLvl,
      npcIcon: gk.kill.npcIcon,
      killedAt: gk.kill.killedAt,
      participants: gk.kill.participants.map((p) => ({
        characterName: p.characterName,
        characterLvl: p.characterLvl,
        characterProf: p.characterProf,
      })),
    }));

    return {
      overview: {
        totalKills,
        killsByType,
      },
      memberRanking,
      recentKills,
    };
  }

  async getPlayerKillStats(discordId: string, query: GetPlayerKillStatsDto) {
    const npcTypes = query.parseNpcTypes();

    const playerStats = await this.prisma.playerKillStats.findMany({
      where: {
        userId: discordId,
        ...(query.world && { world: query.world }),
        ...(npcTypes && { npcType: { in: npcTypes } }),
      },
    });

    if (playerStats.length === 0) {
      return {
        overview: {
          totalKills: 0,
          killsByType: {},
          killsByWorld: {},
        },
        characters: [],
      };
    }

    const killsByType: Record<string, number> = {};
    const killsByWorld: Record<string, number> = {};
    let totalKills = 0;

    const characterStatsMap = new Map<
      string,
      {
        characterId: number;
        totalKills: number;
        killsByType: Record<string, number>;
      }
    >();

    for (const stat of playerStats) {
      const key = `${stat.accountId}-${stat.characterId}`;

      killsByType[stat.npcType] =
        (killsByType[stat.npcType] ?? 0) + stat.totalKills;
      killsByWorld[stat.world] =
        (killsByWorld[stat.world] ?? 0) + stat.totalKills;
      totalKills += stat.totalKills;

      const existing = characterStatsMap.get(key);
      if (existing) {
        existing.totalKills += stat.totalKills;
        existing.killsByType[stat.npcType] =
          (existing.killsByType[stat.npcType] ?? 0) + stat.totalKills;
      } else {
        characterStatsMap.set(key, {
          characterId: stat.characterId,
          totalKills: stat.totalKills,
          killsByType: { [stat.npcType]: stat.totalKills },
        });
      }
    }

    const characterStats = Array.from(characterStatsMap.values()).sort(
      (a, b) => b.totalKills - a.totalKills,
    );

    return {
      overview: {
        totalKills,
        killsByType,
        killsByWorld,
      },
      characters: characterStats,
    };
  }
}
