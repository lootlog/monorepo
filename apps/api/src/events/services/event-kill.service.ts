import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { CoverageGapType, Event, EventHeroNpc } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { RedisService } from 'src/lib/redis/redis.service';
import { EventEmitterService } from './event-emitter.service';
import { EventPointsService } from './event-points.service';
import { EventTrackingService } from './event-tracking.service';
import { EventSummaryService } from './event-summary.service';
import { RESPAWN_WINDOW_QUEUE } from '../constants/respawn-queue.constant';
import type { AutoCloseRespawnWindowJobData } from '../respawn-window.processor';
import type { KillTimerData } from '../interfaces/kill-timer-data.interface';

const EVENT_KILL_LOCK_TTL_SECONDS = 30;

interface GapTimelineEntry {
  mapId: string;
  mapName: string;
  gapType: CoverageGapType;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number;
}

@Injectable()
export class EventKillService {
  private readonly logger = new Logger(EventKillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitterService,
    private readonly pointsService: EventPointsService,
    private readonly trackingService: EventTrackingService,
    private readonly summaryService: EventSummaryService,
    @InjectQueue(RESPAWN_WINDOW_QUEUE)
    private readonly respawnWindowQueue: Queue<AutoCloseRespawnWindowJobData>,
  ) {}

  async getEventHeroTimers(guildId: string, eventId: string, world: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      include: {
        heroNpcs: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.heroNpcs.length === 0) {
      return [];
    }

    const heroesWithId = event.heroNpcs.filter((hero) => hero.npcId !== null);
    const heroesWithoutId = event.heroNpcs.filter(
      (hero) => hero.npcId === null,
    );

    const npcIds = heroesWithId.map((hero) => hero.npcId as number);
    const npcNames = heroesWithoutId.map((hero) => hero.npcName);

    const now = new Date();

    if (npcNames.length > 0) {
      const nameMatchTimers = await this.prisma.$queryRaw<
        Array<{
          createdById: number;
          guildId: string;
          npcId: number;
          world: string;
          minSpawnTime: Date;
          maxSpawnTime: Date;
          latestRespBaseSeconds: number;
          latestRespawnRandomness: number;
          tempId: string | null;
          wasReset: boolean;
          npc: unknown;
          createdAt: Date;
          updatedAt: Date;
        }>
      >`
        SELECT t.*
        FROM "Timer" t
        WHERE t."guildId" = ${guildId}
          AND t."world" = ${world}
          AND t."maxSpawnTime" > ${now}
          AND t."npc"->>'name' = ANY(${npcNames}::text[])
      `;

      if (npcIds.length > 0) {
        const idMatchTimers = await this.prisma.timer.findMany({
          where: {
            guildId,
            world,
            npcId: { in: npcIds },
            maxSpawnTime: { gt: now.toISOString() },
          },
          include: {
            member: true,
          },
        });

        const seen = new Set<number>();
        const combined = [];

        for (const timer of idMatchTimers) {
          if (!seen.has(timer.npcId)) {
            seen.add(timer.npcId);
            combined.push(timer);
          }
        }

        const nameMatchedTimersToAdd = nameMatchTimers.filter(
          (timer) => !seen.has(timer.npcId),
        );
        const memberIds = [
          ...new Set(nameMatchedTimersToAdd.map((t) => t.createdById)),
        ];
        const members = await this.prisma.member.findMany({
          where: { id: { in: memberIds } },
        });
        const memberMap = new Map(members.map((m) => [m.id, m]));

        for (const timer of nameMatchedTimersToAdd) {
          seen.add(timer.npcId);
          combined.push({ ...timer, member: memberMap.get(timer.createdById) });
        }

        return combined;
      }

      const memberIds = [...new Set(nameMatchTimers.map((t) => t.createdById))];
      const members = await this.prisma.member.findMany({
        where: { id: { in: memberIds } },
      });
      const memberMap = new Map(members.map((m) => [m.id, m]));

      return nameMatchTimers.map((timer) => ({
        ...timer,
        member: memberMap.get(timer.createdById),
      }));
    }

    const timers = await this.prisma.timer.findMany({
      where: {
        guildId,
        world,
        npcId: { in: npcIds },
        maxSpawnTime: { gt: now.toISOString() },
      },
      include: {
        member: true,
      },
    });

    return timers;
  }

