import type { JsonValue } from "#src/database/json";
import type { Logger } from "#src/shared/application-logger";
import { Effect } from "effect";
import type {
  eventHeroNpcTable,
  eventMapAssignmentHistoryTable,
  eventTable,
} from "#src/database/drizzle/event.schema";
import type { EventPoints } from "#src/events/kills/event-points.service";
import {
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from "@lootlog/domain/scoring";
import {
  analyzeEventKillPresence,
  getPresenceScoringContext,
  resolveEventScoringWindow,
} from "@lootlog/domain/scoring-presence";
import { clipIntervalToWindow } from "#src/events/monitoring/tracking-window";

type Event = typeof eventTable.$inferSelect;

type EventHeroNpc = typeof eventHeroNpcTable.$inferSelect;

type MapPresenceEntry = {
  mapId: string;
  mapName: string;
  presenceTimeSeconds: number;
  afkTimeSeconds: number;
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

/** Scores the members assigned to a hero's maps when the hero is killed. */
export const makeEventKillPoints = (
  pointsService: Pick<
    EventPoints,
    | "calculateMemberPoints"
    | "getMembersPresenceStats"
    | "getMembersPresenceStatsPerMap"
  >,
  logger: Logger,
) => {
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

    for (const historyEntry of params.assignmentHistory) {
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
    }

    return memberMapIds;
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

  function buildKillPoints(params: {
    eventHero: Pick<EventHeroNpc, "id">;
    event: Event;
    heroMaps: Array<{ id: string; mapName: string }>;
    heroMapIds: string[];
    killedAt: Date;
    effectiveKilledAt: Date;
    minSpawnTimeAtKill: Date;
    maxSpawnTimeAtKill: Date;
    scoringWindowStartTime: Date;
    trackingWindowStartTime: Date;
  }) {
    const {
      eventHero,
      event,
      heroMapIds,
      killedAt,
      effectiveKilledAt,
      minSpawnTimeAtKill,
      maxSpawnTimeAtKill,
      scoringWindowStartTime,
      trackingWindowStartTime,
    } = params;

    const mapIdToName = createMapNameLookup(params.heroMaps);

    const {
      scoringMode,
      scoringRules,
      confirmationDeadlineAt,
      autoConfirmedAt,
    } = resolveKillScoringConfig(event, killedAt);

    return (
      assignmentHistory: Array<
        typeof eventMapAssignmentHistoryTable.$inferSelect
      >,
      killId: string,
    ) =>
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

        const memberMapIds = buildMemberAssignmentContext({
          assignmentHistory,
          killedAt: effectiveKilledAt,
          trackingWindowStartTime,
        });

        const assignedMemberIds = Array.from(memberMapIds.keys());

        const presenceAnalysis = analyzeEventKillPresence({
          window: resolveEventScoringWindow({
            killedAt,
            minSpawnTimeAtKill,
            maxSpawnTimeAtKill,
          }),
          participantIds: assignedMemberIds,
          intervals: assignmentHistory.flatMap((assignment) =>
            memberMapIds.has(assignment.memberId)
              ? [
                  {
                    participantId: assignment.memberId,
                    start: assignment.assignedAt,
                    end: assignment.unassignedAt,
                  },
                ]
              : [],
          ),
        });

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

          const {
            trackingDurationSeconds,
            trackingDurationPercentage,
            memberPresentAtKill,
            memberLeaveTime,
            presence,
          } = getPresenceScoringContext(presenceAnalysis, memberId);

          const { totalPoints, basePoints, appliedBonuses } =
            pointsService.calculateMemberPoints({
              scoringMode,
              scoringRules,
              eligible: true,
              trackingDurationPercentage,
              trackingDurationSeconds,
              assignedMembersCount: assignedMemberIds.length,
              killTime: effectiveKilledAt,
              respawnStartTime: trackingWindowStartTime,
              maxRespawnTime: maxSpawnTimeAtKill,
              memberLeaveTime,
              memberPresentAtKill,
              timeOnMapSeconds: presenceStats.timeOnMapSeconds,
              afkPercentage: presenceStats.afkPercentage,
              wasPresent: presenceStats.wasPresent,
              presence,
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
      });
  }

  return { buildKillPoints };
};

export type EventKillPoints = ReturnType<typeof makeEventKillPoints>;
