import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { InvalidRequestError } from "#src/shared/http/http-errors";

import { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";
type Role = typeof roleTable.$inferSelect;
import {
  AcknowledgeExpiredParticipationConfirmationsDto,
  UpdateKillPointDto,
  UpdateRankingPointsDto,
} from "#src/http-api/contracts/events/schemas";
import type { EventKills } from "#src/events/kills/event-kill.service";
import type { EventRankingRead } from "#src/events/ranking/event-ranking-read";
import { Effect } from "effect";
import type { EventsCatalogRead } from "#src/events/catalog/events-catalog-read";
import type { EventAccess } from "#src/events/event-access";
import type { EventParticipation } from "#src/events/coordination/event-participation";
import type { EventPointEdits } from "#src/events/kills/event-point-edits";
import type { EventHeroSummary } from "#src/events/kills/event-hero-summary";

export const makeEventsRanking = (
  rankingRead: EventRankingRead,
  kills: EventKills,
  catalogRead: EventsCatalogRead,
  eventAccess: EventAccess,
  participation: EventParticipation,
  pointEdits: EventPointEdits,
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
    data: AcknowledgeExpiredParticipationConfirmationsDto,
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
      const { filteredOverview, rankings } = yield* Effect.all({
        filteredOverview: catalogRead.getEventOverview(
          guildData,
          eventId,
          roles,
          accessPolicy,
        ),
        rankings: rankingRead.getRanking(guildData.id, eventId),
      });
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
    data: UpdateRankingPointsDto,
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
    return heroSummary.getTimers(guildData, eventId, world).pipe(
      Effect.map((timers) =>
        timers.filter((timer) => {
          const npc = timer.npc as { lvl?: number } | null;
          return eventAccess.isHeroVisible(
            { npcLvl: npc?.lvl ?? null },
            roles,
            accessPolicy,
          );
        }),
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

  getEventKillHistory(
    guildData: { id: string },
    eventId: string,
    accessPolicy: AccessPolicy,
    limit?: string,
    cursor?: string,
    heroId?: string,
    roles: Role[] = [],
  ) {
    return Effect.gen(function* () {
      if (heroId) {
        yield* eventAccess.getHero(
          guildData.id,
          eventId,
          heroId,
          roles,
          accessPolicy,
        );
      }

      const result = yield* kills.getEventKillHistory(
        guildData.id,
        eventId,
        limit ? Number.parseInt(limit, 10) : 20,
        cursor,
        heroId,
      );

      return {
        ...result,
        data: result.data.filter((kill) =>
          eventAccess.isHeroVisible(
            { npcLvl: kill.heroNpc.npcLvl },
            roles,
            accessPolicy,
          ),
        ),
      };
    }).pipe(Effect.withSpan("EventsRanking.getEventKillHistory"));
  },

  getMemberKillHistory(
    guildData: { id: string },
    eventId: string,
    memberId: string,
    accessPolicy: AccessPolicy,
    limit?: string,
    cursor?: string,
    heroId?: string,
    roles: Role[] = [],
  ) {
    return Effect.gen(function* () {
      const parsedMemberId = Number.parseInt(memberId, 10);

      if (Number.isNaN(parsedMemberId)) {
        return yield* Effect.fail(new InvalidRequestError("Invalid member ID"));
      }

      if (heroId) {
        yield* eventAccess.getHero(
          guildData.id,
          eventId,
          heroId,
          roles,
          accessPolicy,
        );
      }

      const result = yield* kills.getMemberKillHistory(
        guildData.id,
        eventId,
        parsedMemberId,
        limit ? Number.parseInt(limit, 10) : 20,
        cursor,
        heroId,
      );

      return {
        ...result,
        data: result.data.filter((kill) =>
          eventAccess.isHeroVisible(
            { npcLvl: kill.heroNpc.npcLvl },
            roles,
            accessPolicy,
          ),
        ),
      };
    }).pipe(Effect.withSpan("EventsRanking.getMemberKillHistory"));
  },

  getHeroKillHistory(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    accessPolicy: AccessPolicy,
    limit?: string,
    cursor?: string,
    roles: Role[] = [],
  ) {
    return Effect.gen(function* () {
      yield* eventAccess.getHero(
        guildData.id,
        eventId,
        heroId,
        roles,
        accessPolicy,
      );

      return yield* kills.getHeroKillHistory(
        guildData.id,
        eventId,
        heroId,
        limit ? Number.parseInt(limit, 10) : 20,
        cursor,
      );
    }).pipe(Effect.withSpan("EventsRanking.getHeroKillHistory"));
  },

  getKillDetail(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    killId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    return Effect.gen(function* () {
      yield* eventAccess.getHero(
        guildData.id,
        eventId,
        heroId,
        roles,
        accessPolicy,
      );

      return yield* kills.getKillDetail(guildData.id, eventId, heroId, killId);
    }).pipe(Effect.withSpan("EventsRanking.getKillDetail"));
  },

  updateKillPoint(
    guildData: { id: string },
    eventId: string,
    killId: string,
    killPointId: string,
    data: UpdateKillPointDto,
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
