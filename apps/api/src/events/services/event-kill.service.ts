import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { CoverageGapType, Event, EventHeroNpc } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { EventEmitterService } from './event-emitter.service';
import { EventPointsService } from './event-points.service';
import { EventTrackingService } from './event-tracking.service';
import { EventSummaryService } from './event-summary.service';
import { RESPAWN_WINDOW_QUEUE } from '../constants/respawn-queue.constant';
import type { AutoCloseRespawnWindowJobData } from '../respawn-window.processor';
import type { KillTimerData } from '../interfaces/kill-timer-data.interface';

interface GapTimelineEntry {
  mapId: string;
  mapName: string;
  gapType: CoverageGapType;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number;
}

/**
 * Service responsible for kill detection, recording, and kill-related queries.
 */
@Injectable()
export class EventKillService {
  private readonly logger = new Logger(EventKillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitterService,
    private readonly pointsService: EventPointsService,
    private readonly trackingService: EventTrackingService,
    private readonly summaryService: EventSummaryService,
    @InjectQueue(RESPAWN_WINDOW_QUEUE)
    private readonly respawnWindowQueue: Queue<AutoCloseRespawnWindowJobData>,
  ) {}

  /**
   * Get timers for event heroes.
   */
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

    // For heroes without ID, we need to match by name in the npc JSON
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

        // Batch fetch members for name-matched timers to avoid N+1
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

      // Batch fetch members for all name-matched timers to avoid N+1
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

