import type { JsonValue } from "#src/database/json";

import { Logger } from "#src/shared/application-logger";
import { Clock, Effect } from "effect";

import type { Queue } from "bullmq";
import type {
  eventHeroNpcTable,
  eventTable,
} from "#src/database/drizzle/schema";
import { RedisService } from "#src/redis/redis.service";
import type { EventEmitter } from "#src/events/event-emitter";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { EventPoints } from "#src/events/kills/event-points.service";
import type { EventReadCache } from "#src/events/catalog/event-read-cache.service";
import type { EventPresenceTracking } from "#src/events/monitoring/event-presence-tracking";
import type { EventSummary } from "#src/events/monitoring/event-summary.service";
import type { AutoCloseRespawnWindowJobData } from "#src/events/respawn/auto-close-respawn-window-job-data";
import type { KillTimerData } from "#src/events/respawn/kill-timer-data";
import {
  buildEventHeroKillDedupKey,
  buildEventHeroKillHeroDedupKey,
  buildEventHeroKillRecentDedupKey,
  getEventHeroKillWindowKey,
} from "#src/events/kills/event-hero-kill-job";
import {
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from "@lootlog/domain/scoring";
import {
  calculateTrackingDurationSeconds,
  getEffectiveWindowEndAt,
  clipIntervalToWindow,
  getTrackingWindowDurationSeconds,
  getTrackingWindowStartTime,
} from "#src/events/monitoring/tracking-window";
import { findActiveEventHeroesByNpc as findActiveEventHeroMatchesByNpc } from "#src/events/kills/find-active-event-heroes-by-npc";
import type { ActiveEventHeroStore } from "#src/events/kills/active-event-hero.repository";
import type { EventKillStore } from "#src/events/kills/event-kill.repository";

type Event = typeof eventTable.$inferSelect;

type EventHeroNpc = typeof eventHeroNpcTable.$inferSelect;

const EVENT_KILL_LOCK_TTL_SECONDS = 30;

const EVENT_KILL_DEDUP_TTL_SECONDS = 120;

const EVENT_KILL_RECENT_DEDUP_TTL_SECONDS = 30;

type MapPresenceEntry = {
  mapId: string;
  mapName: string;
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
  respawnWindowQueue: Queue<AutoCloseRespawnWindowJobData>,
) => {
  const logger = new Logger("EventKills");

  const runPromiseAdapter = <A>(adapter: string, operation: () => Promise<A>) =>
    Effect.tryPromise({ try: operation, catch: (cause) => cause }).pipe(
      Effect.withSpan(`events.adapter.${adapter}`),
    );

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
                event,
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

      const trackingWindow = {
        killedAt: effectiveKilledAt,
        minSpawnTimeAtKill,
      };

      const trackingWindowStartTime =
        getTrackingWindowStartTime(trackingWindow);

      const trackingWindowDurationSeconds =
        getTrackingWindowDurationSeconds(trackingWindow);

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
              bonusBreakdown: JsonValue;
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
        .emit(RabbitRoutingKey.EVENT_HERO_KILLED, {
          guildId,
          eventId: event.id,
          heroNpcLvl: eventHero.npcLvl,
          killId: kill.kill.id,
        })
        .pipe(Effect.withSpan("rabbit.eventEmitter.emit"));

      if (!isManualClose) {
        yield* eventEmitter
          .emit(RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED, {
            guildId,
            eventId: event.id,
            heroNpcLvl: eventHero.npcLvl,
            heroId: eventHero.id,
          })
          .pipe(Effect.withSpan("rabbit.eventEmitter.emit"));

        if (timerData.minSpawnTime && timerData.maxSpawnTime) {
          yield* eventEmitter
            .emit(RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED, {
              guildId,
              eventId: event.id,
              heroNpcLvl: eventHero.npcLvl,
              heroId: eventHero.id,
            })
            .pipe(Effect.withSpan("rabbit.eventEmitter.emit"));
        }
      }

      yield* Effect.forEach(
        heroMaps,
        (map) =>
          eventEmitter
            .emit(RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE, {
              guildId,
              eventId: event.id,
              heroNpcLvl: eventHero.npcLvl,
              mapId: map.id,
            })
            .pipe(Effect.withSpan("rabbit.eventEmitter.emit")),
        { concurrency: "unbounded", discard: true },
      );

      return kill.kill;
    }).pipe(Effect.withSpan("events.kills.record"));
  }

  function resolveKillScoringConfig(event: Event, killedAt: Date) {
    const scoringMode = normalizeEventScoringMode(event.scoringMode);

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
  }) {
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
    recordHeroKill,
  };
};

export type EventKills = ReturnType<typeof makeEventKills>;
