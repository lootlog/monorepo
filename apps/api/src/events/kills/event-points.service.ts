import {
  getTrackingDurationSecondsForRanking,
  isKillPointCountedInRanking,
} from "#src/events/kills/event-ranking-policy";
import type { eventKillPointTable } from "#src/database/drizzle/event.schema";
import { Effect } from "effect";
import type { EventEmitter } from "#src/events/event-emitter";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { EventReadCache } from "#src/events/catalog/event-read-cache.service";
import { calculateMemberPoints } from "#src/events/kills/event-member-points";
import { makeEventMemberPresenceStats } from "#src/events/kills/event-member-presence-stats";
import { makeEventPointsRecalculator } from "#src/events/kills/event-point-recalculation";
import type { EventPointsStore } from "#src/events/kills/event-points.repository";

type EventKillPoint = typeof eventKillPointTable.$inferSelect;

export const makeEventPoints = (
  repository: EventPointsStore,
  eventEmitter: EventEmitter,
  eventReadCache: EventReadCache,
) => {
  const presenceStats = makeEventMemberPresenceStats(repository);

  const recalculateEventPointsWithCurrentRules = makeEventPointsRecalculator(
    repository,
    emitRankingUpdateByEventId,
  );

  function recalculateEventPoints(eventId: string, _newBasePoints: number) {
    return recalculateEventPointsWithCurrentRules(eventId);
  }

  function updateRankingAfterKill(
    eventId: string,
    killPoints: EventKillPoint[],
  ) {
    const rankableKillPoints = killPoints.filter((killPoint) =>
      isKillPointCountedInRanking({
        confirmationDeadlineAt: killPoint.confirmationDeadlineAt,
        confirmedAt: killPoint.confirmedAt,
      }),
    );

    if (rankableKillPoints.length === 0) {
      return Effect.void;
    }

    return Effect.gen(function* () {
      yield* Effect.forEach(
        Map.groupBy(rankableKillPoints, ({ killId }) => killId),
        ([killId, points]) =>
          repository.addKillToRankings(
            eventId,
            killId,
            points.map((killPoint) => ({
              memberId: killPoint.memberId,
              points: killPoint.points,
              trackingSeconds: getTrackingDurationSecondsForRanking({
                trackingDurationSeconds: killPoint.trackingDurationSeconds,
              }),
              afkPercentage: killPoint.afkPercentage,
              pointsModified: killPoint.manualAdjustmentPoints !== 0,
            })),
          ),
        { discard: true },
      );

      yield* emitRankingUpdateByEventId(eventId);
    }).pipe(Effect.withSpan("events.points.updateRankingAfterKill"));
  }

  function emitRankingUpdateByEventId(eventId: string) {
    return Effect.gen(function* () {
      const event = yield* repository.findEvent(eventId);

      if (!event) {
        return;
      }

      yield* Effect.all(
        [
          Effect.tryPromise({
            try: () => eventReadCache.invalidateEvent(event.guildId, event.id),
            catch: (cause) => cause,
          }),
          eventEmitter.emit(RabbitRoutingKey.EVENT_RANKING_UPDATE, {
            guildId: event.guildId,
            eventId: event.id,
          }),
        ],
        { concurrency: "unbounded", discard: true },
      );
    }).pipe(Effect.withSpan("events.points.publishRanking"));
  }

  return {
    calculateMemberPoints,
    getMemberPresenceStats: presenceStats.getMemberPresenceStats,
    getMembersPresenceStats: presenceStats.getMembersPresenceStats,
    getMembersPresenceStatsPerMap: presenceStats.getMembersPresenceStatsPerMap,
    recalculateEventPoints,
    updateRankingAfterKill,
  };
};

export type EventPoints = ReturnType<typeof makeEventPoints>;