  /**
   * Get hero stats for an event.
   */
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
      killCount: hero.kills.length,
    }));
  }

  /**
   * Check if NPC is an event hero and record a kill if so.
   */
  async checkAndRecordEventHeroKill(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
    npcIcon: string,
    timerData: KillTimerData,
    isManualClose = false,
  ): Promise<void> {
    const result = await this.findActiveEventHeroByNpc(
      guildId,
      world,
      npcId,
      npcName,
    );

    if (!result) {
      return; // Not an event hero
    }

    let { eventHero } = result;
    const { event } = result;

    // Update hero's npcId and npcIcon if missing
    if (eventHero.npcId === null || eventHero.npcIcon === null) {
      eventHero = await this.prisma.eventHeroNpc.update({
        where: { id: eventHero.id },
        data: {
          ...(eventHero.npcId === null && { npcId }),
          ...(eventHero.npcIcon === null && { npcIcon }),
        },
      });
      this.logger.log({
        message: 'Hero NPC data updated',
        heroId: eventHero.id,
        npcId: eventHero.npcId,
        npcIcon: eventHero.npcIcon,
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
  }

  /**
   * Find an active event hero by NPC ID or name.
   */
  async findActiveEventHeroByNpc(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
  ): Promise<{ eventHero: EventHeroNpc; event: Event } | null> {
    const now = new Date();

    // First try to match by npcId
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

    // If not found by ID, try by name
    if (!heroNpc) {
      heroNpc = await this.prisma.eventHeroNpc.findFirst({
        where: {
          npcName,
          npcId: null, // Only match by name for heroes without explicit npcId
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

  /**
   * Record a hero kill and calculate points for all assigned members.
   */
  async recordHeroKill(
    guildId: string,
    eventHero: EventHeroNpc,
    event: Event,
    timerData: KillTimerData,
    isManualClose = false,
  ) {
    const killedAt = new Date();

    // Get all maps for this hero with assigned members
    const heroMaps = await this.prisma.eventMap.findMany({
      where: { heroNpcId: eventHero.id },
      include: {
        assignedMembers: true,
      },
    });

    // Collect unique assigned members
    const memberMapAssignments = new Map<number, string[]>();
    for (const map of heroMaps) {
      for (const member of map.assignedMembers) {
        const maps = memberMapAssignments.get(member.id) || [];
        maps.push(map.mapName);
        memberMapAssignments.set(member.id, maps);
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

    // Check if autoCalculatePoints is enabled
    const shouldCalculatePoints = event.autoCalculatePoints !== false;

    // Create kill record with points in a transaction
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
        timeOnMapSeconds: number;
        afkPercentage: number;
        wasPresent: boolean;
      }> = [];

      // Create points for each assigned member (only if autoCalculatePoints is enabled)
      if (shouldCalculatePoints) {
        for (const memberId of assignedMemberIds) {
          const mapNames = memberMapAssignments.get(memberId) || [];
          const presenceStats = await this.pointsService.getMemberPresenceStats(
            eventHero.id,
            memberId,
            timerData.previousMinSpawnTime ?? undefined,
          );

          // Calculate points per-member using their individual map count
          const { points, appliedMultiplier } =
            this.pointsService.calculateMemberPoints(
              event,
              killedAt,
              mapNames.length, // Number of maps THIS member is assigned to
              assignedMemberIds.length,
            );

          killPointsData.push({
            killId: heroKill.id,
            memberId,
            mapName: mapNames.join(', '),
            basePoints: event.basePointsPerKill,
            points,
            appliedMultiplier,
            timeOnMapSeconds: presenceStats.timeOnMapSeconds,
            afkPercentage: presenceStats.afkPercentage,
            wasPresent: presenceStats.wasPresent,
          });
        }

        // Batch create all kill points
        if (killPointsData.length > 0) {
          await tx.eventKillPoint.createMany({
            data: killPointsData,
          });
        }
      }

      // Clear map assignments for this hero after recording the kill
      for (const map of heroMaps) {
        await tx.eventMap.update({
          where: { id: map.id },
          data: {
            assignedMembers: { set: [] },
          },
        });
      }

      // Close all assignment history records for this hero's maps
      await tx.eventMapAssignmentHistory.updateMany({
        where: {
          mapId: { in: heroMaps.map((m) => m.id) },
          unassignedAt: null,
        },
        data: { unassignedAt: killedAt },
      });

      // Fetch the created points
      const createdPoints = await tx.eventKillPoint.findMany({
        where: { killId: heroKill.id },
      });

      return {
        kill: heroKill,
        points: createdPoints,
        clearedMapIds: heroMaps.map((m) => m.id),
      };
    });

    // Update rankings (only if autoCalculatePoints is enabled)
    if (shouldCalculatePoints && kill.points.length > 0) {
      await this.pointsService.updateRankingAfterKill(
        event.id,
        eventHero.npcName,
        kill.points,
      );
    }

    // Close all coverage gaps for this hero
    await this.trackingService.closeAllGapsForHero(eventHero.id);

    // Create respawn window summary and clean up raw tracking data
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

    // Cancel any scheduled auto-close job for this hero
    await this.cancelScheduledAutoClose(eventHero.id);

    // Emit real-time events
    await this.eventEmitter.emitHeroKilled(guildId, event.id, kill.kill.id);

    // For real kills (not manual close), emit window events and schedule auto-close
    // Manual close already handles these events in closeRespawnWindow()
    if (!isManualClose) {
      // Emit window closed (old window)
      await this.eventEmitter.emitRespawnWindowClosed(
        guildId,
        event.id,
        eventHero.id,
      );

      // Emit window opened (new window) - only if we have valid spawn times
      if (timerData.minSpawnTime && timerData.maxSpawnTime) {
        await this.eventEmitter.emitRespawnWindowOpened(
          guildId,
          event.id,
          eventHero.id,
        );

        // Schedule auto-close for the new window
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

    // Emit map status updates for cleared assignments
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

  /**
   * Get kill history for a specific hero with pagination.
   */
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

  /**
   * Get kill history for an entire event with pagination.
   */
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

  /**
   * Get detailed information about a specific kill.
   */
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

    // Get window duration from summary (useful for manual closes)
    const summary = await this.prisma.eventRespawnWindowSummary.findUnique({
      where: { killId },
      select: { totalWindowSeconds: true },
    });

    return {
      kill: {
        ...kill,
        windowDurationSeconds: summary?.totalWindowSeconds ?? null,
      },
      eventConfig: {
        autoCalculatePoints: kill.heroNpc.event.autoCalculatePoints,
        basePointsPerKill: kill.heroNpc.event.basePointsPerKill,
        timeOfDayMultipliers: kill.heroNpc.event.timeOfDayMultipliers,
        trackersMultipliers: kill.heroNpc.event.trackersMultipliers,
        mapsCountMultipliers: kill.heroNpc.event.mapsCountMultipliers,
      },
    };
  }

  /**
   * Get timeline data for maps during a kill event.
   */
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

    // Query summary for this kill to get gaps timeline
    // Raw gaps are deleted after summary creation, so we read from the summary
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

        // Get gaps for this map from summary instead of raw records
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

  /**
   * Cancel any scheduled auto-close job for a hero.
   */
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

  /**
   * Schedule auto-close for a new respawn window after a kill.
   */
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

  /**
   * Generate synthetic negative npcId from heroId for heroes without real npcId.
   */
  private getSyntheticNpcId(heroId: string): number {
    let hash = 0;
    for (let i = 0; i < heroId.length; i++) {
      hash = ((hash << 5) - hash) + heroId.charCodeAt(i);
      hash |= 0;
    }
    return -Math.abs(hash || 1);
  }
}
