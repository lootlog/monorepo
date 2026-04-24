import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import type {
  CoverageGapType,
  Event,
  EventHeroNpc,
  Prisma,
} from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { EventEmitterService } from "./event-emitter.service";
import { EventPointsService } from "./event-points.service";
import { EventTrackingService } from "./event-tracking.service";
import { EventSummaryService } from "./event-summary.service";
import { RESPAWN_WINDOW_QUEUE } from "../constants/respawn-queue.constant";
import type { AutoCloseRespawnWindowJobData } from "../interfaces/auto-close-respawn-window-job-data";
import type { KillTimerData } from "../interfaces/kill-timer-data.interface";
import {
  buildEventHeroKillDedupKey,
  buildEventHeroKillHeroDedupKey,
  buildEventHeroKillRecentDedupKey,
  getEventHeroKillWindowKey,
} from "../utils/event-hero-kill-job";
import {
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from "../utils/scoring-rules.util";
import { resolveEventWindowStart } from "../utils/resolve-event-window-start.util";
import {
  calculateTrackingDurationSeconds,
  clipIntervalToWindow,
  getTrackingWindowDurationSeconds,
  getTrackingWindowStartTime,
} from "../utils/tracking-window.util";
import { TimersService } from "src/timers/timers.service";
import {
  findActiveEventHeroesByNpc as findActiveEventHeroMatchesByNpc,
  type ActiveEventHeroMatch,
} from "../utils/find-active-event-heroes-by-npc";

const EVENT_KILL_LOCK_TTL_SECONDS = 30;
const EVENT_KILL_DEDUP_TTL_SECONDS = 120;
const EVENT_KILL_RECENT_DEDUP_TTL_SECONDS = 30;

interface GapTimelineEntry {
  mapId: string;
  mapName: string;
  gapType: CoverageGapType;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number;
}

interface EventTimerNpc {
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

type MemberAssignmentHistoryEntry = {
  mapId: string;
  assignedAt: Date;
  unassignedAt: Date | null;
};

type TrackingInterval = {
  start: Date;
  end: Date;
};

type MemberPresenceStatsEntry = {
  timeOnMapSeconds: number;
  afkPercentage: number;
  wasPresent: boolean;
};

type MemberMapPresenceStatsEntry = {
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
    private readonly timersService: TimersService,
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

    const combined = await this.timersService.getTimersForEventHeroFilters(
      guildId,
      world,
      event.heroNpcs,
    );

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

  private createMapNameLookup(
    maps: Array<{ id: string; mapName: string }>,
  ): Map<string, string> {
    return new Map(maps.map((map) => [map.id, map.mapName]));
  }

  private buildAssignmentHistoryWhere(params: {
    killedAt: Date;
    overlapWindowStartTime: Date;
    mapIds?: string[];
    memberIds?: number[];
    heroNpcIds?: string[];
  }): Prisma.EventMapAssignmentHistoryWhereInput {
    const where: Prisma.EventMapAssignmentHistoryWhereInput = {
      assignedAt: { lte: params.killedAt },
      OR: [
        { unassignedAt: null },
        { unassignedAt: { gte: params.overlapWindowStartTime } },
      ],
    };

    if (params.mapIds) {
      where.mapId = { in: params.mapIds };
    }

    if (params.memberIds) {
      where.memberId = { in: params.memberIds };
    }

    if (params.heroNpcIds) {
      where.heroNpcId = { in: params.heroNpcIds };
    }

    return where;
  }

  private buildMemberAssignmentContext(params: {
    assignmentHistory: Array<{
      mapId: string;
      memberId: number;
      assignedAt: Date;
      unassignedAt: Date | null;
    }>;
    killedAt: Date;
    trackingWindowStartTime: Date;
  }) {
    const memberMapIds = new Map<number, Set<string>>();
    const memberAssignmentsHistory = new Map<
      number,
      MemberAssignmentHistoryEntry[]
    >();
    const memberTrackingIntervals = new Map<number, TrackingInterval[]>();

    for (const historyEntry of params.assignmentHistory) {
      if (!memberAssignmentsHistory.has(historyEntry.memberId)) {
        memberAssignmentsHistory.set(historyEntry.memberId, []);
      }
      memberAssignmentsHistory.get(historyEntry.memberId)?.push({
        mapId: historyEntry.mapId,
        assignedAt: historyEntry.assignedAt,
        unassignedAt: historyEntry.unassignedAt ?? null,
      });

      const clippedTrackingInterval = clipIntervalToWindow({
        start: historyEntry.assignedAt,
        end: historyEntry.unassignedAt ?? params.killedAt,
        windowStart: params.trackingWindowStartTime,
        windowEnd: params.killedAt,
      });

      if (!clippedTrackingInterval) {
        continue;
      }

      if (!memberMapIds.has(historyEntry.memberId)) {
        memberMapIds.set(historyEntry.memberId, new Set<string>());
      }
      memberMapIds.get(historyEntry.memberId)?.add(historyEntry.mapId);

      if (clippedTrackingInterval.end > clippedTrackingInterval.start) {
        if (!memberTrackingIntervals.has(historyEntry.memberId)) {
          memberTrackingIntervals.set(historyEntry.memberId, []);
        }
        memberTrackingIntervals
          .get(historyEntry.memberId)
          ?.push(clippedTrackingInterval);
      }
    }

    return {
      memberAssignmentsHistory,
      memberMapIds,
      memberTrackingIntervals,
    };
  }

  private async buildPresenceLookups(params: {
    eventHeroId: string;
    mapIds: string[];
    memberIds: number[];
    scoringWindowStartTime: Date;
    scoringWindowEndTime: Date;
  }) {
    if (params.memberIds.length === 0) {
      return {
        presenceByMemberId: new Map<number, MemberPresenceStatsEntry>(),
        presenceByMemberMapKey: new Map<string, MemberMapPresenceStatsEntry>(),
      };
    }

    const [presenceStatsByMember, presenceStatsByMemberMap] = await Promise.all(
      [
        this.pointsService.getMembersPresenceStats(
          params.eventHeroId,
          params.memberIds,
          params.scoringWindowStartTime,
          params.scoringWindowEndTime,
        ),
        this.pointsService.getMembersPresenceStatsPerMap(
          params.mapIds,
          params.memberIds,
          params.scoringWindowStartTime,
          params.scoringWindowEndTime,
        ),
      ],
    );

    const presenceByMemberId = new Map<number, MemberPresenceStatsEntry>(
      presenceStatsByMember.map((entry) => [
        entry.memberId,
        {
          timeOnMapSeconds: entry.timeOnMapSeconds,
          afkPercentage: entry.afkPercentage,
          wasPresent: entry.wasPresent,
        },
      ]),
    );
    const presenceByMemberMapKey = new Map<string, MemberMapPresenceStatsEntry>(
      presenceStatsByMemberMap.map((entry) => [
        `${entry.memberId}:${entry.mapId}`,
        {
          presenceTimeSeconds: entry.presenceTimeSeconds,
          afkTimeSeconds: entry.afkTimeSeconds,
        },
      ]),
    );

    return {
      presenceByMemberId,
      presenceByMemberMapKey,
    };
  }

  private buildMapPresenceData(params: {
    mapIds: string[];
    mapNameById: Map<string, string>;
    memberId: number;
    presenceByMemberMapKey: Map<string, MemberMapPresenceStatsEntry>;
  }): MapPresenceEntry[] {
    return params.mapIds.map((mapId) => {
      const presenceStats = params.presenceByMemberMapKey.get(
        `${params.memberId}:${mapId}`,
      );

      return {
        mapId,
        mapName: params.mapNameById.get(mapId) ?? "",
        presenceTimeSeconds: presenceStats?.presenceTimeSeconds ?? 0,
        afkTimeSeconds: presenceStats?.afkTimeSeconds ?? 0,
      };
    });
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
    const recentDedupKey = isManualClose
      ? null
      : this.getEventKillRecentDedupKey(guildId, world, npcId);

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

    if (recentDedupKey) {
      const recentDedupHit = await this.redis.get(recentDedupKey);
      if (recentDedupHit) {
        this.logger.debug({
          message: "Skipping duplicate event hero kill - recent kill active",
          guildId,
          world,
          npcId,
          npcName,
        });
        return;
      }
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

      if (recentDedupKey) {
        const recentDedupHitAfterLock = await this.redis.get(recentDedupKey);
        if (recentDedupHitAfterLock) {
          this.logger.debug({
            message:
              "Skipping duplicate event hero kill - recent kill active after lock",
            guildId,
            world,
            npcId,
            npcName,
          });
          return;
        }
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

      await Promise.all(
        matches.map(async (match) => {
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
            return;
          }

          this.logger.warn({
            message: "Updating hero NPC ID based on timer data",
            guildId,
            world,
            newNpcId: npcId,
            oldHeroNpcId: eventHero.npcId,
          });

          const updateData = {
            ...((eventHero.npcId === null || eventHero.npcId !== npcId) && {
              npcId,
            }),
            ...(eventHero.npcIcon === null && { npcIcon }),
            ...(eventHero.npcLvl === null &&
              npcLvl !== undefined && { npcLvl }),
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
        }),
      );

      await this.redis.set(
        dedupKey,
        Date.now().toString(),
        EVENT_KILL_DEDUP_TTL_SECONDS,
      );

      if (recentDedupKey) {
        await this.redis.set(
          recentDedupKey,
          Date.now().toString(),
          EVENT_KILL_RECENT_DEDUP_TTL_SECONDS,
        );
      }
    } finally {
      // Always release lock
      await this.redis.del(lockKey).catch((error) => {
        this.logger.error({
          message: "Failed to release event kill lock",
          lockKey,
          error: error instanceof Error ? error.message : error,
        });
      });
    }
  }

  async findActiveEventHeroesByNpc(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
  ): Promise<ActiveEventHeroMatch[]> {
    return findActiveEventHeroMatchesByNpc(
      this.prisma,
      guildId,
      world,
      npcId,
      npcName,
    );
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
    const minSpawnTimeAtKill = timerData.previousMinSpawnTime ?? killedAt;
    const maxSpawnTimeAtKill = timerData.previousMaxSpawnTime ?? killedAt;
    const effectiveKilledAt = this.getEffectiveWindowEndAt(
      killedAt,
      maxSpawnTimeAtKill,
    );
    const windowOpenedAt =
      timerData.windowOpenedAt ?? timerData.previousMinSpawnTime ?? killedAt;
    const scoringWindowStartTime =
      windowOpenedAt > effectiveKilledAt ? effectiveKilledAt : windowOpenedAt;
    const trackingWindowStartTime =
      minSpawnTimeAtKill > effectiveKilledAt
        ? effectiveKilledAt
        : minSpawnTimeAtKill;
    const trackingWindowDurationSeconds = Math.max(
      0,
      Math.floor(
        (effectiveKilledAt.getTime() - trackingWindowStartTime.getTime()) /
          1000,
      ),
    );

    const heroMaps = await this.prisma.eventMap.findMany({
      where: { heroNpcId: eventHero.id },
      select: {
        id: true,
        mapName: true,
      },
    });
    const heroMapIds = heroMaps.map((map) => map.id);
    const mapIdToName = this.createMapNameLookup(heroMaps);

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

      const assignmentHistory = await tx.eventMapAssignmentHistory.findMany({
        where: this.buildAssignmentHistoryWhere({
          mapIds: heroMapIds,
          killedAt: effectiveKilledAt,
          overlapWindowStartTime: scoringWindowStartTime,
        }),
        select: {
          mapId: true,
          memberId: true,
          assignedAt: true,
          unassignedAt: true,
        },
        orderBy: { assignedAt: "asc" },
      });
      const {
        memberAssignmentsHistory,
        memberMapIds,
        memberTrackingIntervals,
      } = this.buildMemberAssignmentContext({
        assignmentHistory,
        killedAt: effectiveKilledAt,
        trackingWindowStartTime,
      });

      const assignedMemberIds = Array.from(memberMapIds.keys());
      if (assignedMemberIds.length === 0) {
        this.logger.log({
          message: "No assignments for hero kill in current window",
          heroId: eventHero.id,
          eventId: event.id,
        });
      }

      const { presenceByMemberId, presenceByMemberMapKey } =
        await this.buildPresenceLookups({
          eventHeroId: eventHero.id,
          mapIds: heroMapIds,
          memberIds: assignedMemberIds,
          scoringWindowStartTime,
          scoringWindowEndTime: effectiveKilledAt,
        });

      for (const memberId of assignedMemberIds) {
        const memberAssignedMapIds = Array.from(
          memberMapIds.get(memberId) ?? [],
        );
        const presenceStats = presenceByMemberId.get(memberId) ?? {
          timeOnMapSeconds: 0,
          afkPercentage: 0,
          wasPresent: false,
        };
        const mapPresenceData = this.buildMapPresenceData({
          mapIds: memberAssignedMapIds,
          mapNameById: mapIdToName,
          memberId,
          presenceByMemberMapKey,
        });

        const trackingIntervals = memberTrackingIntervals.get(memberId) ?? [];
        const trackingDurationSeconds =
          calculateTrackingDurationSeconds(trackingIntervals);

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
          if (assignment.assignedAt > effectiveKilledAt) {
            continue;
          }

          if (
            !assignment.unassignedAt ||
            assignment.unassignedAt >= effectiveKilledAt
          ) {
            memberPresentAtKill = true;
            continue;
          }

          if (
            assignment.unassignedAt >= trackingWindowStartTime &&
            assignment.unassignedAt < effectiveKilledAt &&
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
            killTime: effectiveKilledAt,
            respawnStartTime: trackingWindowStartTime,
            maxRespawnTime: maxSpawnTimeAtKill,
            memberLeaveTime: memberPresentAtKill ? null : memberLeaveTime,
            memberPresentAtKill,
            timeOnMapSeconds: presenceStats.timeOnMapSeconds,
            afkPercentage: presenceStats.afkPercentage,
            wasPresent: presenceStats.wasPresent,
          });

        const memberLeftBeforeKill =
          !memberPresentAtKill && memberLeaveTime !== null;

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
          confirmationDeadlineAt: memberLeftBeforeKill
            ? null
            : confirmationDeadlineAt,
          confirmedAt: memberLeftBeforeKill
            ? effectiveKilledAt
            : autoConfirmedAt,
        });
      }

      if (killPointsData.length > 0) {
        await tx.eventKillPoint.createMany({
          data: killPointsData,
        });
      }

      await Promise.all(
        heroMaps.map((map) =>
          tx.eventMap.update({
            where: { id: map.id },
            data: {
              assignedMembers: { set: [] },
            },
          }),
        ),
      );

      await tx.eventMapAssignmentHistory.updateMany({
        where: {
          mapId: { in: heroMapIds },
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
      await Promise.all(
        heroMaps.map((map) =>
          this.trackingService.openUnassignedGap(
            map.id,
            eventHero.id,
            killedAt,
          ),
        ),
      );
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
      effectiveKilledAt,
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
      }
    }

    await Promise.all(
      heroMaps.map((map) =>
        this.eventEmitter.emitMapStatusUpdate(guildId, event.id, map.id),
      ),
    );

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
    const effectiveKilledAt = this.getEffectiveWindowEndAt(
      kill.killedAt,
      kill.maxSpawnTimeAtKill,
    );
    const windowStartByKillId = await this.getEffectiveWindowStartByKillId([
      kill,
    ]);
    const overlapWindowStartTime =
      windowStartByKillId.get(kill.id) ??
      getTrackingWindowStartTime({
        killedAt: effectiveKilledAt,
        minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
      });

    const mapIdToName = this.createMapNameLookup(heroMaps);
    const mapIds = heroMaps.map((m) => m.id);
    const memberIds = [...new Set(kill.points.map((point) => point.memberId))];
    const trackingWindowStartTime = getTrackingWindowStartTime({
      killedAt: effectiveKilledAt,
      minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
    });
    const normalizedPoints = kill.points.map((point) =>
      this.normalizeKillPointTracking(
        point,
        effectiveKilledAt,
        kill.minSpawnTimeAtKill,
      ),
    );

    const assignments = await this.prisma.eventMapAssignmentHistory.findMany({
      where: this.buildAssignmentHistoryWhere({
        mapIds,
        memberIds,
        killedAt: effectiveKilledAt,
        overlapWindowStartTime,
      }),
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
        effectiveKilledAt,
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
        const clippedAssignmentInterval = clipIntervalToWindow({
          start: assignment.assignedAt,
          end: assignment.unassignedAt ?? effectiveKilledAt,
          windowStart: trackingWindowStartTime,
          windowEnd: effectiveKilledAt,
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
          mapName: mapIdToName.get(assignment.mapId) ?? "",
          assignedAt: assignment.assignedAt.toISOString(),
          unassignedAt: assignment.unassignedAt?.toISOString() ?? null,
          assignmentDurationSeconds,
          presenceTimeSeconds: presence?.presenceTimeSeconds ?? 0,
          afkTimeSeconds: presence?.afkTimeSeconds ?? 0,
        };
      });

      return {
        ...point,
        mapData,
      };
    });

    const respawnDurationSeconds = Math.max(
      0,
      getTrackingWindowDurationSeconds({
        killedAt: effectiveKilledAt,
        minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
      }),
    );
    const resolvedAfterMaxSpawnTimeMs = Math.max(
      0,
      kill.killedAt.getTime() - kill.maxSpawnTimeAtKill.getTime(),
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
        resolvedAfterMaxSpawnTimeMs,
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
            getTrackingWindowStartTime({
              killedAt: kill.killedAt,
              minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
            })
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

    const mapIdToName = this.createMapNameLookup(heroMaps);
    const assignments =
      (await this.prisma.eventMapAssignmentHistory.findMany({
        where: this.buildAssignmentHistoryWhere({
          heroNpcIds: heroIds,
          memberIds,
          killedAt: maxKillTime,
          overlapWindowStartTime: minTrackingWindowStart,
        }),
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
        getTrackingWindowStartTime({
          killedAt: kill.killedAt,
          minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
        });

      for (const point of kill.points) {
        const pointAssignments =
          assignmentsByHeroMember.get(`${kill.heroNpcId}:${point.memberId}`) ??
          [];
        const presenceByMapId = this.getPresenceByMapId(point.mapPresenceData);

        const mapData = pointAssignments
          .map((assignment) => {
            const clippedAssignmentInterval = clipIntervalToWindow({
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
              mapName: mapIdToName.get(assignment.mapId) ?? "",
              assignedAt: assignment.assignedAt.toISOString(),
              unassignedAt: assignment.unassignedAt?.toISOString() ?? null,
              assignmentDurationSeconds,
              presenceTimeSeconds: presence?.presenceTimeSeconds ?? 0,
              afkTimeSeconds: presence?.afkTimeSeconds ?? 0,
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

    const assignmentsByMapId = new Map<
      string,
      Array<{
        memberId: number;
        assignedAt: Date;
        unassignedAt: Date | null;
        member: {
          name: string;
          avatar: string | null;
          userId: string | null;
        };
      }>
    >();
    const timelineAssignments =
      await this.prisma.eventMapAssignmentHistory.findMany({
        where: this.buildAssignmentHistoryWhere({
          mapIds: maps.map((map) => map.id),
          killedAt: kill.killedAt,
          overlapWindowStartTime: scoringWindowStartTime,
        }),
        include: {
          member: {
            select: { id: true, name: true, avatar: true, userId: true },
          },
        },
        orderBy: [{ mapId: "asc" }, { assignedAt: "asc" }],
      });

    for (const assignment of timelineAssignments) {
      const currentAssignments = assignmentsByMapId.get(assignment.mapId) ?? [];
      currentAssignments.push({
        memberId: assignment.memberId,
        assignedAt: assignment.assignedAt,
        unassignedAt: assignment.unassignedAt,
        member: assignment.member,
      });
      assignmentsByMapId.set(assignment.mapId, currentAssignments);
    }

    const results = maps.map((map) => {
      const gapsForMap = summaryGaps.filter((g) => g.mapId === map.id);
      const mapAssignments = assignmentsByMapId.get(map.id) ?? [];

      return {
        mapId: map.id,
        mapName: map.mapName,
        numericMapId: map.mapId,
        assignments: mapAssignments.map((assignment) => ({
          memberId: assignment.memberId,
          memberName: assignment.member.name,
          memberAvatar: assignment.member.avatar,
          memberUserId: assignment.member.userId,
          assignedAt: assignment.assignedAt.toISOString(),
          unassignedAt: assignment.unassignedAt?.toISOString() ?? null,
        })),
        gaps: gapsForMap.map((g) => ({
          id: `${g.mapId}-${new Date(g.startedAt).getTime()}`,
          gapType: g.gapType,
          startedAt: new Date(g.startedAt).toISOString(),
          endedAt: g.endedAt ? new Date(g.endedAt).toISOString() : null,
          durationSeconds: g.durationSeconds,
        })),
      };
    });

    return results;
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

  private getEffectiveWindowEndAt(killedAt: Date, maxSpawnTimeAtKill: Date) {
    return killedAt.getTime() <= maxSpawnTimeAtKill.getTime()
      ? killedAt
      : maxSpawnTimeAtKill;
  }

  private normalizeKillPointTracking<
    T extends {
      trackingDurationSeconds: number | null;
      trackingDurationPercentage: number | null;
    },
  >(point: T, killedAt: Date, minSpawnTimeAtKill: Date): T {
    const windowDurationSeconds = getTrackingWindowDurationSeconds({
      killedAt,
      minSpawnTimeAtKill,
    });
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

    await Promise.all(
      delayedJobs
        .filter((job) => job.data.heroId === heroId)
        .map(async (job) => {
          await job.remove();
          this.logger.log({
            message: "Cancelled scheduled auto-close job (kill recorded)",
            heroId,
            jobId: job.id,
          });
        }),
    );
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

  private getEventKillRecentDedupKey(
    guildId: string,
    world: string,
    npcId: number,
  ): string {
    return buildEventHeroKillRecentDedupKey({ guildId, world, npcId });
  }
}
