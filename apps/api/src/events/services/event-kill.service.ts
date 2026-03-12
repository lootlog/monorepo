import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import {
  CoverageGapType,
  Event,
  EventHeroNpc,
  type Prisma,
} from "generated/client";
import { PrismaService } from "src/db/prisma.service";
import { RedisService } from "src/lib/redis/redis.service";
import { EventEmitterService } from "./event-emitter.service";
import { EventPointsService } from "./event-points.service";
import { EventTrackingService } from "./event-tracking.service";
import { EventSummaryService } from "./event-summary.service";
import { RESPAWN_WINDOW_QUEUE } from "../constants/respawn-queue.constant";
import type { AutoCloseRespawnWindowJobData } from "../respawn-window.processor";
import type { KillTimerData } from "../interfaces/kill-timer-data.interface";
import { getSyntheticNpcId } from "../utils/get-synthetic-npc-id";
import {
  buildRespawnAutoCloseJobId,
  getRespawnAutoCloseDelay,
  RESPAWN_AUTO_CLOSE_JOB_NAME,
} from "../utils/respawn-auto-close-job";
import {
  buildEventHeroKillDedupKey,
  buildEventHeroKillHeroDedupKey,
  getEventHeroKillWindowKey,
} from "../utils/event-hero-kill-job";
import {
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from "../utils/scoring-rules.util";
import { resolveEventWindowStart } from "../utils/resolve-event-window-start.util";

const EVENT_KILL_LOCK_TTL_SECONDS = 30;
const EVENT_KILL_DEDUP_TTL_SECONDS = 120;

interface GapTimelineEntry {
  mapId: string;
  mapName: string;
  gapType: CoverageGapType;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number;
}

export interface EventTimerNpc {
  name: string;
  icon: string | null;
}

type MapPresenceEntry = {
  mapId: string;
  mapName: string;
  presenceTimeSeconds: number;
  afkTimeSeconds: number;
};

type KillPointMapDataEntry = {
  mapId: string;
  mapName: string;
  assignedAt: string;
  unassignedAt: string | null;
  assignmentDurationSeconds: number;
  presenceTimeSeconds: number;
  afkTimeSeconds: number;
};

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
      select: {
        id: true,
        heroNpcs: {
          select: {
            npcId: true,
            npcName: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
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
    const combined: Array<{
      npcId: number;
      world: string;
      minSpawnTime: Date;
      maxSpawnTime: Date;
      npc: unknown;
    }> = [];
    const seen = new Set<number>();

    if (npcIds.length > 0) {
      const idMatchTimers = await this.prisma.timer.findMany({
        where: {
          guildId,
          world,
          npcId: { in: npcIds },
          maxSpawnTime: { gt: now },
        },
        select: {
          npcId: true,
          world: true,
          minSpawnTime: true,
          maxSpawnTime: true,
          npc: true,
        },
      });

      for (const timer of idMatchTimers) {
        if (!seen.has(timer.npcId)) {
          seen.add(timer.npcId);
          combined.push(timer);
        }
      }
    }

    if (npcNames.length > 0) {
      const nameMatchTimers = await this.prisma.$queryRaw<
        Array<{
          npcId: number;
          world: string;
          minSpawnTime: Date;
          maxSpawnTime: Date;
          npc: unknown;
        }>
      >`
        SELECT
          t."npcId",
          t."world",
          t."minSpawnTime",
          t."maxSpawnTime",
          t."npc"
        FROM "Timer" t
        WHERE t."guildId" = ${guildId}
          AND t."world" = ${world}
          AND t."maxSpawnTime" > ${now}
          AND t."npc"->>'name' = ANY(${npcNames}::text[])
      `;

      for (const timer of nameMatchTimers) {
        if (!seen.has(timer.npcId)) {
          seen.add(timer.npcId);
          combined.push(timer);
        }
      }
    }

    return combined.map((timer) => ({
      npcId: timer.npcId,
      world: timer.world,
      minSpawnTime: timer.minSpawnTime,
      maxSpawnTime: timer.maxSpawnTime,
      npc: this.extractEventTimerNpc(timer.npc),
    }));
  }

  private extractEventTimerNpc(npcData: unknown): EventTimerNpc {
    if (!npcData || typeof npcData !== "object") {
      return { name: "", icon: null };
    }
    const npc = npcData as { name?: unknown; icon?: unknown };
    return {
      name: typeof npc.name === "string" ? npc.name : "",
      icon: typeof npc.icon === "string" ? npc.icon : null,
    };
  }

  async getEventHeroStats(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      include: {
        heroNpcs: {
          select: {
            id: true,
            npcId: true,
            npcName: true,
            npcLvl: true,
            _count: {
              select: {
                kills: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return event.heroNpcs.map((hero) => ({
      heroId: hero.id,
      npcId: hero.npcId,
      npcName: hero.npcName,
      npcLvl: hero.npcLvl,
      killCount: hero._count.kills,
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
    const windowKey = getEventHeroKillWindowKey(timerData);
    const dedupKey = this.getEventKillDedupKey(
      guildId,
      world,
      npcId,
      windowKey,
      isManualClose,
    );

    const dedupHit = await this.redis.get(dedupKey);
    if (dedupHit) {
      this.logger.debug({
        message: "Skipping duplicate event hero kill - dedup window active",
        guildId,
        world,
        npcId,
        npcName,
      });
      return;
    }

    // Try to acquire lock - if another request already has it, silently return
    const lockAcquired = await this.redis.setNX(
      lockKey,
      Date.now().toString(),
      EVENT_KILL_LOCK_TTL_SECONDS,
    );

    if (!lockAcquired) {
      this.logger.debug({
        message: "Skipping duplicate event hero kill - lock already held",
        guildId,
        world,
        npcId,
        npcName,
      });
      return;
    }

    try {
      const dedupHitAfterLock = await this.redis.get(dedupKey);
      if (dedupHitAfterLock) {
        this.logger.debug({
          message:
            "Skipping duplicate event hero kill - dedup window active after lock",
          guildId,
          world,
          npcId,
          npcName,
        });
        return;
      }

      const matches = await this.findActiveEventHeroesByNpc(
        guildId,
        world,
        npcId,
        npcName,
      );

      if (matches.length === 0) {
        return;
      }

      for (const match of matches) {
        let { eventHero } = match;
        const { event } = match;
        const heroDedupKey = this.getEventKillHeroDedupKey(
          guildId,
          world,
          npcId,
          eventHero.id,
          windowKey,
          isManualClose,
        );

        const heroDedupHit = await this.redis.get(heroDedupKey);
        if (heroDedupHit) {
          this.logger.debug({
            message: "Skipping duplicate event hero kill for hero",
            guildId,
            world,
            npcId,
            heroId: eventHero.id,
            eventId: event.id,
          });
          continue;
        }

        const updateData = {
          ...(eventHero.npcId === null && { npcId }),
          ...(eventHero.npcIcon === null && { npcIcon }),
          ...(eventHero.npcLvl === null && npcLvl !== undefined && { npcLvl }),
        };

        if (Object.keys(updateData).length > 0) {
          eventHero = await this.prisma.eventHeroNpc.update({
            where: { id: eventHero.id },
            data: updateData,
          });
          this.logger.log({
            message: "Hero NPC data updated",
            heroId: eventHero.id,
            npcId: eventHero.npcId,
            npcIcon: eventHero.npcIcon,
            npcLvl: eventHero.npcLvl,
          });
        }

        await this.recordHeroKill(
          guildId,
          eventHero,
          event,
          timerData,
          isManualClose,
        );

        await this.redis.set(
          heroDedupKey,
          Date.now().toString(),
          EVENT_KILL_DEDUP_TTL_SECONDS,
        );

        this.logger.log({
          message: isManualClose
            ? "Manual close recorded"
            : "Hero kill recorded",
          guildId,
          eventId: event.id,
          heroId: eventHero.id,
          npcName: eventHero.npcName,
          isManualClose,
        });
      }

      await this.redis.set(
        dedupKey,
        Date.now().toString(),
        EVENT_KILL_DEDUP_TTL_SECONDS,
      );
    } finally {
      // Always release lock
      await this.redis.del(lockKey).catch((err) => {
        this.logger.error({
          message: "Failed to release event kill lock",
          lockKey,
          error: err instanceof Error ? err.message : err,
        });
      });
    }
  }

  async findActiveEventHeroesByNpc(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
  ): Promise<Array<{ eventHero: EventHeroNpc; event: Event }>> {
    const now = new Date();

    const directIdMatches = await this.prisma.eventHeroNpc.findMany({
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

    const nameMatches = await this.prisma.eventHeroNpc.findMany({
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

    const uniqueMatches = new Map<
      string,
      { eventHero: EventHeroNpc; event: Event }
    >();
    for (const hero of [...directIdMatches, ...nameMatches]) {
      uniqueMatches.set(hero.id, { eventHero: hero, event: hero.event });
    }

    return Array.from(uniqueMatches.values()).sort((a, b) => {
      const aStart =
        a.event.startsAt?.getTime() ?? a.event.createdAt?.getTime?.() ?? 0;
      const bStart =
        b.event.startsAt?.getTime() ?? b.event.createdAt?.getTime?.() ?? 0;
      return bStart - aStart;
    });
  }

  async findActiveEventHeroByNpc(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
  ): Promise<{ eventHero: EventHeroNpc; event: Event } | null> {
    const matches = await this.findActiveEventHeroesByNpc(
      guildId,
      world,
      npcId,
      npcName,
    );
    return matches[0] ?? null;
  }

  async recordHeroKill(
    guildId: string,
    eventHero: EventHeroNpc,
    event: Event,
    timerData: KillTimerData,
    isManualClose = false,
  ) {
    const killedAt = new Date();
    const windowOpenedAt =
      timerData.windowOpenedAt ?? timerData.previousMinSpawnTime ?? killedAt;
    const scoringWindowStartTime =
      windowOpenedAt > killedAt ? killedAt : windowOpenedAt;
    const minSpawnTimeAtKill = timerData.previousMinSpawnTime ?? killedAt;
    const maxSpawnTimeAtKill = timerData.previousMaxSpawnTime ?? killedAt;
    const trackingWindowStartTime =
      minSpawnTimeAtKill > killedAt ? killedAt : minSpawnTimeAtKill;
    const trackingWindowDurationSeconds = Math.max(
      0,
      Math.floor(
        (killedAt.getTime() - trackingWindowStartTime.getTime()) / 1000,
      ),
    );

    const heroMaps = await this.prisma.eventMap.findMany({
      where: { heroNpcId: eventHero.id },
      select: {
        id: true,
        mapName: true,
      },
    });

    const mapIdToName = new Map<string, string>();
    for (const map of heroMaps) {
      mapIdToName.set(map.id, map.mapName);
    }

    const scoringMode = normalizeEventScoringMode(
      (event as { scoringMode?: unknown }).scoringMode,
    );
    const scoringRules =
      scoringMode === "ADVANCED"
        ? normalizeEventScoringRules(event.scoringRules)
        : null;
    const confirmationMinutes = Math.max(
      0,
      event.participationConfirmationMinutes ?? 0,
    );
    const confirmationDeadlineAt =
      confirmationMinutes > 0
        ? new Date(killedAt.getTime() + confirmationMinutes * 60_000)
        : null;
    const autoConfirmedAt = confirmationMinutes > 0 ? null : killedAt;

    const kill = await this.prisma.$transaction(async (tx) => {
      const heroKill = await tx.eventHeroKill.create({
        data: {
          heroNpcId: eventHero.id,
          killedAt,
          minSpawnTimeAtKill,
          maxSpawnTimeAtKill,
          timerCreatedById: timerData.memberId,
          isManualClose,
        },
      });

      const killPointsData: Array<{
        killId: string;
        memberId: number;
        basePoints: number;
        points: number;
        trackingDurationSeconds: number | null;
        trackingDurationPercentage: number | null;
        timeOnMapSeconds: number;
        afkPercentage: number;
        wasPresent: boolean;
        bonusBreakdown: Prisma.InputJsonValue;
        mapPresenceData: Array<{
          mapId: string;
          mapName: string;
          presenceTimeSeconds: number;
          afkTimeSeconds: number;
        }>;
        confirmationDeadlineAt: Date | null;
        confirmedAt: Date | null;
      }> = [];

      const mapIds = heroMaps.map((m) => m.id);
      const assignmentHistory = await tx.eventMapAssignmentHistory.findMany({
        where: {
          mapId: { in: mapIds },
          assignedAt: { lte: killedAt },
          OR: [
            { unassignedAt: null },
            { unassignedAt: { gte: scoringWindowStartTime } },
          ],
        },
        select: {
          mapId: true,
          memberId: true,
          assignedAt: true,
          unassignedAt: true,
        },
        orderBy: { assignedAt: "asc" },
      });

      const memberMapIds = new Map<number, Set<string>>();
      const memberAssignmentsHistory = new Map<
        number,
        Array<{
          mapId: string;
          assignedAt: Date;
          unassignedAt: Date | null;
        }>
      >();
      const memberTrackingIntervals = new Map<
        number,
        Array<{ start: Date; end: Date }>
      >();

      for (const history of assignmentHistory) {
        if (!memberAssignmentsHistory.has(history.memberId)) {
          memberAssignmentsHistory.set(history.memberId, []);
        }
        memberAssignmentsHistory.get(history.memberId)?.push({
          mapId: history.mapId,
          assignedAt: history.assignedAt,
          unassignedAt: history.unassignedAt ?? null,
        });

        const clippedTrackingInterval = this.clipIntervalToWindow({
          start: history.assignedAt,
          end: history.unassignedAt ?? killedAt,
          windowStart: trackingWindowStartTime,
          windowEnd: killedAt,
        });

        if (!clippedTrackingInterval) {
          continue;
        }

        if (!memberMapIds.has(history.memberId)) {
          memberMapIds.set(history.memberId, new Set<string>());
        }
        memberMapIds.get(history.memberId)?.add(history.mapId);

        if (clippedTrackingInterval.end > clippedTrackingInterval.start) {
          if (!memberTrackingIntervals.has(history.memberId)) {
            memberTrackingIntervals.set(history.memberId, []);
          }
          memberTrackingIntervals
            .get(history.memberId)
            ?.push(clippedTrackingInterval);
        }
      }

      const assignedMemberIds = Array.from(memberMapIds.keys());
      if (assignedMemberIds.length === 0) {
        this.logger.log({
          message: "No assignments for hero kill in current window",
          heroId: eventHero.id,
          eventId: event.id,
        });
      }

      for (const memberId of assignedMemberIds) {
        const memberAssignedMapIds = Array.from(
          memberMapIds.get(memberId) ?? [],
        );

        const presenceStats = await this.pointsService.getMemberPresenceStats(
          eventHero.id,
          memberId,
          scoringWindowStartTime,
        );

        const perMapPresenceStats =
          await this.pointsService.getMemberPresenceStatsPerMap(
            memberAssignedMapIds,
            memberId,
            scoringWindowStartTime,
          );

        const mapPresenceData = perMapPresenceStats.map((stat) => ({
          mapId: stat.mapId,
          mapName: mapIdToName.get(stat.mapId) || "",
          presenceTimeSeconds: stat.presenceTimeSeconds,
          afkTimeSeconds: stat.afkTimeSeconds,
        }));

        const trackingIntervals = memberTrackingIntervals.get(memberId) ?? [];
        const trackingDurationSeconds =
          this.calculateTrackingDurationSeconds(trackingIntervals);

        const trackingDurationPercentage =
          trackingDurationSeconds !== null && trackingWindowDurationSeconds > 0
            ? Math.min(
                100,
                Math.round(
                  (trackingDurationSeconds / trackingWindowDurationSeconds) *
                    100,
                ),
              )
            : undefined;

        const memberAssignments = memberAssignmentsHistory.get(memberId) ?? [];
        let memberPresentAtKill = false;
        let memberLeaveTime: Date | null = null;

        for (const assignment of memberAssignments) {
          if (assignment.assignedAt > killedAt) {
            continue;
          }

          if (!assignment.unassignedAt || assignment.unassignedAt >= killedAt) {
            memberPresentAtKill = true;
            continue;
          }

          if (
            assignment.unassignedAt >= trackingWindowStartTime &&
            assignment.unassignedAt < killedAt &&
            (!memberLeaveTime || assignment.unassignedAt > memberLeaveTime)
          ) {
            memberLeaveTime = assignment.unassignedAt;
          }
        }

        const { totalPoints, basePoints, appliedBonuses } =
          this.pointsService.calculateMemberPoints({
            scoringMode,
            scoringRules,
            eligible: true,
            trackingDurationPercentage,
            trackingDurationSeconds: trackingDurationSeconds ?? undefined,
            assignedMembersCount: assignedMemberIds.length,
            killTime: killedAt,
            respawnStartTime: trackingWindowStartTime,
            maxRespawnTime: maxSpawnTimeAtKill,
            memberLeaveTime: memberPresentAtKill ? null : memberLeaveTime,
            memberPresentAtKill,
            timeOnMapSeconds: presenceStats.timeOnMapSeconds,
            afkPercentage: presenceStats.afkPercentage,
            wasPresent: presenceStats.wasPresent,
          });

        killPointsData.push({
          killId: heroKill.id,
          memberId,
          basePoints,
          points: totalPoints,
          trackingDurationSeconds,
          trackingDurationPercentage: trackingDurationPercentage ?? null,
          timeOnMapSeconds: presenceStats.timeOnMapSeconds,
          afkPercentage: presenceStats.afkPercentage,
          wasPresent: presenceStats.wasPresent,
          bonusBreakdown: appliedBonuses as Prisma.InputJsonValue,
          mapPresenceData,
          confirmationDeadlineAt,
          confirmedAt: autoConfirmedAt,
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
        message: "Opened UNASSIGNED gaps for new respawn window",
        heroId: eventHero.id,
        mapsCount: heroMaps.length,
      });
    }

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
      await this.eventEmitter.emitMapStatusUpdate(guildId, event.id, map.id);
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
      select: { id: true },
    });

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const kills = await this.prisma.eventHeroKill.findMany({
      where: {
        heroNpcId: heroId,
        ...(cursor && { id: { lt: cursor } }),
      },
      orderBy: { killedAt: "desc" },
      take: limit + 1,
      include: {
        heroNpc: {
          select: {
            id: true,
            npcId: true,
            npcName: true,
            npcIcon: true,
            npcLvl: true,
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
              },
            },
          },
        },
      },
    });

    const hasMore = kills.length > limit;
    const paginatedKills = hasMore ? kills.slice(0, limit) : kills;
    const windowStartByKillId =
      await this.getEffectiveWindowStartByKillId(paginatedKills);
    const mapDataByKillMember = await this.buildKillPointMapDataByKillMember(
      paginatedKills,
      windowStartByKillId,
    );
    const data = paginatedKills.map((kill) => ({
      ...kill,
      points: kill.points.map((point) => ({
        ...point,
        mapData: mapDataByKillMember.get(`${kill.id}:${point.memberId}`) ?? [],
      })),
    }));
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
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const kills = await this.prisma.eventHeroKill.findMany({
      where: {
        heroNpc: {
          eventId,
          ...(heroId && { id: heroId }),
        },
        ...(cursor && { id: { lt: cursor } }),
      },
      orderBy: { killedAt: "desc" },
      take: limit + 1,
      include: {
        heroNpc: {
          select: {
            id: true,
            npcId: true,
            npcName: true,
            npcIcon: true,
            npcLvl: true,
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
              },
            },
          },
        },
      },
    });

    const hasMore = kills.length > limit;
    const paginatedKills = hasMore ? kills.slice(0, limit) : kills;
    const windowStartByKillId =
      await this.getEffectiveWindowStartByKillId(paginatedKills);
    const mapDataByKillMember = await this.buildKillPointMapDataByKillMember(
      paginatedKills,
      windowStartByKillId,
    );
    const data = paginatedKills.map((kill) => ({
      ...kill,
      points: kill.points.map((point) => ({
        ...point,
        mapData: mapDataByKillMember.get(`${kill.id}:${point.memberId}`) ?? [],
      })),
    }));
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return {
      data,
      nextCursor,
    };
  }

  async getMemberKillHistory(
    guildId: string,
    eventId: string,
    memberId: number,
    limit = 20,
    cursor?: string,
    heroId?: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, guildId },
      select: {
        id: true,
        name: true,
        avatar: true,
        userId: true,
      },
    });

    if (!member) {
      throw new NotFoundException("Member not found");
    }

    const kills = await this.prisma.eventHeroKill.findMany({
      where: {
        heroNpc: {
          eventId,
          ...(heroId && { id: heroId }),
        },
        points: {
          some: {
            memberId,
          },
        },
        ...(cursor && { id: { lt: cursor } }),
      },
      orderBy: { killedAt: "desc" },
      take: limit + 1,
      include: {
        heroNpc: {
          select: {
            id: true,
            npcId: true,
            npcName: true,
            npcIcon: true,
            npcLvl: true,
          },
        },
        points: {
          where: {
            memberId,
          },
          include: {
            member: {
              select: {
                id: true,
                name: true,
                avatar: true,
                userId: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    const hasMore = kills.length > limit;
    const paginatedKills = hasMore ? kills.slice(0, limit) : kills;
    const windowStartByKillId =
      await this.getEffectiveWindowStartByKillId(paginatedKills);
    const mapDataByKillMember = await this.buildKillPointMapDataByKillMember(
      paginatedKills,
      windowStartByKillId,
    );
    const data = paginatedKills.map(({ points, ...kill }) => {
      const latestPoint = points[0] ?? null;
      const normalizedMemberPoint = latestPoint
        ? this.normalizeKillPointTracking(
            latestPoint,
            kill.killedAt,
            kill.minSpawnTimeAtKill,
          )
        : null;
      const memberPoint = normalizedMemberPoint
        ? {
            ...normalizedMemberPoint,
            mapData:
              mapDataByKillMember.get(
                `${kill.id}:${normalizedMemberPoint.memberId}`,
              ) ?? [],
          }
        : null;

      return {
        ...kill,
        memberPoint,
      };
    });
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return {
      member,
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
                  orderBy: {
                    position: "desc",
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!kill) {
      throw new NotFoundException("Kill not found");
    }

    const heroMaps = await this.prisma.eventMap.findMany({
      where: { heroNpcId: heroId },
      select: { id: true, mapName: true },
    });
    const windowStartByKillId = await this.getEffectiveWindowStartByKillId([
      kill,
    ]);
    const overlapWindowStartTime =
      windowStartByKillId.get(kill.id) ??
      this.getTrackingWindowStartTime(kill.killedAt, kill.minSpawnTimeAtKill);

    const mapIdToName = new Map(heroMaps.map((m) => [m.id, m.mapName]));
    const mapIds = heroMaps.map((m) => m.id);
    const memberIds = [...new Set(kill.points.map((point) => point.memberId))];
    const trackingWindowStartTime = this.getTrackingWindowStartTime(
      kill.killedAt,
      kill.minSpawnTimeAtKill,
    );
    const normalizedPoints = kill.points.map((point) =>
      this.normalizeKillPointTracking(
        point,
        kill.killedAt,
        kill.minSpawnTimeAtKill,
      ),
    );

    const assignments = await this.prisma.eventMapAssignmentHistory.findMany({
      where: {
        mapId: { in: mapIds },
        memberId: { in: memberIds },
        assignedAt: { lte: kill.killedAt },
        OR: [
          { unassignedAt: null },
          { unassignedAt: { gte: overlapWindowStartTime } },
        ],
      },
      select: {
        mapId: true,
        memberId: true,
        assignedAt: true,
        unassignedAt: true,
      },
      orderBy: [{ memberId: "asc" }, { assignedAt: "asc" }],
    });

    const assignmentsByMember = new Map<
      number,
      Array<{
        mapId: string;
        assignedAt: Date;
        unassignedAt: Date | null;
      }>
    >();
    for (const assignment of assignments) {
      if (!assignmentsByMember.has(assignment.memberId)) {
        assignmentsByMember.set(assignment.memberId, []);
      }
      assignmentsByMember.get(assignment.memberId)?.push({
        mapId: assignment.mapId,
        assignedAt: assignment.assignedAt,
        unassignedAt: assignment.unassignedAt,
      });
    }

    const fallbackMemberIds = [
      ...new Set(
        normalizedPoints
          .filter((point) => {
            const storedMapPresence = point.mapPresenceData as
              | MapPresenceEntry[]
              | null;
            return !(storedMapPresence && storedMapPresence.length > 0);
          })
          .map((point) => point.memberId),
      ),
    ];

    const fallbackPresenceStats =
      await this.pointsService.getMembersPresenceStatsPerMap(
        mapIds,
        fallbackMemberIds,
        overlapWindowStartTime,
      );
    const fallbackPresenceByMemberMap = new Map<
      string,
      { presenceTimeSeconds: number; afkTimeSeconds: number }
    >();
    for (const stat of fallbackPresenceStats) {
      fallbackPresenceByMemberMap.set(`${stat.memberId}:${stat.mapId}`, {
        presenceTimeSeconds: stat.presenceTimeSeconds,
        afkTimeSeconds: stat.afkTimeSeconds,
      });
    }

    const pointsWithMapData = normalizedPoints.map((point) => {
      const pointAssignments = assignmentsByMember.get(point.memberId) ?? [];
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
        presenceByMapId = new Map(
          [...new Set(pointAssignments.map((a) => a.mapId))].map((mapId) => [
            mapId,
            fallbackPresenceByMemberMap.get(`${point.memberId}:${mapId}`) ?? {
              presenceTimeSeconds: 0,
              afkTimeSeconds: 0,
            },
          ]),
        );
      }

      const mapData = pointAssignments.map((assignment) => {
        const clippedAssignmentInterval = this.clipIntervalToWindow({
          start: assignment.assignedAt,
          end: assignment.unassignedAt ?? kill.killedAt,
          windowStart: trackingWindowStartTime,
          windowEnd: kill.killedAt,
        });
        const assignmentDurationSeconds = clippedAssignmentInterval
          ? Math.round(
              (clippedAssignmentInterval.end.getTime() -
                clippedAssignmentInterval.start.getTime()) /
                1000,
            )
          : 0;

        const presence = presenceByMapId.get(assignment.mapId);

        return {
          mapId: assignment.mapId,
          mapName: mapIdToName.get(assignment.mapId) || "",
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
    });

    const respawnDurationSeconds = Math.max(
      0,
      this.getTrackingWindowDurationSeconds(
        kill.killedAt,
        kill.minSpawnTimeAtKill,
      ),
    );
    const windowDurationSeconds = Math.max(
      0,
      this.getSpawnWindowDurationSeconds(
        kill.minSpawnTimeAtKill,
        kill.maxSpawnTimeAtKill,
      ),
    );
    const scoringMode = normalizeEventScoringMode(
      (kill.heroNpc.event as { scoringMode?: unknown }).scoringMode,
    );
    const scoringRules =
      scoringMode === "ADVANCED"
        ? normalizeEventScoringRules(kill.heroNpc.event.scoringRules)
        : null;

    return {
      kill: {
        ...kill,
        points: pointsWithMapData,
        respawnDurationSeconds,
        windowDurationSeconds,
      },
      eventConfig: {
        scoringMode,
        scoringRules,
      },
    };
  }

  private async buildKillPointMapDataByKillMember(
    kills: Array<{
      id: string;
      heroNpcId: string;
      killedAt: Date;
      minSpawnTimeAtKill: Date;
      points: Array<{
        memberId: number;
        mapPresenceData?: Prisma.JsonValue | null;
      }>;
    }>,
    windowStartByKillId: Map<string, Date>,
  ): Promise<Map<string, KillPointMapDataEntry[]>> {
    const mapDataByKillMember = new Map<string, KillPointMapDataEntry[]>();

    if (kills.length === 0) {
      return mapDataByKillMember;
    }

    const heroIds = [...new Set(kills.map((kill) => kill.heroNpcId))];
    const memberIds = [
      ...new Set(
        kills.flatMap((kill) => kill.points.map((point) => point.memberId)),
      ),
    ];

    if (heroIds.length === 0 || memberIds.length === 0) {
      return mapDataByKillMember;
    }

    const maxKillTime = new Date(
      Math.max(...kills.map((kill) => kill.killedAt.getTime())),
    );
    const minTrackingWindowStart = new Date(
      Math.min(
        ...kills.map((kill) =>
          (
            windowStartByKillId.get(kill.id) ??
            this.getTrackingWindowStartTime(
              kill.killedAt,
              kill.minSpawnTimeAtKill,
            )
          ).getTime(),
        ),
      ),
    );

    const heroMaps =
      (await this.prisma.eventMap.findMany({
        where: { heroNpcId: { in: heroIds } },
        select: { id: true, mapName: true, heroNpcId: true },
      })) ?? [];
    if (heroMaps.length === 0) {
      return mapDataByKillMember;
    }

    const mapIdToName = new Map(heroMaps.map((map) => [map.id, map.mapName]));
    const assignments =
      (await this.prisma.eventMapAssignmentHistory.findMany({
        where: {
          heroNpcId: { in: heroIds },
          memberId: { in: memberIds },
          assignedAt: { lte: maxKillTime },
          OR: [
            { unassignedAt: null },
            { unassignedAt: { gte: minTrackingWindowStart } },
          ],
        },
        select: {
          heroNpcId: true,
          mapId: true,
          memberId: true,
          assignedAt: true,
          unassignedAt: true,
        },
        orderBy: [{ memberId: "asc" }, { assignedAt: "asc" }],
      })) ?? [];

    const assignmentsByHeroMember = new Map<
      string,
      Array<{
        mapId: string;
        memberId: number;
        assignedAt: Date;
        unassignedAt: Date | null;
      }>
    >();
    for (const assignment of assignments) {
      const key = `${assignment.heroNpcId}:${assignment.memberId}`;
      const current = assignmentsByHeroMember.get(key) ?? [];
      current.push({
        mapId: assignment.mapId,
        memberId: assignment.memberId,
        assignedAt: assignment.assignedAt,
        unassignedAt: assignment.unassignedAt,
      });
      assignmentsByHeroMember.set(key, current);
    }

    for (const kill of kills) {
      const overlapWindowStartTime =
        windowStartByKillId.get(kill.id) ??
        this.getTrackingWindowStartTime(kill.killedAt, kill.minSpawnTimeAtKill);

      for (const point of kill.points) {
        const pointAssignments =
          assignmentsByHeroMember.get(`${kill.heroNpcId}:${point.memberId}`) ??
          [];
        const presenceByMapId = this.getPresenceByMapId(point.mapPresenceData);

        const mapData = pointAssignments
          .map((assignment) => {
            const clippedAssignmentInterval = this.clipIntervalToWindow({
              start: assignment.assignedAt,
              end: assignment.unassignedAt ?? kill.killedAt,
              windowStart: overlapWindowStartTime,
              windowEnd: kill.killedAt,
            });
            if (!clippedAssignmentInterval) {
              return null;
            }

            const assignmentDurationSeconds = Math.round(
              (clippedAssignmentInterval.end.getTime() -
                clippedAssignmentInterval.start.getTime()) /
                1000,
            );
            const presence = presenceByMapId.get(assignment.mapId);

            return {
              mapId: assignment.mapId,
              mapName: mapIdToName.get(assignment.mapId) || "",
              assignedAt: assignment.assignedAt.toISOString(),
              unassignedAt: assignment.unassignedAt?.toISOString() || null,
              assignmentDurationSeconds,
              presenceTimeSeconds: presence?.presenceTimeSeconds || 0,
              afkTimeSeconds: presence?.afkTimeSeconds || 0,
            };
          })
          .filter((entry): entry is KillPointMapDataEntry => entry !== null);

        mapDataByKillMember.set(`${kill.id}:${point.memberId}`, mapData);
      }
    }

    return mapDataByKillMember;
  }

  private async getEffectiveWindowStartByKillId(
    kills: Array<{
      id: string;
      killedAt: Date;
      minSpawnTimeAtKill: Date;
    }>,
  ): Promise<Map<string, Date>> {
    const windowStartByKillId = new Map<string, Date>();

    if (kills.length === 0) {
      return windowStartByKillId;
    }

    const windowSummaries =
      await this.prisma.eventRespawnWindowSummary.findMany({
        where: {
          killId: {
            in: kills.map((kill) => kill.id),
          },
        },
        select: {
          killId: true,
          windowOpenedAt: true,
        },
      });
    const windowOpenedAtByKillId = new Map(
      windowSummaries.flatMap((summary) =>
        summary.killId
          ? [[summary.killId, summary.windowOpenedAt] as const]
          : [],
      ),
    );

    for (const kill of kills) {
      windowStartByKillId.set(
        kill.id,
        resolveEventWindowStart({
          killedAt: kill.killedAt,
          minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
          windowOpenedAt: windowOpenedAtByKillId.get(kill.id),
        }),
      );
    }

    return windowStartByKillId;
  }

  private getPresenceByMapId(
    mapPresenceData: Prisma.JsonValue | null | undefined,
  ): Map<string, { presenceTimeSeconds: number; afkTimeSeconds: number }> {
    const presenceByMapId = new Map<
      string,
      { presenceTimeSeconds: number; afkTimeSeconds: number }
    >();
    if (!Array.isArray(mapPresenceData)) {
      return presenceByMapId;
    }

    for (const entry of mapPresenceData) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const parsedEntry = entry as {
        mapId?: unknown;
        presenceTimeSeconds?: unknown;
        afkTimeSeconds?: unknown;
      };
      if (
        typeof parsedEntry.mapId !== "string" ||
        parsedEntry.mapId.length < 1
      ) {
        continue;
      }

      const presenceTimeSeconds =
        typeof parsedEntry.presenceTimeSeconds === "number" &&
        Number.isFinite(parsedEntry.presenceTimeSeconds)
          ? Math.max(0, Math.round(parsedEntry.presenceTimeSeconds))
          : 0;
      const afkTimeSeconds =
        typeof parsedEntry.afkTimeSeconds === "number" &&
        Number.isFinite(parsedEntry.afkTimeSeconds)
          ? Math.max(0, Math.round(parsedEntry.afkTimeSeconds))
          : 0;

      presenceByMapId.set(parsedEntry.mapId, {
        presenceTimeSeconds,
        afkTimeSeconds,
      });
    }

    return presenceByMapId;
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
      throw new NotFoundException("Kill not found");
    }

    const summary = await this.prisma.eventRespawnWindowSummary.findUnique({
      where: { killId },
      select: { gapsTimeline: true, windowOpenedAt: true },
    });

    const summaryGaps =
      (summary?.gapsTimeline as unknown as GapTimelineEntry[] | null) ?? [];
    const scoringWindowStartTime =
      summary?.windowOpenedAt ?? kill.minSpawnTimeAtKill;

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
                { unassignedAt: { gte: scoringWindowStartTime } },
              ],
            },
            include: {
              member: {
                select: { id: true, name: true, avatar: true, userId: true },
              },
            },
            orderBy: { assignedAt: "asc" },
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

  private calculateTrackingDurationSeconds(
    intervals: Array<{ start: Date; end: Date }>,
  ): number {
    if (intervals.length === 0) {
      return 0;
    }

    const sortedIntervals = [...intervals].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );

    let totalMs = 0;
    let currentStartMs = sortedIntervals[0].start.getTime();
    let currentEndMs = sortedIntervals[0].end.getTime();

    for (let i = 1; i < sortedIntervals.length; i++) {
      const nextStartMs = sortedIntervals[i].start.getTime();
      const nextEndMs = sortedIntervals[i].end.getTime();

      if (nextStartMs <= currentEndMs) {
        currentEndMs = Math.max(currentEndMs, nextEndMs);
        continue;
      }

      totalMs += currentEndMs - currentStartMs;
      currentStartMs = nextStartMs;
      currentEndMs = nextEndMs;
    }

    totalMs += currentEndMs - currentStartMs;
    return Math.round(totalMs / 1000);
  }

  private clipIntervalToWindow(params: {
    start: Date;
    end: Date;
    windowStart: Date;
    windowEnd: Date;
  }): { start: Date; end: Date } | null {
    const clippedStart =
      params.start > params.windowStart ? params.start : params.windowStart;
    const clippedEnd =
      params.end < params.windowEnd ? params.end : params.windowEnd;

    if (clippedEnd < clippedStart) {
      return null;
    }

    return { start: clippedStart, end: clippedEnd };
  }

  private getTrackingWindowStartTime(
    killedAt: Date,
    minSpawnTimeAtKill: Date,
  ): Date {
    return minSpawnTimeAtKill > killedAt ? killedAt : minSpawnTimeAtKill;
  }

  private getTrackingWindowDurationSeconds(
    killedAt: Date,
    minSpawnTimeAtKill: Date,
  ): number {
    const trackingWindowStartTime = this.getTrackingWindowStartTime(
      killedAt,
      minSpawnTimeAtKill,
    );

    return Math.max(
      0,
      Math.floor(
        (killedAt.getTime() - trackingWindowStartTime.getTime()) / 1000,
      ),
    );
  }

  private getSpawnWindowDurationSeconds(
    minSpawnTimeAtKill: Date,
    maxSpawnTimeAtKill: Date,
  ): number {
    return Math.max(
      0,
      Math.floor(
        (maxSpawnTimeAtKill.getTime() - minSpawnTimeAtKill.getTime()) / 1000,
      ),
    );
  }

  private normalizeKillPointTracking<
    T extends {
      trackingDurationSeconds: number | null;
      trackingDurationPercentage: number | null;
    },
  >(point: T, killedAt: Date, minSpawnTimeAtKill: Date): T {
    const windowDurationSeconds = this.getTrackingWindowDurationSeconds(
      killedAt,
      minSpawnTimeAtKill,
    );
    const rawTrackingDurationSeconds = point.trackingDurationSeconds;

    if (
      rawTrackingDurationSeconds === null ||
      rawTrackingDurationSeconds === undefined ||
      !Number.isFinite(rawTrackingDurationSeconds)
    ) {
      return {
        ...point,
        trackingDurationSeconds: null,
        trackingDurationPercentage: null,
      };
    }

    const sanitizedTrackingDurationSeconds = Math.max(
      0,
      Math.round(rawTrackingDurationSeconds),
    );
    const clampedTrackingDurationSeconds = Math.min(
      sanitizedTrackingDurationSeconds,
      windowDurationSeconds,
    );
    const trackingDurationPercentage =
      windowDurationSeconds > 0
        ? Math.min(
            100,
            Math.round(
              (clampedTrackingDurationSeconds / windowDurationSeconds) * 100,
            ),
          )
        : null;

    return {
      ...point,
      trackingDurationSeconds: clampedTrackingDurationSeconds,
      trackingDurationPercentage,
    };
  }

  private async cancelScheduledAutoClose(heroId: string): Promise<void> {
    const delayedJobs = await this.respawnWindowQueue.getJobs(["delayed"]);

    for (const job of delayedJobs) {
      if (job.data.heroId === heroId) {
        await job.remove();
        this.logger.log({
          message: "Cancelled scheduled auto-close job (kill recorded)",
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
    const delay = getRespawnAutoCloseDelay(maxSpawnTime);

    if (delay <= 0) {
      this.logger.log({
        message: "Not scheduling auto-close - maxSpawnTime already passed",
        heroId,
        maxSpawnTime,
      });
      return;
    }

    const effectiveNpcId = npcId ?? getSyntheticNpcId(heroId);
    const jobId = buildRespawnAutoCloseJobId(heroId, maxSpawnTime);

    await this.respawnWindowQueue.add(
      RESPAWN_AUTO_CLOSE_JOB_NAME,
      { guildId, eventId, heroId, npcId: effectiveNpcId, world },
      {
        delay,
        jobId,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    this.logger.log({
      message: "Scheduled auto-close for new respawn window",
      heroId,
      maxSpawnTime,
      delayMs: delay,
      jobId,
    });
  }

  private getEventKillLockKey(
    guildId: string,
    world: string,
    npcId: number,
  ): string {
    return `event:hero:kill:lock:${guildId}:${world}:${npcId}`;
  }

  private getEventKillDedupKey(
    guildId: string,
    world: string,
    npcId: number,
    windowKey: string,
    isManualClose: boolean,
  ): string {
    return buildEventHeroKillDedupKey({
      guildId,
      world,
      npcId,
      windowKey,
      isManualClose,
    });
  }

  private getEventKillHeroDedupKey(
    guildId: string,
    world: string,
    npcId: number,
    heroId: string,
    windowKey: string,
    isManualClose: boolean,
  ): string {
    return buildEventHeroKillHeroDedupKey({
      guildId,
      world,
      npcId,
      heroId,
      windowKey,
      isManualClose,
    });
  }
}
