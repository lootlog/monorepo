import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import Redlock, { ExecutionError } from "redlock";
import { CoverageGapType } from "prisma/generated/client";
import { PrismaService } from "src/db/prisma.service";
import { RedisService } from "@lootlog/nest-shared";
import { RedlockService } from "src/lib/redlock/redlock.service";
import { EventEmitterService } from "./event-emitter.service";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";
import { buildActiveEventWhere } from "../utils/event-activity.util";
import { getSyntheticNpcId } from "../utils/get-synthetic-npc-id";

@Injectable()
export class EventTrackingService implements OnModuleInit {
  private readonly logger = new Logger(EventTrackingService.name);
  private redlock: Redlock;
  private readonly presenceLockTtl = 5000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitterService,
    private readonly amqpConnection: AmqpConnection,
    private readonly redis: RedisService,
    private readonly redlockService: RedlockService,
  ) {}

  async onModuleInit() {
    this.redlock = this.redlockService.createInstance();
  }

  private getPresenceLockKey(
    guildId: string,
    mapName: string,
    discordId: string,
  ): string {
    return `presence:lock:${guildId}:${mapName}:${discordId}`;
  }

  async assignMemberToMap(
    guildId: string,
    eventId: string,
    mapId: string,
    memberId: number,
  ) {
    const map = await this.prisma.eventMap.findFirst({
      where: {
        id: mapId,
        heroNpc: {
          event: {
            id: eventId,
            guildId,
          },
        },
      },
      include: {
        assignedMembers: true,
        heroNpc: {
          include: {
            event: {
              select: {
                mapAssignmentCap: true,
              },
            },
          },
        },
      },
    });

    if (!map) {
      throw new NotFoundException("Map not found");
    }

    const cap = map.heroNpc.event.mapAssignmentCap;
    if (cap && cap > 0 && map.assignedMembers.length >= cap) {
      throw new BadRequestException(
        `Map assignment limit reached (${cap} members max)`,
      );
    }

    const wasUnassigned = map.assignedMembers.length === 0;

    const isAlreadyAssigned = map.assignedMembers.some(
      (m) => m.id === memberId,
    );
    if (isAlreadyAssigned) {
      this.logger.debug({
        message: "Member already assigned to map, skipping",
        mapId,
        memberId,
      });
      return await this.prisma.eventMap.findUnique({
        where: { id: mapId },
        include: { assignedMembers: true },
      });
    }

    const updated = await this.prisma.eventMap.update({
      where: { id: mapId },
      data: {
        assignedMembers: {
          connect: { id: memberId },
        },
      },
      include: {
        assignedMembers: true,
      },
    });

    const existingOpenAssignment =
      await this.prisma.eventMapAssignmentHistory.findFirst({
        where: {
          mapId,
          memberId,
          unassignedAt: null,
        },
      });

    if (!existingOpenAssignment) {
      await this.prisma.eventMapAssignmentHistory.create({
        data: {
          mapId,
          heroNpcId: map.heroNpcId,
          memberId,
          assignedAt: new Date(),
        },
      });
    }

    if (wasUnassigned) {
      await this.closeUnassignedGap(mapId);
      await this.openUncoveredGap(mapId, map.heroNpcId);
      this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.PRESENCE_CHECK_REQUEST,
        {
          guildId,
          mapName: map.mapName,
        },
      );
    }

    await this.eventEmitter.emitMapStatusUpdate(guildId, eventId, mapId);

    return updated;
  }

  async unassignMemberFromMap(
    guildId: string,
    eventId: string,
    mapId: string,
    memberId?: number,
  ) {
    const map = await this.prisma.eventMap.findFirst({
      where: {
        id: mapId,
        heroNpc: {
          event: {
            id: eventId,
            guildId,
          },
        },
      },
      include: {
        assignedMembers: true,
        heroNpc: true,
      },
    });

    if (!map) {
      throw new NotFoundException("Map not found");
    }

    const updated = await this.prisma.eventMap.update({
      where: { id: mapId },
      data: {
        assignedMembers: memberId
          ? { disconnect: { id: memberId } }
          : { set: [] },
      },
      include: {
        assignedMembers: true,
      },
    });

    const now = new Date();
    if (memberId) {
      await this.prisma.eventMapAssignmentHistory.updateMany({
        where: { mapId, memberId, unassignedAt: null },
        data: { unassignedAt: now },
      });
    } else {
      await this.prisma.eventMapAssignmentHistory.updateMany({
        where: { mapId, unassignedAt: null },
        data: { unassignedAt: now },
      });
    }

    if (updated.assignedMembers.length === 0) {
      await this.openUnassignedGap(mapId, map.heroNpcId);
      await this.closeUncoveredGap(mapId);
    }

    await this.eventEmitter.emitMapStatusUpdate(guildId, eventId, mapId);

    return updated;
  }

  async getMemberByDiscordId(discordId: string, guildId: string) {
    return this.prisma.member.findFirst({
      where: {
        userId: discordId,
        guildId,
        active: true,
      },
    });
  }

  async openUnassignedGap(
    mapId: string,
    heroNpcId: string,
    startedAt?: Date,
  ): Promise<void> {
    const existingGap = await this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        gapType: CoverageGapType.UNASSIGNED,
        endedAt: null,
      },
    });

    if (existingGap) {
      return;
    }

    await this.prisma.eventMapCoverageGap.create({
      data: {
        mapId,
        heroNpcId,
        gapType: CoverageGapType.UNASSIGNED,
        startedAt: startedAt ?? new Date(),
      },
    });

    this.logger.debug({
      message: "Opened UNASSIGNED gap",
      mapId,
      heroNpcId,
    });
  }

  async closeUnassignedGap(mapId: string): Promise<void> {
    const now = new Date();

    const openGap = await this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        gapType: CoverageGapType.UNASSIGNED,
        endedAt: null,
      },
    });

    if (!openGap) {
      return;
    }

    const durationSeconds = Math.round(
      (now.getTime() - openGap.startedAt.getTime()) / 1000,
    );

    await this.prisma.eventMapCoverageGap.update({
      where: { id: openGap.id },
      data: {
        endedAt: now,
        durationSeconds,
      },
    });

    this.logger.debug({
      message: "Closed UNASSIGNED gap",
      mapId,
      durationSeconds,
    });
  }

  async openUncoveredGap(
    mapId: string,
    heroNpcId: string,
    startedAt?: Date,
  ): Promise<void> {
    const existingGap = await this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        gapType: CoverageGapType.UNCOVERED,
        endedAt: null,
      },
    });

    if (existingGap) {
      return;
    }

    await this.prisma.eventMapCoverageGap.create({
      data: {
        mapId,
        heroNpcId,
        gapType: CoverageGapType.UNCOVERED,
        startedAt: startedAt ?? new Date(),
      },
    });

    this.logger.debug({
      message: "Opened UNCOVERED gap",
      mapId,
      heroNpcId,
    });
  }

  async closeUncoveredGap(mapId: string): Promise<void> {
    const now = new Date();

    const openGap = await this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        gapType: CoverageGapType.UNCOVERED,
        endedAt: null,
      },
    });

    if (!openGap) {
      return;
    }

    const durationSeconds = Math.round(
      (now.getTime() - openGap.startedAt.getTime()) / 1000,
    );

    await this.prisma.eventMapCoverageGap.update({
      where: { id: openGap.id },
      data: {
        endedAt: now,
        durationSeconds,
      },
    });

    this.logger.debug({
      message: "Closed UNCOVERED gap",
      mapId,
      durationSeconds,
    });
  }

  async closeAllGapsForHero(heroNpcId: string): Promise<void> {
    const now = new Date();

    const openGaps = await this.prisma.eventMapCoverageGap.findMany({
      where: {
        heroNpcId,
        endedAt: null,
      },
    });

    if (openGaps.length === 0) {
      return;
    }

    await this.prisma.$transaction(
      openGaps.map((gap) => {
        const durationSeconds = Math.round(
          (now.getTime() - gap.startedAt.getTime()) / 1000,
        );
        return this.prisma.eventMapCoverageGap.update({
          where: { id: gap.id },
          data: {
            endedAt: now,
            durationSeconds,
          },
        });
      }),
    );

    this.logger.debug({
      message: "Closed all gaps for hero",
      heroNpcId,
      closedCount: openGaps.length,
    });
  }

  async getMapCoverageGaps(guildId: string, eventId: string, mapId: string) {
    const map = await this.prisma.eventMap.findFirst({
      where: {
        id: mapId,
        heroNpc: {
          eventId,
          event: { guildId },
        },
      },
    });

    if (!map) {
      throw new NotFoundException("Map not found");
    }

    return this.prisma.eventMapCoverageGap.findMany({
      where: { mapId },
      orderBy: { startedAt: "desc" },
    });
  }

  async getHeroCoverageGaps(
    guildId: string,
    eventId: string,
    heroNpcId: string,
  ) {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroNpcId,
        eventId,
        event: { guildId },
      },
    });

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    return this.prisma.eventMapCoverageGap.findMany({
      where: { heroNpcId },
      orderBy: { startedAt: "desc" },
      include: {
        map: {
          select: {
            mapName: true,
            mapId: true,
          },
        },
      },
    });
  }

  async getActiveGapForMap(guildId: string, eventId: string, mapId: string) {
    const map = await this.prisma.eventMap.findFirst({
      where: {
        id: mapId,
        heroNpc: {
          eventId,
          event: { guildId },
        },
      },
    });

    if (!map) {
      throw new NotFoundException("Map not found");
    }

    return this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        endedAt: null,
      },
    });
  }

  async getActiveGapsForHero(
    guildId: string,
    eventId: string,
    heroNpcId: string,
  ) {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroNpcId,
        eventId,
        event: { guildId },
      },
    });

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    return this.prisma.eventMapCoverageGap.findMany({
      where: {
        heroNpcId,
        endedAt: null,
      },
    });
  }

  async handlePlayerPresenceChange(
    guildId: string,
    mapName: string,
    discordId: string,
    hasPlayer: boolean,
    isAfk = false,
  ): Promise<void> {
    const lockKey = this.getPresenceLockKey(guildId, mapName, discordId);

    try {
      await this.redlock.using([lockKey], this.presenceLockTtl, async () => {
        await this.handlePlayerPresenceChangeInternal(
          guildId,
          mapName,
          discordId,
          hasPlayer,
          isAfk,
        );
      });
    } catch (error) {
      if (error instanceof ExecutionError) {
        this.logger.warn({
          message: "Failed to acquire presence lock, skipping update",
          guildId,
          mapName,
          discordId,
        });
        return;
      }
      throw error;
    }
  }

  private async handlePlayerPresenceChangeInternal(
    guildId: string,
    mapName: string,
    discordId: string,
    hasPlayer: boolean,
    isAfk: boolean,
  ): Promise<void> {
    const member = await this.getMemberByDiscordId(discordId, guildId);
    const referenceTime = new Date();

    const eventMaps = await this.prisma.eventMap.findMany({
      where: {
        mapName,
        heroNpc: {
          event: {
            guildId,
            ...buildActiveEventWhere(referenceTime),
          },
        },
      },
      include: {
        assignedMembers: true,
        heroNpc: {
          include: {
            event: {
              select: { world: true },
            },
          },
        },
      },
    });

    const now = referenceTime;

    const timerKeys = eventMaps.map((map) => ({
      guildId,
      world: map.heroNpc.event.world,
      npcId: map.heroNpc.npcId ?? getSyntheticNpcId(map.heroNpc.id),
    }));

    const activeTimers = await this.prisma.timer.findMany({
      where: {
        OR: timerKeys,
        maxSpawnTime: { gt: now },
      },
      select: {
        guildId: true,
        world: true,
        npcId: true,
      },
    });

    const activeTimerSet = new Set(
      activeTimers.map((t) => `${t.guildId}:${t.world}:${t.npcId}`),
    );

    const activeMaps = eventMaps.filter((map) => {
      const effectiveNpcId =
        map.heroNpc.npcId ?? getSyntheticNpcId(map.heroNpc.id);
      const timerKey = `${guildId}:${map.heroNpc.event.world}:${effectiveNpcId}`;
      return activeTimerSet.has(timerKey);
    });

    const assignedActiveMapIds = activeMaps
      .filter((map) => map.assignedMembers.length > 0)
      .map((map) => map.id);

    const activeNonAfkByMap =
      await this.getActiveNonAfkMembersByMap(assignedActiveMapIds);

    for (const map of activeMaps) {
      const nonAfkMembers = activeNonAfkByMap.get(map.id) ?? new Set<number>();

      if (member) {
        if (hasPlayer) {
          await this.prisma.eventPresenceLog.updateMany({
            where: {
              mapId: map.id,
              memberId: member.id,
              endedAt: null,
            },
            data: { endedAt: now },
          });

          await this.prisma.eventPresenceLog.create({
            data: {
              mapId: map.id,
              memberId: member.id,
              isAfk,
            },
          });

          this.logger.debug({
            message: "Created presence log",
            mapId: map.id,
            memberId: member.id,
            isAfk,
          });

          if (isAfk) {
            nonAfkMembers.delete(member.id);
          } else {
            nonAfkMembers.add(member.id);
          }
        } else {
          const result = await this.prisma.eventPresenceLog.updateMany({
            where: {
              mapId: map.id,
              memberId: member.id,
              endedAt: null,
            },
            data: { endedAt: now },
          });

          if (result.count > 0) {
            this.logger.debug({
              message: "Closed presence log - player left map",
              mapId: map.id,
              memberId: member.id,
            });
          }

          nonAfkMembers.delete(member.id);
        }
      }

      const hasAssignedMembers = map.assignedMembers.length > 0;

      if (!hasAssignedMembers) {
        continue;
      }

      if (hasPlayer) {
        if (isAfk) {
          if (nonAfkMembers.size === 0) {
            await this.openUncoveredGap(map.id, map.heroNpcId);
          }
        } else {
          await this.closeUncoveredGap(map.id);
        }
      } else {
        if (nonAfkMembers.size === 0) {
          await this.openUncoveredGap(map.id, map.heroNpcId);
        }
      }

      await this.eventEmitter.emitMapStatusUpdate(
        guildId,
        map.heroNpc.eventId,
        map.id,
      );
    }
  }

  async getActiveNonAfkPlayersOnMap(mapId: string): Promise<number[]> {
    const mapMembers = await this.getActiveNonAfkMembersByMap([mapId]);
    return Array.from(mapMembers.get(mapId) ?? []);
  }

  private async getActiveNonAfkMembersByMap(
    mapIds: string[],
  ): Promise<Map<string, Set<number>>> {
    if (mapIds.length === 0) {
      return new Map();
    }

    const activeLogs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId: { in: mapIds },
        endedAt: null,
        isAfk: false,
      },
      select: {
        mapId: true,
        memberId: true,
      },
      distinct: ["mapId", "memberId"],
    });

    const membersByMap = new Map<string, Set<number>>();
    for (const mapId of mapIds) {
      membersByMap.set(mapId, new Set());
    }

    for (const log of activeLogs) {
      membersByMap.get(log.mapId)!.add(log.memberId);
    }

    return membersByMap;
  }

  async getActivePlayersOnMap(mapId: string): Promise<number[]> {
    const activeLogs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId,
        endedAt: null,
      },
      select: {
        memberId: true,
      },
      distinct: ["memberId"],
    });

    return activeLogs.map((log) => log.memberId);
  }

  async getHeroPresenceStats(
    guildId: string,
    eventId: string,
    heroNpcId: string,
  ): Promise<{
    totalCoverageSeconds: number;
    totalEventSeconds: number;
    presencePercentage: number;
    memberStats: Array<{
      memberId: number;
      memberName: string;
      memberAvatar: string | null;
      totalTimeSeconds: number;
      afkTimeSeconds: number;
      afkPercentage: number;
    }>;
  }> {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroNpcId,
        eventId,
        event: { guildId },
      },
      include: {
        event: true,
        maps: {
          include: {
            assignedMembers: true,
          },
        },
      },
    });

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const mapIds = hero.maps.map((m) => m.id);

    const eventStart = hero.event.startsAt || hero.event.createdAt;
    const eventEnd = hero.event.endsAt || new Date();
    const totalEventSeconds = Math.max(
      0,
      Math.round((eventEnd.getTime() - eventStart.getTime()) / 1000),
    );

    const assignedMemberIds = new Set<number>();
    for (const map of hero.maps) {
      for (const member of map.assignedMembers) {
        assignedMemberIds.add(member.id);
      }
    }

    const presenceLogs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId: { in: mapIds },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { startedAt: "asc" },
    });

    const now = new Date();

    const memberStatsMap = new Map<
      number,
      {
        memberId: number;
        memberName: string;
        memberAvatar: string | null;
        totalTimeMs: number;
        afkTimeMs: number;
      }
    >();

    for (const memberId of assignedMemberIds) {
      const member = hero.maps
        .flatMap((m) => m.assignedMembers)
        .find((m) => m.id === memberId);
      if (member) {
        memberStatsMap.set(memberId, {
          memberId: member.id,
          memberName: member.name,
          memberAvatar: member.avatar,
          totalTimeMs: 0,
          afkTimeMs: 0,
        });
      }
    }

    let totalCoverageMs = 0;

    for (const log of presenceLogs) {
      const endTime = log.endedAt || now;
      const duration = Math.max(0, endTime.getTime() - log.startedAt.getTime());

      if (!log.isAfk) {
        totalCoverageMs += duration;
      }

      let memberStats = memberStatsMap.get(log.memberId);
      if (!memberStats) {
        memberStats = {
          memberId: log.member.id,
          memberName: log.member.name,
          memberAvatar: log.member.avatar,
          totalTimeMs: 0,
          afkTimeMs: 0,
        };
        memberStatsMap.set(log.memberId, memberStats);
      }

      memberStats.totalTimeMs += duration;
      if (log.isAfk) {
        memberStats.afkTimeMs += duration;
      }
    }

    const memberStats = Array.from(memberStatsMap.values()).map((stats) => ({
      memberId: stats.memberId,
      memberName: stats.memberName,
      memberAvatar: stats.memberAvatar,
      totalTimeSeconds: Math.round(stats.totalTimeMs / 1000),
      afkTimeSeconds: Math.round(stats.afkTimeMs / 1000),
      afkPercentage:
        stats.totalTimeMs > 0
          ? Math.round((stats.afkTimeMs / stats.totalTimeMs) * 10000) / 100
          : 0,
    }));

    memberStats.sort((a, b) => b.totalTimeSeconds - a.totalTimeSeconds);

    const totalCoverageSeconds = Math.round(totalCoverageMs / 1000);
    const presencePercentage =
      totalEventSeconds > 0
        ? Math.round((totalCoverageSeconds / totalEventSeconds) * 10000) / 100
        : 0;

    return {
      totalCoverageSeconds,
      totalEventSeconds,
      presencePercentage,
      memberStats,
    };
  }
}