  async getEventHeroStats(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      include: {
        heroNpcs: {
          include: {
            kills: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event.heroNpcs.map((hero) => ({
      heroId: hero.id,
      npcId: hero.npcId,
      npcName: hero.npcName,
      npcLvl: hero.npcLvl,
      killCount: hero.kills.length,
    }));
  }

  async checkAndRecordEventHeroKill(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
    npcIcon: string,
    timerData: KillTimerData,
    isManualClose = false,
    npcLvl?: number,
  ): Promise<void> {
    const lockKey = this.getEventKillLockKey(guildId, world, npcId);

    // Try to acquire lock - if another request already has it, silently return
    const lockAcquired = await this.redis.setNX(
      lockKey,
      Date.now().toString(),
      EVENT_KILL_LOCK_TTL_SECONDS,
    );

    if (!lockAcquired) {
      this.logger.debug({
        message: 'Skipping duplicate event hero kill - lock already held',
        guildId,
        world,
        npcId,
        npcName,
      });
      return;
    }

    try {
      const result = await this.findActiveEventHeroByNpc(
        guildId,
        world,
        npcId,
        npcName,
      );

      if (!result) {
        return;
      }

      let { eventHero } = result;
      const { event } = result;

      if (
        eventHero.npcId === null ||
        eventHero.npcIcon === null ||
        eventHero.npcLvl === null
      ) {
        eventHero = await this.prisma.eventHeroNpc.update({
          where: { id: eventHero.id },
          data: {
            ...(eventHero.npcId === null && { npcId }),
            ...(eventHero.npcIcon === null && { npcIcon }),
            ...(eventHero.npcLvl === null && npcLvl !== undefined && { npcLvl }),
          },
        });
        this.logger.log({
          message: 'Hero NPC data updated',
          heroId: eventHero.id,
          npcId: eventHero.npcId,
          npcIcon: eventHero.npcIcon,
          npcLvl: eventHero.npcLvl,
        });
      }

      try {
        await this.recordHeroKill(guildId, eventHero, event, timerData, isManualClose);
        this.logger.log({
          message: isManualClose ? 'Manual close recorded' : 'Hero kill recorded',
          guildId,
          eventId: event.id,
          heroId: eventHero.id,
          npcName: eventHero.npcName,
          isManualClose,
        });
      } catch (error) {
        this.logger.error({
          message: 'Failed to record hero kill',
          guildId,
          eventId: event.id,
          heroId: eventHero.id,
          error: error instanceof Error ? error.message : error,
        });
      }
    } finally {
      // Always release lock
      await this.redis.del(lockKey).catch((err) => {
        this.logger.error({
          message: 'Failed to release event kill lock',
          lockKey,
          error: err instanceof Error ? err.message : err,
        });
      });
    }
  }

  async findActiveEventHeroByNpc(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
  ): Promise<{ eventHero: EventHeroNpc; event: Event } | null> {
    const now = new Date();

    let heroNpc = await this.prisma.eventHeroNpc.findFirst({
      where: {
        npcId,
        event: {
          guildId,
          world,
          active: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [
            {
              OR: [{ endsAt: null }, { endsAt: { gte: now } }],
            },
          ],
        },
      },
      include: {
        event: true,
      },
    });

    if (!heroNpc) {
      heroNpc = await this.prisma.eventHeroNpc.findFirst({
        where: {
          npcName,
          npcId: null,
          event: {
            guildId,
            world,
            active: true,
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [
              {
                OR: [{ endsAt: null }, { endsAt: { gte: now } }],
              },
            ],
          },
        },
        include: {
          event: true,
        },
      });
    }

    if (!heroNpc) {
      return null;
    }

    return {
      eventHero: heroNpc,
      event: heroNpc.event,
    };
  }

  async recordHeroKill(
    guildId: string,
    eventHero: EventHeroNpc,
    event: Event,
    timerData: KillTimerData,
    isManualClose = false,
  ) {
    const killedAt = new Date();

    const heroMaps = await this.prisma.eventMap.findMany({
      where: { heroNpcId: eventHero.id },
      include: {
        assignedMembers: true,
      },
    });

    const memberMapAssignments = new Map<number, string[]>();
    const memberMapIds = new Map<number, string[]>();
    const mapIdToName = new Map<string, string>();

    for (const map of heroMaps) {
      mapIdToName.set(map.id, map.mapName);
      for (const member of map.assignedMembers) {
        const mapNames = memberMapAssignments.get(member.id) || [];
        mapNames.push(map.mapName);
        memberMapAssignments.set(member.id, mapNames);

        const mapIds = memberMapIds.get(member.id) || [];
        mapIds.push(map.id);
        memberMapIds.set(member.id, mapIds);
      }
    }

    const assignedMemberIds = Array.from(memberMapAssignments.keys());

    if (assignedMemberIds.length === 0) {
      this.logger.log({
        message: 'No assigned members for hero kill',
        heroId: eventHero.id,
        eventId: event.id,
      });
    }

    const kill = await this.prisma.$transaction(async (tx) => {
      const heroKill = await tx.eventHeroKill.create({
        data: {
          heroNpcId: eventHero.id,
          killedAt,
          minSpawnTimeAtKill: timerData.previousMinSpawnTime ?? killedAt,
          maxSpawnTimeAtKill: timerData.previousMaxSpawnTime ?? killedAt,
          timerCreatedById: timerData.memberId,
          isManualClose,
        },
      });

      const killPointsData: Array<{
        killId: string;
        memberId: number;
        mapName: string;
        basePoints: number;
        points: number;
        appliedMultiplier: number;
        timeMultiplier: number;
        trackersMultiplier: number;
        mapsMultiplier: number;
        trackingDurationMultiplier: number;
        trackingDurationSeconds: number | null;
        trackingDurationPercentage: number | null;
        timeOnMapSeconds: number;
        afkPercentage: number;
        wasPresent: boolean;
        mapPresenceData: Array<{
          mapId: string;
          mapName: string;
          presenceTimeSeconds: number;
          afkTimeSeconds: number;
        }>;
      }> = [];

      const mapIds = heroMaps.map((m) => m.id);
      const assignmentHistory = await tx.eventMapAssignmentHistory.findMany({
        where: {
          mapId: { in: mapIds },
          memberId: { in: assignedMemberIds },
          unassignedAt: null,
        },
        select: {
          memberId: true,
          assignedAt: true,
        },
      });

      const memberFirstAssignment = new Map<number, Date>();
      for (const history of assignmentHistory) {
        const current = memberFirstAssignment.get(history.memberId);
        if (!current || history.assignedAt < current) {
          memberFirstAssignment.set(history.memberId, history.assignedAt);
        }
      }

      for (const memberId of assignedMemberIds) {
        const mapNames = memberMapAssignments.get(memberId) || [];
        const memberAssignedMapIds = memberMapIds.get(memberId) || [];

        const presenceStats = await this.pointsService.getMemberPresenceStats(
          eventHero.id,
          memberId,
          timerData.previousMinSpawnTime ?? undefined,
        );

        const perMapPresenceStats =
          await this.pointsService.getMemberPresenceStatsPerMap(
            memberAssignedMapIds,
            memberId,
            timerData.previousMinSpawnTime ?? undefined,
          );

        const mapPresenceData = perMapPresenceStats.map((stat) => ({
          mapId: stat.mapId,
          mapName: mapIdToName.get(stat.mapId) || '',
          presenceTimeSeconds: stat.presenceTimeSeconds,
          afkTimeSeconds: stat.afkTimeSeconds,
        }));

        const firstAssignment = memberFirstAssignment.get(memberId);
        const trackingDurationSeconds = firstAssignment
          ? Math.floor(
              (killedAt.getTime() - firstAssignment.getTime()) / 1000,
            )
          : null;

        const windowStartTime = timerData.previousMinSpawnTime ?? killedAt;
        const windowDurationSeconds = Math.floor(
          (killedAt.getTime() - windowStartTime.getTime()) / 1000,
        );
        const trackingDurationPercentage =
          trackingDurationSeconds !== null && windowDurationSeconds > 0
            ? Math.min(
                100,
                Math.round(
                  (trackingDurationSeconds / windowDurationSeconds) * 100,
                ),
              )
            : undefined;

        const {
          points,
          appliedMultiplier,
          timeMultiplier,
          trackersMultiplier,
          mapsMultiplier,
          trackingDurationMultiplier,
        } = this.pointsService.calculateMemberPoints(
          event,
          killedAt,
          mapNames.length,
          assignedMemberIds.length,
          trackingDurationPercentage,
        );

        killPointsData.push({
          killId: heroKill.id,
          memberId,
          mapName: mapNames.join(', '),
          basePoints: event.basePointsPerKill,
          points,
          appliedMultiplier,
          timeMultiplier,
          trackersMultiplier,
          mapsMultiplier,
          trackingDurationMultiplier,
          trackingDurationSeconds,
          trackingDurationPercentage: trackingDurationPercentage ?? null,
          timeOnMapSeconds: presenceStats.timeOnMapSeconds,
          afkPercentage: presenceStats.afkPercentage,
          wasPresent: presenceStats.wasPresent,
          mapPresenceData,
        });
      }

      if (killPointsData.length > 0) {
        await tx.eventKillPoint.createMany({
          data: killPointsData,
        });
      }

      for (const map of heroMaps) {
        await tx.eventMap.update({
          where: { id: map.id },
          data: {
            assignedMembers: { set: [] },
          },
        });
      }

      await tx.eventMapAssignmentHistory.updateMany({
        where: {
          mapId: { in: heroMaps.map((m) => m.id) },
          unassignedAt: null,
        },
        data: { unassignedAt: killedAt },
      });

      const createdPoints = await tx.eventKillPoint.findMany({
        where: { killId: heroKill.id },
      });

      return {
        kill: heroKill,
        points: createdPoints,
        clearedMapIds: heroMaps.map((m) => m.id),
      };
    });

    if (kill.points.length > 0) {
      await this.pointsService.updateRankingAfterKill(
        event.id,
        eventHero.npcName,
        kill.points,
      );
    }

    await this.trackingService.closeAllGapsForHero(eventHero.id);

    if (
      !isManualClose &&
      timerData.minSpawnTime &&
      timerData.maxSpawnTime &&
      timerData.minSpawnTime > killedAt
    ) {
      for (const map of heroMaps) {
        await this.trackingService.openUnassignedGap(
          map.id,
          eventHero.id,
          killedAt,
        );
      }
      this.logger.debug({
        message: 'Opened UNASSIGNED gaps for new respawn window',
        heroId: eventHero.id,
        mapsCount: heroMaps.length,
      });
    }

    const windowOpenedAt =
      timerData.windowOpenedAt ??
      timerData.previousMinSpawnTime ??
      killedAt;
    await this.summaryService.createWindowSummary(
      eventHero.id,
      kill.kill.id,
      windowOpenedAt,
      killedAt,
      timerData.previousMinSpawnTime ?? killedAt,
      timerData.previousMaxSpawnTime ?? killedAt,
      isManualClose,
    );

    await this.cancelScheduledAutoClose(eventHero.id);

    await this.eventEmitter.emitHeroKilled(guildId, event.id, kill.kill.id);

    if (!isManualClose) {
      await this.eventEmitter.emitRespawnWindowClosed(
        guildId,
        event.id,
        eventHero.id,
      );

      if (timerData.minSpawnTime && timerData.maxSpawnTime) {
        await this.eventEmitter.emitRespawnWindowOpened(
          guildId,
          event.id,
          eventHero.id,
        );

        await this.scheduleAutoCloseForNewWindow(
          guildId,
          event.id,
          eventHero.id,
          eventHero.npcId,
          event.world,
          timerData.maxSpawnTime,
        );
      }
    }

    for (const map of heroMaps) {
      await this.eventEmitter.emitMapStatusUpdate(
        guildId,
        event.id,
        map.id,
        map.mapName,
      );
    }

    return kill.kill;
  }

  async getHeroKillHistory(
    guildId: string,
    eventId: string,
    heroId: string,
    limit = 20,
    cursor?: string,
  ) {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroId,
        eventId,
        event: { guildId },
      },
    });

    if (!hero) {
      throw new NotFoundException('Hero not found');
    }

    const kills = await this.prisma.eventHeroKill.findMany({
      where: {
        heroNpcId: heroId,
        ...(cursor && { id: { lt: cursor } }),
      },
      orderBy: { killedAt: 'desc' },
      take: limit + 1,
      include: {
        heroNpc: true,
        timerCreatedBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
            userId: true,
          },
        },
        points: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                avatar: true,
                userId: true,
                roles: {
                  select: {
                    position: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const hasMore = kills.length > limit;
    const data = hasMore ? kills.slice(0, limit) : kills;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return {
      data,
      nextCursor,
    };
  }

  async getEventKillHistory(
    guildId: string,
    eventId: string,
    limit = 20,
    cursor?: string,
    heroId?: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const kills = await this.prisma.eventHeroKill.findMany({
      where: {
        heroNpc: {
          eventId,
          ...(heroId && { id: heroId }),
        },
        ...(cursor && { id: { lt: cursor } }),
      },
      orderBy: { killedAt: 'desc' },
      take: limit + 1,
      include: {
        heroNpc: true,
        timerCreatedBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
            userId: true,
          },
        },
        points: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                avatar: true,
                userId: true,
                roles: {
                  select: {
                    position: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const hasMore = kills.length > limit;
    const data = hasMore ? kills.slice(0, limit) : kills;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return {
      data,
      nextCursor,
    };
  }

  async getKillDetail(
    guildId: string,
    eventId: string,
    heroId: string,
    killId: string,
  ) {
    const kill = await this.prisma.eventHeroKill.findFirst({
      where: {
        id: killId,
        heroNpcId: heroId,
        heroNpc: {
          eventId,
          event: { guildId },
        },
      },
      include: {
        heroNpc: {
          include: {
            event: true,
          },
        },
        timerCreatedBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
            userId: true,
          },
        },
        points: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                avatar: true,
                userId: true,
                roles: {
                  select: {
                    position: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!kill) {
      throw new NotFoundException('Kill not found');
    }

    const summary = await this.prisma.eventRespawnWindowSummary.findUnique({
      where: { killId },
      select: { totalWindowSeconds: true },
    });

    const heroMaps = await this.prisma.eventMap.findMany({
      where: { heroNpcId: heroId },
      select: { id: true, mapName: true },
    });

    const mapIdToName = new Map(heroMaps.map((m) => [m.id, m.mapName]));
    const mapIds = heroMaps.map((m) => m.id);

    const pointsWithMapData = await Promise.all(
      kill.points.map(async (point) => {
        const assignments = await this.prisma.eventMapAssignmentHistory.findMany(
          {
            where: {
              mapId: { in: mapIds },
              memberId: point.memberId,
              assignedAt: { lte: kill.killedAt },
              OR: [
                { unassignedAt: null },
                { unassignedAt: { gte: kill.minSpawnTimeAtKill } },
              ],
            },
            select: {
              mapId: true,
              assignedAt: true,
              unassignedAt: true,
            },
            orderBy: { assignedAt: 'asc' },
          },
        );

        type MapPresenceEntry = {
          mapId: string;
          mapName: string;
          presenceTimeSeconds: number;
          afkTimeSeconds: number;
        };
        const storedMapPresence = point.mapPresenceData as
          | MapPresenceEntry[]
          | null;

        let presenceByMapId: Map<
          string,
          { presenceTimeSeconds: number; afkTimeSeconds: number }
        >;

        if (storedMapPresence && storedMapPresence.length > 0) {
          presenceByMapId = new Map(
            storedMapPresence.map((s) => [
              s.mapId,
              {
                presenceTimeSeconds: s.presenceTimeSeconds,
                afkTimeSeconds: s.afkTimeSeconds,
              },
            ]),
          );
        } else {
          const assignedMapIds = [...new Set(assignments.map((a) => a.mapId))];
          const presenceStats =
            await this.pointsService.getMemberPresenceStatsPerMap(
              assignedMapIds,
              point.memberId,
              kill.minSpawnTimeAtKill,
            );
          presenceByMapId = new Map(
            presenceStats.map((s) => [
              s.mapId,
              {
                presenceTimeSeconds: s.presenceTimeSeconds,
                afkTimeSeconds: s.afkTimeSeconds,
              },
            ]),
          );
        }

        const mapData = assignments.map((assignment) => {
          const endTime = assignment.unassignedAt || kill.killedAt;
          const assignmentDurationSeconds = Math.round(
            (endTime.getTime() - assignment.assignedAt.getTime()) / 1000,
          );

          const presence = presenceByMapId.get(assignment.mapId);

          return {
            mapId: assignment.mapId,
            mapName: mapIdToName.get(assignment.mapId) || '',
            assignedAt: assignment.assignedAt.toISOString(),
            unassignedAt: assignment.unassignedAt?.toISOString() || null,
            assignmentDurationSeconds,
            presenceTimeSeconds: presence?.presenceTimeSeconds || 0,
            afkTimeSeconds: presence?.afkTimeSeconds || 0,
          };
        });

        return {
          ...point,
          mapData,
        };
      }),
    );

    return {
      kill: {
        ...kill,
        points: pointsWithMapData,
        windowDurationSeconds: summary?.totalWindowSeconds ?? null,
      },
      eventConfig: {
        basePointsPerKill: kill.heroNpc.event.basePointsPerKill,
        timeOfDayMultipliers: kill.heroNpc.event.timeOfDayMultipliers,
        trackersMultipliers: kill.heroNpc.event.trackersMultipliers,
        mapsCountMultipliers: kill.heroNpc.event.mapsCountMultipliers,
        trackingDurationMultipliers:
          kill.heroNpc.event.trackingDurationMultipliers,
      },
    };
  }

  async getKillTimelineData(
    guildId: string,
    eventId: string,
    heroId: string,
    killId: string,
  ) {
    const kill = await this.prisma.eventHeroKill.findFirst({
      where: {
        id: killId,
        heroNpcId: heroId,
        heroNpc: {
          eventId,
          event: { guildId },
        },
      },
      select: {
        minSpawnTimeAtKill: true,
        killedAt: true,
      },
    });

    if (!kill) {
      throw new NotFoundException('Kill not found');
    }

    const summary = await this.prisma.eventRespawnWindowSummary.findUnique({
      where: { killId },
      select: { gapsTimeline: true },
    });

    const summaryGaps =
      (summary?.gapsTimeline as unknown as GapTimelineEntry[] | null) ?? [];

    const maps = await this.prisma.eventMap.findMany({
      where: { heroNpcId: heroId },
      select: { id: true, mapName: true, mapId: true },
    });

    const results = await Promise.all(
      maps.map(async (map) => {
        const assignments =
          await this.prisma.eventMapAssignmentHistory.findMany({
            where: {
              mapId: map.id,
              assignedAt: { lte: kill.killedAt },
              OR: [
                { unassignedAt: null },
                { unassignedAt: { gte: kill.minSpawnTimeAtKill } },
              ],
            },
            include: {
              member: {
                select: { id: true, name: true, avatar: true, userId: true },
              },
            },
            orderBy: { assignedAt: 'asc' },
          });

        const gapsForMap = summaryGaps.filter((g) => g.mapId === map.id);

        return {
          mapId: map.id,
          mapName: map.mapName,
          numericMapId: map.mapId,
          assignments: assignments.map((a) => ({
            memberId: a.memberId,
            memberName: a.member.name,
            memberAvatar: a.member.avatar,
            memberUserId: a.member.userId,
            assignedAt: a.assignedAt,
            unassignedAt: a.unassignedAt,
          })),
          gaps: gapsForMap.map((g) => ({
            id: `${g.mapId}-${new Date(g.startedAt).getTime()}`,
            gapType: g.gapType,
            startedAt: g.startedAt,
            endedAt: g.endedAt,
            durationSeconds: g.durationSeconds,
          })),
        };
      }),
    );

    return results;
  }

  private async cancelScheduledAutoClose(heroId: string): Promise<void> {
    const delayedJobs = await this.respawnWindowQueue.getJobs(['delayed']);

    for (const job of delayedJobs) {
      if (job.data.heroId === heroId) {
        await job.remove();
        this.logger.log({
          message: 'Cancelled scheduled auto-close job (kill recorded)',
          heroId,
          jobId: job.id,
        });
      }
    }
  }

  private async scheduleAutoCloseForNewWindow(
    guildId: string,
    eventId: string,
    heroId: string,
    npcId: number | null,
    world: string,
    maxSpawnTime: Date,
  ): Promise<void> {
    const now = new Date();
    const delay = maxSpawnTime.getTime() - now.getTime();

    if (delay <= 0) {
      this.logger.log({
        message: 'Not scheduling auto-close - maxSpawnTime already passed',
        heroId,
        maxSpawnTime,
      });
      return;
    }

    const effectiveNpcId = npcId ?? this.getSyntheticNpcId(heroId);
    const jobId = `auto-close-${heroId}-${maxSpawnTime.getTime()}`;

    await this.respawnWindowQueue.add(
      'auto-close-respawn-window',
      { guildId, eventId, heroId, npcId: effectiveNpcId, world },
      {
        delay,
        jobId,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    this.logger.log({
      message: 'Scheduled auto-close for new respawn window',
      heroId,
      maxSpawnTime,
      delayMs: delay,
      jobId,
    });
  }

  private getSyntheticNpcId(heroId: string): number {
    let hash = 0;
    for (let i = 0; i < heroId.length; i++) {
      hash = ((hash << 5) - hash) + heroId.charCodeAt(i);
      hash |= 0;
    }
    return -Math.abs(hash || 1);
  }

  private getEventKillLockKey(
    guildId: string,
    world: string,
    npcId: number,
  ): string {
    return `event:hero:kill:lock:${guildId}:${world}:${npcId}`;
  }
}
