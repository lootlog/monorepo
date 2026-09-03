import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { Logger } from "#src/shared/logging/application-logger";
import { Clock, Effect, Schema } from "effect";
import {
  EventHeroStatsResponse,
  EventKillHistoryResponse,
  EventMemberKillHistoryResponse,
} from "../event-kill-response.schema.js";

import type { Queue } from "bullmq";
import type {
  eventHeroNpcTable,
  eventMapCoverageGapTable,
  eventTable,
} from "#src/database/drizzle/schema";
import { RedisService } from "#src/redis/redis.service";
import type { EventEmitter } from "./event-emitter.service.js";
import { RoutingKey } from "#src/enum/routing-key.enum";
import type { EventPoints } from "./event-points.service.js";
import type { EventReadCache } from "./event-read-cache.service.js";
import type { EventPresenceTracking } from "../event-presence-tracking.js";
import type { EventSummary } from "./event-summary.service.js";
import type { AutoCloseRespawnWindowJobData } from "../interfaces/auto-close-respawn-window-job-data.js";
import type { KillTimerData } from "../interfaces/kill-timer-data.interface.js";
import {
  buildEventHeroKillDedupKey,
  buildEventHeroKillHeroDedupKey,
  buildEventHeroKillRecentDedupKey,
  getEventHeroKillWindowKey,
} from "../utils/event-hero-kill-job.js";
import {
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from "@lootlog/domain/scoring";
import { resolveEventWindowStart } from "../utils/resolve-event-window-start.util.js";
import {
  calculateTrackingDurationSeconds,
  clipIntervalToWindow,
  getTrackingWindowDurationSeconds,
  getTrackingWindowStartTime,
} from "../utils/tracking-window.util.js";
import type { EventTimersPort } from "./event-timers.port.js";
import { findActiveEventHeroesByNpc as findActiveEventHeroMatchesByNpc } from "../utils/find-active-event-heroes-by-npc.js";
import type { ActiveEventHeroStore } from "./active-event-hero.repository.js";
import type { EventKillStore } from "./event-kill.repository.js";

type Event = typeof eventTable.$inferSelect;
type EventHeroNpc = typeof eventHeroNpcTable.$inferSelect;
type CoverageGapType = typeof eventMapCoverageGapTable.$inferSelect.gapType;

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

export const makeEventKills = (
  repository: EventKillStore,
  activeEventHeroRepository: ActiveEventHeroStore,
  redis: RedisService,
  eventEmitter: EventEmitter,
  eventReadCache: EventReadCache,
  pointsService: EventPoints,
  trackingService: EventPresenceTracking,
  summaryService: EventSummary,
  timersService: EventTimersPort,
  respawnWindowQueue: Queue<AutoCloseRespawnWindowJobData>,
) => {
  const logger = new Logger("EventKills");
  const runPromiseAdapter = <A>(adapter: string, operation: () => Promise<A>) =>
    Effect.tryPromise({ try: operation, catch: (cause) => cause }).pipe(
      Effect.withSpan(`events.adapter.${adapter}`),
    );

  function getEventHeroTimers(guildId: string, eventId: string, world: string) {
    return Effect.gen(function* () {
      const event = yield* repository.findEventWithHeroes(guildId, eventId);

      if (!event) {
        return yield* Effect.fail(new ResourceNotFoundError("Event not found"));
      }

      if (event.heroNpcs.length === 0) {
        return [];
      }

      const combined = yield* timersService.getTimersForEventHeroFilters(
        guildId,
        world,
        event.heroNpcs,
      );

      return combined.map((timer) => ({
        npcId: timer.npcId,
        world: timer.world,
        minSpawnTime: timer.minSpawnTime,
        maxSpawnTime: timer.maxSpawnTime,
        npc: extractEventTimerNpc(timer.npc),
      }));
    }).pipe(Effect.withSpan("events.kills.heroTimers"));
  }

  function extractEventTimerNpc(npcData: unknown): EventTimerNpc {
    if (!npcData || typeof npcData !== "object") {
      return { name: "", icon: null };
    }
    const npc = npcData as { name?: unknown; icon?: unknown };
    return {
      name: typeof npc.name === "string" ? npc.name : "",
      icon: typeof npc.icon === "string" ? npc.icon : null,
    };
  }

  function createMapNameLookup(
    maps: Array<{ id: string; mapName: string }>,
  ): Map<string, string> {
    return new Map(maps.map((map) => [map.id, map.mapName]));
  }

  function buildMemberAssignmentContext(params: {
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

  function buildPresenceLookups(params: {
    eventHeroId: string;
    mapIds: string[];
    memberIds: number[];
    scoringWindowStartTime: Date;
    scoringWindowEndTime: Date;
  }) {
    if (params.memberIds.length === 0) {
      return Effect.succeed({
        presenceByMemberId: new Map<number, MemberPresenceStatsEntry>(),
        presenceByMemberMapKey: new Map<string, MemberMapPresenceStatsEntry>(),
      });
    }

    return Effect.map(
      Effect.all(
        [
          pointsService.getMembersPresenceStats(
            params.eventHeroId,
            params.memberIds,
            params.scoringWindowStartTime,
            params.scoringWindowEndTime,
          ),
          pointsService.getMembersPresenceStatsPerMap(
            params.mapIds,
            params.memberIds,
            params.scoringWindowStartTime,
            params.scoringWindowEndTime,
          ),
        ],
        { concurrency: "unbounded" },
      ),
      ([presenceStatsByMember, presenceStatsByMemberMap]) => {
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
        const presenceByMemberMapKey = new Map<
          string,
          MemberMapPresenceStatsEntry
        >(
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
      },
    );
  }

  function buildMapPresenceData(params: {
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

  function getEventHeroStats(guildId: string, eventId: string) {
    return eventReadCache
      .getOrSet(
        eventReadCache.getEventKey(guildId, eventId, "hero-stats-v2"),
        Schema.Array(EventHeroStatsResponse),
        () => getEventHeroStatsUncached(guildId, eventId),
      )
      .pipe(Effect.withSpan("events.kills.heroStats"));
  }

  function getEventHeroStatsUncached(guildId: string, eventId: string) {
    return Effect.gen(function* () {
      const event = yield* repository.findEventWithHeroStats(guildId, eventId);

      if (!event) {
        return yield* Effect.fail(new ResourceNotFoundError("Event not found"));
      }

      const npcIds = event.heroNpcs.flatMap((hero) =>
        hero.npcId === null ? [] : [hero.npcId],
      );
      const npcStats =
        npcIds.length > 0
          ? yield* repository.findNpcStats(guildId, event.world, npcIds)
          : [];
      const npcProfById = new Map(
        npcStats.map((npcStat) => [npcStat.npcId, npcStat.npcProf]),
      );

      return event.heroNpcs.map((hero) => ({
        heroId: hero.id,
        npcId: hero.npcId,
        npcName: hero.npcName,
        npcLvl: hero.npcLvl,
        npcProf:
          hero.npcId === null ? null : (npcProfById.get(hero.npcId) ?? null),
        killCount: hero._count.kills,
      }));
    });
  }

  function checkAndRecordEventHeroKill(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
    npcIcon: string,
    timerData: KillTimerData,
    isManualClose = false,
    npcLvl?: number,
  ) {
    return Effect.gen(function* () {
      const lockKey = getEventKillLockKey(guildId, world, npcId);
      const windowKey = getEventHeroKillWindowKey(timerData);
      const dedupKey = getEventKillDedupKey(
        guildId,
        world,
        npcId,
        windowKey,
        isManualClose,
      );
      const recentDedupKey = isManualClose
        ? null
        : getEventKillRecentDedupKey(guildId, world, npcId);

      const dedupHit = yield* runPromiseAdapter("redis.get", () =>
        redis.get(dedupKey),
      );
      if (dedupHit) {
        logger.debug({
          message: "Skipping duplicate event hero kill - dedup window active",
          guildId,
          world,
          npcId,
          npcName,
        });
        return;
      }

      if (recentDedupKey) {
        const recentDedupHit = yield* runPromiseAdapter("redis.get", () =>
          redis.get(recentDedupKey),
        );
        if (recentDedupHit) {
          logger.debug({
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
      const lockAcquired = yield* runPromiseAdapter("redis.setNX", () =>
        redis.setNX(
          lockKey,
          Date.now().toString(),
          EVENT_KILL_LOCK_TTL_SECONDS,
        ),
      );

      if (!lockAcquired) {
        logger.debug({
          message: "Skipping duplicate event hero kill - lock already held",
          guildId,
          world,
          npcId,
          npcName,
        });
        return;
      }

      const recordWhileLocked = Effect.gen(function* () {
        const dedupHitAfterLock = yield* runPromiseAdapter("redis.get", () =>
          redis.get(dedupKey),
        );
        if (dedupHitAfterLock) {
          logger.debug({
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
          const recentDedupHitAfterLock = yield* runPromiseAdapter(
            "redis.get",
            () => redis.get(recentDedupKey),
          );
          if (recentDedupHitAfterLock) {
            logger.debug({
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

        const matches = yield* findActiveEventHeroesByNpc(
          guildId,
          world,
          npcId,
          npcName,
        );

        if (matches.length === 0) {
          return;
        }

        yield* Effect.forEach(
          matches,
          (match) =>
            Effect.gen(function* () {
              let { eventHero } = match;
              const { event } = match;
              const heroDedupKey = getEventKillHeroDedupKey(
                guildId,
                world,
                npcId,
                eventHero.id,
                windowKey,
                isManualClose,
              );

              const heroDedupHit = yield* runPromiseAdapter("redis.get", () =>
                redis.get(heroDedupKey),
              );
              if (heroDedupHit) {
                logger.debug({
                  message: "Skipping duplicate event hero kill for hero",
                  guildId,
                  world,
                  npcId,
                  heroId: eventHero.id,
                  eventId: event.id,
                });
                return;
              }

              logger.warn({
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
                eventHero = yield* repository.updateHero(
                  eventHero.id,
                  updateData,
                );
                logger.log({
                  message: "Hero NPC data updated",
                  heroId: eventHero.id,
                  npcId: eventHero.npcId,
                  npcIcon: eventHero.npcIcon,
                  npcLvl: eventHero.npcLvl,
                });
              }

              yield* recordHeroKill(
                guildId,
                eventHero,
                event as Event,
                timerData,
                isManualClose,
              );

              yield* runPromiseAdapter("redis.set", () =>
                redis.set(
                  heroDedupKey,
                  Date.now().toString(),
                  EVENT_KILL_DEDUP_TTL_SECONDS,
                ),
              );

              logger.log({
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
          { concurrency: "unbounded", discard: true },
        );

        yield* runPromiseAdapter("redis.set", () =>
          redis.set(
            dedupKey,
            Date.now().toString(),
            EVENT_KILL_DEDUP_TTL_SECONDS,
          ),
        );

        if (recentDedupKey) {
          yield* runPromiseAdapter("redis.set", () =>
            redis.set(
              recentDedupKey,
              Date.now().toString(),
              EVENT_KILL_RECENT_DEDUP_TTL_SECONDS,
            ),
          );
        }
      });

      yield* recordWhileLocked.pipe(
        Effect.ensuring(
          runPromiseAdapter("redis.del", () => redis.del(lockKey)).pipe(
            Effect.tapError((error) =>
              Effect.sync(() =>
                logger.error({
                  message: "Failed to release event kill lock",
                  lockKey,
                  error: error instanceof Error ? error.message : error,
                }),
              ),
            ),
            Effect.ignore,
          ),
        ),
      );
    }).pipe(Effect.withSpan("events.kills.checkAndRecord"));
  }

  function findActiveEventHeroesByNpc(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
  ) {
    return findActiveEventHeroMatchesByNpc(
      activeEventHeroRepository,
      guildId,
      world,
      npcId,
      npcName,
    );
  }

  function recordHeroKill(
    guildId: string,
    eventHero: EventHeroNpc,
    event: Event,
    timerData: KillTimerData,
    isManualClose = false,
  ) {
    return Effect.gen(function* () {
      const killedAt = new Date(yield* Clock.currentTimeMillis);
      const minSpawnTimeAtKill = timerData.previousMinSpawnTime ?? killedAt;
      const maxSpawnTimeAtKill = timerData.previousMaxSpawnTime ?? killedAt;
      const effectiveKilledAt = getEffectiveWindowEndAt(
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

      const heroMaps = yield* repository.findMaps(eventHero.id);
      const heroMapIds = heroMaps.map((map) => map.id);
      const mapIdToName = createMapNameLookup(heroMaps);

      const {
        scoringMode,
        scoringRules,
        confirmationDeadlineAt,
        autoConfirmedAt,
      } = resolveKillScoringConfig(event, killedAt);

      const kill = yield* repository.recordKill(
        {
          heroNpcId: eventHero.id,
          killedAt,
          minSpawnTimeAtKill,
          maxSpawnTimeAtKill,
          timerCreatedById: timerData.memberId,
          isManualClose,
          mapIds: heroMapIds,
          assignmentOverlapStart: scoringWindowStartTime,
        },
        (assignmentHistory, killId) =>
          Effect.gen(function* () {
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
              bonusBreakdown: unknown;
              mapPresenceData: Array<{
                mapId: string;
                mapName: string;
                presenceTimeSeconds: number;
                afkTimeSeconds: number;
              }>;
              confirmationDeadlineAt: Date | null;
              confirmedAt: Date | null;
            }> = [];

            const {
              memberAssignmentsHistory,
              memberMapIds,
              memberTrackingIntervals,
            } = buildMemberAssignmentContext({
              assignmentHistory,
              killedAt: effectiveKilledAt,
              trackingWindowStartTime,
            });

            const assignedMemberIds = Array.from(memberMapIds.keys());
            if (assignedMemberIds.length === 0) {
              logger.log({
                message: "No assignments for hero kill in current window",
                heroId: eventHero.id,
                eventId: event.id,
              });
            }

            const { presenceByMemberId, presenceByMemberMapKey } =
              yield* buildPresenceLookups({
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
              const mapPresenceData = buildMapPresenceData({
                mapIds: memberAssignedMapIds,
                mapNameById: mapIdToName,
                memberId,
                presenceByMemberMapKey,
              });

              const trackingIntervals =
                memberTrackingIntervals.get(memberId) ?? [];
              const trackingDurationSeconds =
                calculateTrackingDurationSeconds(trackingIntervals);

              const trackingDurationPercentage =
                trackingDurationSeconds !== null &&
                trackingWindowDurationSeconds > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (trackingDurationSeconds /
                          trackingWindowDurationSeconds) *
                          100,
                      ),
                    )
                  : undefined;

              const memberAssignments =
                memberAssignmentsHistory.get(memberId) ?? [];
              const { memberPresentAtKill, memberLeaveTime } =
                getMemberKillState({
                  assignments: memberAssignments,
                  killedAt: effectiveKilledAt,
                  trackingWindowStartTime,
                });

              const { totalPoints, basePoints, appliedBonuses } =
                pointsService.calculateMemberPoints({
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
                killId,
                memberId,
                basePoints,
                points: totalPoints,
                trackingDurationSeconds,
                trackingDurationPercentage: trackingDurationPercentage ?? null,
                timeOnMapSeconds: presenceStats.timeOnMapSeconds,
                afkPercentage: presenceStats.afkPercentage,
                wasPresent: presenceStats.wasPresent,
                bonusBreakdown: appliedBonuses,
                mapPresenceData,
                confirmationDeadlineAt: memberLeftBeforeKill
                  ? null
                  : confirmationDeadlineAt,
                confirmedAt: memberLeftBeforeKill
                  ? effectiveKilledAt
                  : autoConfirmedAt,
              });
            }

            return killPointsData;
          }),
      );

      if (kill.points.length > 0) {
        yield* pointsService.updateRankingAfterKill(
          event.id,
          eventHero.npcName,
          kill.points,
        );
      }

      yield* trackingService.closeAllGapsForHero(eventHero.id);

      if (
        !isManualClose &&
        timerData.minSpawnTime &&
        timerData.maxSpawnTime &&
        timerData.minSpawnTime > killedAt
      ) {
        yield* Effect.forEach(
          heroMaps,
          (map) =>
            trackingService.openUnassignedGap(map.id, eventHero.id, killedAt),
          { concurrency: "unbounded", discard: true },
        );
        logger.debug({
          message: "Opened UNASSIGNED gaps for new respawn window",
          heroId: eventHero.id,
          mapsCount: heroMaps.length,
        });
      }

      yield* summaryService.createWindowSummary(
        eventHero.id,
        kill.kill.id,
        windowOpenedAt,
        effectiveKilledAt,
        timerData.previousMinSpawnTime ?? killedAt,
        timerData.previousMaxSpawnTime ?? killedAt,
        isManualClose,
      );

      yield* cancelScheduledAutoClose(eventHero.id);

      yield* runPromiseAdapter("redis.eventReadCache.invalidate", () =>
        eventReadCache.invalidateEvent(guildId, event.id),
      );
      yield* eventEmitter
        .emit(RoutingKey.EVENT_HERO_KILLED, {
          guildId,
          eventId: event.id,
          killId: kill.kill.id,
        })
        .pipe(Effect.withSpan("rabbit.eventEmitter.emit"));

      if (!isManualClose) {
        yield* eventEmitter
          .emit(RoutingKey.EVENT_RESPAWN_WINDOW_CLOSED, {
            guildId,
            eventId: event.id,
            heroId: eventHero.id,
          })
          .pipe(Effect.withSpan("rabbit.eventEmitter.emit"));

        if (timerData.minSpawnTime && timerData.maxSpawnTime) {
          yield* eventEmitter
            .emit(RoutingKey.EVENT_RESPAWN_WINDOW_OPENED, {
              guildId,
              eventId: event.id,
              heroId: eventHero.id,
            })
            .pipe(Effect.withSpan("rabbit.eventEmitter.emit"));
        }
      }

      yield* Effect.forEach(
        heroMaps,
        (map) =>
          eventEmitter
            .emit(RoutingKey.EVENT_MAP_STATUS_UPDATE, {
              guildId,
              eventId: event.id,
              mapId: map.id,
            })
            .pipe(Effect.withSpan("rabbit.eventEmitter.emit")),
        { concurrency: "unbounded", discard: true },
      );

      return kill.kill;
    }).pipe(Effect.withSpan("events.kills.record"));
  }

  function resolveKillScoringConfig(event: Event, killedAt: Date) {
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

    return {
      scoringMode,
      scoringRules,
      confirmationDeadlineAt:
        confirmationMinutes > 0
          ? new Date(killedAt.getTime() + confirmationMinutes * 60_000)
          : null,
      autoConfirmedAt: confirmationMinutes > 0 ? null : killedAt,
    };
  }

  function getMemberKillState(params: {
    assignments: MemberAssignmentHistoryEntry[];
    killedAt: Date;
    trackingWindowStartTime: Date;
  }): { memberPresentAtKill: boolean; memberLeaveTime: Date | null } {
    let memberPresentAtKill = false;
    let memberLeaveTime: Date | null = null;

    for (const assignment of params.assignments) {
      if (assignment.assignedAt > params.killedAt) continue;
      if (
        !assignment.unassignedAt ||
        assignment.unassignedAt >= params.killedAt
      ) {
        memberPresentAtKill = true;
        continue;
      }
      if (
        assignment.unassignedAt >= params.trackingWindowStartTime &&
        assignment.unassignedAt < params.killedAt &&
        (!memberLeaveTime || assignment.unassignedAt > memberLeaveTime)
      ) {
        memberLeaveTime = assignment.unassignedAt;
      }
    }

    return { memberPresentAtKill, memberLeaveTime };
  }

  function getHeroKillHistory(
    guildId: string,
    eventId: string,
    heroId: string,
    limit = 20,
    cursor?: string,
  ) {
    return eventReadCache
      .getOrSet(
        eventReadCache.getEventKey(guildId, eventId, "hero-kill-history", {
          cursor,
          heroId,
          limit,
        }),
        EventKillHistoryResponse,
        () =>
          getHeroKillHistoryUncached(guildId, eventId, heroId, limit, cursor),
      )
      .pipe(Effect.withSpan("events.kills.heroHistory"));
  }

  function getHeroKillHistoryUncached(
    guildId: string,
    eventId: string,
    heroId: string,
    limit = 20,
    cursor?: string,
  ) {
    return Effect.gen(function* () {
      const hero = yield* repository.findHero(guildId, eventId, heroId);

      if (!hero) {
        return yield* Effect.fail(new ResourceNotFoundError("Hero not found"));
      }

      const kills = yield* repository.findKills({
        eventId,
        heroId,
        cursor,
        limit: limit + 1,
      });

      const hasMore = kills.length > limit;
      const paginatedKills = hasMore ? kills.slice(0, limit) : kills;
      const windowStartByKillId =
        yield* getEffectiveWindowStartByKillId(paginatedKills);
      const mapDataByKillMember = yield* buildKillPointMapDataByKillMember(
        paginatedKills,
        windowStartByKillId,
      );
      const data = paginatedKills.map((kill) => ({
        ...kill,
        points: kill.points.map((point) => ({
          ...point,
          mapData:
            mapDataByKillMember.get(`${kill.id}:${point.memberId}`) ?? [],
        })),
      }));
      const nextCursor = hasMore ? data[data.length - 1]?.id : null;

      return { data, nextCursor };
    });
  }

  function getEventKillHistory(
    guildId: string,
    eventId: string,
    limit = 20,
    cursor?: string,
    heroId?: string,
  ) {
    return eventReadCache
      .getOrSet(
        eventReadCache.getEventKey(guildId, eventId, "event-kill-history", {
          cursor,
          heroId,
          limit,
        }),
        EventKillHistoryResponse,
        () =>
          getEventKillHistoryUncached(guildId, eventId, limit, cursor, heroId),
      )
      .pipe(Effect.withSpan("events.kills.eventHistory"));
  }

  function getEventKillHistoryUncached(
    guildId: string,
    eventId: string,
    limit = 20,
    cursor?: string,
    heroId?: string,
  ) {
    return Effect.gen(function* () {
      const event = yield* repository.findEvent(guildId, eventId);

      if (!event) {
        return yield* Effect.fail(new ResourceNotFoundError("Event not found"));
      }

      const kills = yield* repository.findKills({
        eventId,
        heroId,
        cursor,
        limit: limit + 1,
      });

      const hasMore = kills.length > limit;
      const paginatedKills = hasMore ? kills.slice(0, limit) : kills;
      const windowStartByKillId =
        yield* getEffectiveWindowStartByKillId(paginatedKills);
      const mapDataByKillMember = yield* buildKillPointMapDataByKillMember(
        paginatedKills,
        windowStartByKillId,
      );
      const data = paginatedKills.map((kill) => ({
        ...kill,
        points: kill.points.map((point) => ({
          ...point,
          mapData:
            mapDataByKillMember.get(`${kill.id}:${point.memberId}`) ?? [],
        })),
      }));
      const nextCursor = hasMore ? data[data.length - 1]?.id : null;

      return { data, nextCursor };
    });
  }

  function getMemberKillHistory(
    guildId: string,
    eventId: string,
    memberId: number,
    limit = 20,
    cursor?: string,
    heroId?: string,
  ) {
    return eventReadCache
      .getOrSet(
        eventReadCache.getEventKey(guildId, eventId, "member-kill-history", {
          cursor,
          heroId,
          limit,
          memberId,
        }),
        EventMemberKillHistoryResponse,
        () =>
          getMemberKillHistoryUncached(
            guildId,
            eventId,
            memberId,
            limit,
            cursor,
            heroId,
          ),
      )
      .pipe(Effect.withSpan("events.kills.memberHistory"));
  }

  function getMemberKillHistoryUncached(
    guildId: string,
    eventId: string,
    memberId: number,
    limit = 20,
    cursor?: string,
    heroId?: string,
  ) {
    return Effect.gen(function* () {
      const event = yield* repository.findEvent(guildId, eventId);

      if (!event) {
        return yield* Effect.fail(new ResourceNotFoundError("Event not found"));
      }

      const member = yield* repository.findMember(guildId, memberId);

      if (!member) {
        return yield* Effect.fail(
          new ResourceNotFoundError("Member not found"),
        );
      }

      const kills = yield* repository.findKills({
        eventId,
        heroId,
        memberId,
        cursor,
        limit: limit + 1,
      });

      const hasMore = kills.length > limit;
      const paginatedKills = hasMore ? kills.slice(0, limit) : kills;
      const windowStartByKillId =
        yield* getEffectiveWindowStartByKillId(paginatedKills);
      const mapDataByKillMember = yield* buildKillPointMapDataByKillMember(
        paginatedKills,
        windowStartByKillId,
      );
      const data = paginatedKills.map(({ points, ...kill }) => {
        const latestPoint = points[0] ?? null;
        const normalizedMemberPoint = latestPoint
          ? normalizeKillPointTracking(
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

      return { member, data, nextCursor };
    });
  }

  function getKillDetail(
    guildId: string,
    eventId: string,
    heroId: string,
    killId: string,
  ) {
    return getKillDetailEffect(guildId, eventId, heroId, killId).pipe(
      Effect.withSpan("events.kills.detail"),
    );
  }

  function getKillDetailEffect(
    guildId: string,
    eventId: string,
    heroId: string,
    killId: string,
  ) {
    return Effect.gen(function* () {
      const kill = yield* repository.findKillDetail(
        guildId,
        eventId,
        heroId,
        killId,
      );

      if (!kill) {
        return yield* Effect.fail(new ResourceNotFoundError("Kill not found"));
      }

      const heroMaps = yield* repository.findMaps(heroId);
      const effectiveKilledAt = getEffectiveWindowEndAt(
        kill.killedAt,
        kill.maxSpawnTimeAtKill,
      );
      const windowStartByKillId = yield* getEffectiveWindowStartByKillId([
        kill,
      ]);
      const overlapWindowStartTime =
        windowStartByKillId.get(kill.id) ??
        getTrackingWindowStartTime({
          killedAt: effectiveKilledAt,
          minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
        });

      const mapIdToName = createMapNameLookup(heroMaps);
      const mapIds = heroMaps.map((m) => m.id);
      const memberIds = [
        ...new Set(kill.points.map((point) => point.memberId)),
      ];
      const trackingWindowStartTime = getTrackingWindowStartTime({
        killedAt: effectiveKilledAt,
        minSpawnTimeAtKill: kill.minSpawnTimeAtKill,
      });
      const normalizedPoints = kill.points.map((point) =>
        normalizeKillPointTracking(
          point,
          effectiveKilledAt,
          kill.minSpawnTimeAtKill,
        ),
      );

      const assignments = yield* repository.findAssignments({
        mapIds,
        memberIds,
        killedAt: effectiveKilledAt,
        overlapStart: overlapWindowStartTime,
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
        yield* pointsService.getMembersPresenceStatsPerMap(
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
        getSpawnWindowDurationSeconds(
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
    });
  }

  function buildKillPointMapDataByKillMember(
    kills: Array<{
      id: string;
      heroNpcId: string;
      killedAt: Date;
      minSpawnTimeAtKill: Date;
      points: Array<{
        memberId: number;
        mapPresenceData?: unknown;
      }>;
    }>,
    windowStartByKillId: Map<string, Date>,
  ) {
    return Effect.gen(function* () {
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

      const heroMaps = (yield* repository.findMapsForHeroes(heroIds)) ?? [];
      if (heroMaps.length === 0) {
        return mapDataByKillMember;
      }

      const mapIdToName = createMapNameLookup(heroMaps);
      const assignments =
        (yield* repository.findAssignments({
          heroNpcIds: heroIds,
          memberIds,
          killedAt: maxKillTime,
          overlapStart: minTrackingWindowStart,
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
            assignmentsByHeroMember.get(
              `${kill.heroNpcId}:${point.memberId}`,
            ) ?? [];
          const presenceByMapId = getPresenceByMapId(point.mapPresenceData);

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
    });
  }

  function getEffectiveWindowStartByKillId(
    kills: Array<{
      id: string;
      killedAt: Date;
      minSpawnTimeAtKill: Date;
    }>,
  ) {
    return Effect.gen(function* () {
      const windowStartByKillId = new Map<string, Date>();

      if (kills.length === 0) {
        return windowStartByKillId;
      }

      const windowSummaries = yield* repository.findWindowSummaries(
        kills.map((kill) => kill.id),
      );
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
    });
  }

  function getPresenceByMapId(
    mapPresenceData: unknown,
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

  function getKillTimelineData(
    guildId: string,
    eventId: string,
    heroId: string,
    killId: string,
  ) {
    return getKillTimelineDataEffect(guildId, eventId, heroId, killId).pipe(
      Effect.withSpan("events.kills.timeline"),
    );
  }

  function getKillTimelineDataEffect(
    guildId: string,
    eventId: string,
    heroId: string,
    killId: string,
  ) {
    return Effect.gen(function* () {
      const kill = yield* repository.findKillDetail(
        guildId,
        eventId,
        heroId,
        killId,
      );

      if (!kill) {
        return yield* Effect.fail(new ResourceNotFoundError("Kill not found"));
      }

      const summary = yield* repository.findWindowSummary(killId);

      const summaryGaps =
        (summary?.gapsTimeline as unknown as GapTimelineEntry[] | null) ?? [];
      const scoringWindowStartTime =
        summary?.windowOpenedAt ?? kill.minSpawnTimeAtKill;

      const maps = yield* repository.findMaps(heroId);

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
      const timelineAssignments = yield* repository.findTimelineAssignments({
        mapIds: maps.map((map) => map.id),
        killedAt: kill.killedAt,
        overlapStart: scoringWindowStartTime,
      });

      for (const assignment of timelineAssignments) {
        const currentAssignments =
          assignmentsByMapId.get(assignment.mapId) ?? [];
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
    });
  }

  function getSpawnWindowDurationSeconds(
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

  function getEffectiveWindowEndAt(killedAt: Date, maxSpawnTimeAtKill: Date) {
    return killedAt.getTime() <= maxSpawnTimeAtKill.getTime()
      ? killedAt
      : maxSpawnTimeAtKill;
  }

  function normalizeKillPointTracking<
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

  function cancelScheduledAutoClose(heroId: string) {
    return Effect.gen(function* () {
      const delayedJobs = yield* runPromiseAdapter("bull.respawn.getJobs", () =>
        respawnWindowQueue.getJobs(["delayed"]),
      );
      yield* Effect.forEach(
        delayedJobs.filter((job) => job.data.heroId === heroId),
        (job) =>
          runPromiseAdapter("bull.respawn.remove", () => job.remove()).pipe(
            Effect.tap(() =>
              Effect.sync(() =>
                logger.log({
                  message: "Cancelled scheduled auto-close job (kill recorded)",
                  heroId,
                  jobId: job.id,
                }),
              ),
            ),
          ),
        { concurrency: "unbounded", discard: true },
      );
    });
  }

  function getEventKillLockKey(
    guildId: string,
    world: string,
    npcId: number,
  ): string {
    return `event:hero:kill:lock:${guildId}:${world}:${npcId}`;
  }

  function getEventKillDedupKey(
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

  function getEventKillHeroDedupKey(
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

  function getEventKillRecentDedupKey(
    guildId: string,
    world: string,
    npcId: number,
  ): string {
    return buildEventHeroKillRecentDedupKey({ guildId, world, npcId });
  }

  return {
    checkAndRecordEventHeroKill,
    getEventHeroStats,
    getEventHeroTimers,
    getEventKillHistory,
    getHeroKillHistory,
    getKillDetail,
    getKillTimelineData,
    getMemberKillHistory,
    recordHeroKill,
  };
};

export type EventKills = ReturnType<typeof makeEventKills>;
