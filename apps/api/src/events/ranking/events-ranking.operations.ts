import type { AccessPolicy } from "@lootlog/domain/access-policy";

import { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";

type Role = typeof roleTable.$inferSelect;

import {
  AcknowledgeExpiredParticipationConfirmationsRequest,
  UpdateKillPointRequest,
  UpdateRankingPointsRequest,
} from "#src/contracts/events/schemas";
import type { EventRankingRead } from "#src/events/ranking/event-ranking-read";
import { Effect } from "effect";
import type { EventsCatalogRead } from "#src/events/catalog/events-catalog-read";
import type { EventAccess } from "#src/events/event-access";
import type { EventParticipation } from "#src/events/coordination/event-participation";
import type { EventPointEdits } from "#src/events/kills/event-point-edits";
import type { EventHeroSummary } from "#src/events/kills/event-hero-summary";

export const makeEventsRanking = (
  rankingRead: Pick<EventRankingRead, "getEditHistories" | "getRanking">,
  catalogRead: Pick<EventsCatalogRead, "getEventOverview">,
  eventAccess: EventAccess,
  participation: Pick<
    EventParticipation,
    "acknowledgeExpired" | "confirm" | "getPending"
  >,
  pointEdits: Pick<EventPointEdits, "updateKillPoint" | "updateRanking">,
  heroSummary: EventHeroSummary,
) => ({
  getPendingParticipationConfirmations(
    guildData: { id: string },
    eventId: string,
    member: { id: number },
  ) {
    return participation.getPending(guildData, eventId, member);
  },

  acknowledgeExpiredParticipationConfirmations(
    guildData: { id: string },
    eventId: string,
    member: { id: number },
    data: AcknowledgeExpiredParticipationConfirmationsRequest,
  ) {
    return participation.acknowledgeExpired(guildData, eventId, member, data);
  },

  confirmParticipationForKill(
    guildData: { id: string },
    eventId: string,
    killId: string,
    member: { id: number },
  ) {
    return participation.confirm(guildData, eventId, killId, member);
  },

  getRanking(
    guildData: { id: string },
    eventId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    return Effect.gen(function* () {
      const { filteredOverview, rankings } = yield* Effect.all(
        {
          filteredOverview: catalogRead.getEventOverview(
            guildData,
            eventId,
            roles,
            accessPolicy,
          ),
          rankings: rankingRead.getRanking(guildData.id, eventId),
        },
        { concurrency: "unbounded" },
      );

      const visibleHeroNames = new Set(
        filteredOverview.heroNpcs.map((hero) => hero.npcName),
      );

      const visibleRankings = rankings.filter((ranking) =>
        visibleHeroNames.has(ranking.heroNpcName),
      );

      if (visibleRankings.length === 0) {
        return [];
      }

      const canViewEditHistory =
        accessPolicy.allows(Permission.OWNER) ||
        accessPolicy.allows(Permission.ADMIN);

      if (!canViewEditHistory) {
        return visibleRankings.map((ranking) => ({
          ...ranking,
          editHistory: [],
        }));
      }

      const editHistories = yield* rankingRead.getEditHistories(
        guildData.id,
        eventId,
        visibleRankings.map((ranking) => ranking.id),
      );

      return visibleRankings.map((ranking) => ({
        ...ranking,
        editHistory: editHistories.get(ranking.id) ?? [],
      }));
    }).pipe(Effect.withSpan("EventsRanking.getRanking"));
  },

  updateRankingPoints(
    guildData: { id: string },
    eventId: string,
    rankingId: string,
    data: UpdateRankingPointsRequest,
    userId: string,
  ) {
    return pointEdits.updateRanking(
      guildData,
      eventId,
      rankingId,
      data,
      userId,
    );
  },

  getEventHeroTimers(
    guildData: { id: string },
    eventId: string,
    world: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    return heroSummary
      .getTimers(guildData, eventId, world)
      .pipe(
        Effect.map((timers) =>
          timers.flatMap(({ npcLvl, ...timer }) =>
            eventAccess.isHeroVisible({ npcLvl }, roles, accessPolicy)
              ? [timer]
              : [],
          ),
        ),
      );
  },

  getEventHeroStats(
    guildData: { id: string },
    eventId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    return heroSummary
      .getStats(guildData, eventId)
      .pipe(
        Effect.map((stats) =>
          stats.filter((stat) =>
            eventAccess.isHeroVisible(
              { npcLvl: stat.npcLvl },
              roles,
              accessPolicy,
            ),
          ),
        ),
      );
  },

  updateKillPoint(
    guildData: { id: string },
    eventId: string,
    killId: string,
    killPointId: string,
    data: UpdateKillPointRequest,
    userId: string,
  ) {
    return pointEdits.updateKillPoint(
      guildData,
      eventId,
      killId,
      killPointId,
      data,
      userId,
    );
  },
});

export type EventsRanking = ReturnType<typeof makeEventsRanking>;
