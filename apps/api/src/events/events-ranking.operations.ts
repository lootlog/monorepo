import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { BadRequestException } from "#src/shared/http/http-errors";

import { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";
type Role = typeof roleTable.$inferSelect;
import {
  AcknowledgeExpiredParticipationConfirmationsDto,
  UpdateKillPointDto,
  UpdateRankingPointsDto,
} from "#src/http-api/lootlog-api";
import type { EventKills } from "./services/event-kill.service.js";
import type { EventRankingRead } from "./event-ranking-read.js";
import { Effect } from "effect";
import type { EventsCatalogRead } from "./events-catalog-read.js";
import type { EventAccess } from "./event-access.js";
import type { EventParticipation } from "./event-participation.js";
import type { EventPointEdits } from "./event-point-edits.js";
import type { EventHeroSummary } from "./event-hero-summary.js";

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
        return yield* Effect.fail(new BadRequestException("Invalid member ID"));
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
