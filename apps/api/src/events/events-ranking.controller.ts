import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { BadRequestException } from "#src/shared/http/http-errors";

import { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";
type Role = typeof roleTable.$inferSelect;
import {
  UpdateKillPointDto,
  UpdateRankingPointsDto,
} from "./dto/update-points.dto.js";
import {
  AcknowledgeExpiredParticipationConfirmationsDto,
  AcknowledgeExpiredParticipationConfirmationsResponseDto,
} from "./dto/acknowledge-participation-confirmations.dto.js";
import {
  ConfirmParticipationForKillResponseDto,
  EventRankingEntryResponseDto,
  EventTimerResponseDto,
  PendingParticipationConfirmationsResponseDto,
} from "./dto/event-response.dto.js";
import {
  EventHeroStatsResponseDto,
  EventKillHistoryResponseDto,
  EventMemberKillHistoryResponseDto,
  KillDetailResponseDto,
} from "./dto/event-kill-response.dto.js";
import { EventsService } from "./events.service.js";

export class EventsRankingController {
  constructor(private readonly eventsService: EventsService) {}

  getPendingParticipationConfirmations(
    guildData: { id: string },
    eventId: string,
    member: { id: number },
  ) {
    return this.eventsService.getPendingParticipationConfirmations(
      guildData.id,
      eventId,
      member.id,
    );
  }

  acknowledgeExpiredParticipationConfirmations(
    guildData: { id: string },
    eventId: string,
    member: { id: number },
    data: AcknowledgeExpiredParticipationConfirmationsDto,
  ) {
    return this.eventsService.acknowledgeExpiredParticipationConfirmations(
      guildData.id,
      eventId,
      member.id,
      data.killIds,
    );
  }

  confirmParticipationForKill(
    guildData: { id: string },
    eventId: string,
    killId: string,
    member: { id: number },
  ) {
    return this.eventsService.confirmParticipationForKill(
      guildData.id,
      eventId,
      killId,
      member.id,
    );
  }

  async getRanking(
    guildData: { id: string },
    eventId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    const [eventOverview, rankings] = await Promise.all([
      this.eventsService.getEventOverview(guildData.id, eventId),
      this.eventsService.getRanking(guildData.id, eventId),
    ]);

    const filteredOverview = this.eventsService.filterEventHeroesByLevel(
      eventOverview,
      roles,
      accessPolicy,
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

    const editHistories = await this.eventsService.getRankingEditHistories(
      guildData.id,
      eventId,
      visibleRankings.map((ranking) => ranking.id),
    );

    return visibleRankings.map((ranking) => ({
      ...ranking,
      editHistory: editHistories.get(ranking.id) ?? [],
    }));
  }

  updateRankingPoints(
    guildData: { id: string },
    eventId: string,
    rankingId: string,
    data: UpdateRankingPointsDto,
    userId: string,
  ) {
    return this.eventsService.updateRankingPoints(
      guildData.id,
      eventId,
      rankingId,
      data.pointsDelta,
      data.comment,
      userId,
    );
  }

  async getEventHeroTimers(
    guildData: { id: string },
    eventId: string,
    world: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    const timers = await this.eventsService.getEventHeroTimers(
      guildData.id,
      eventId,
      world,
    );

    return timers.filter((timer) => {
      const npc = timer.npc as { lvl?: number } | null;
      const npcLvl = npc?.lvl ?? null;
      return this.eventsService.isHeroVisibleToUser(
        { npcLvl },
        roles,
        accessPolicy,
      );
    });
  }

  async getEventHeroStats(
    guildData: { id: string },
    eventId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    const stats = await this.eventsService.getEventHeroStats(
      guildData.id,
      eventId,
    );

    return stats.filter((stat) =>
      this.eventsService.isHeroVisibleToUser(
        { npcLvl: stat.npcLvl },
        roles,
        accessPolicy,
      ),
    );
  }

  async getEventKillHistory(
    guildData: { id: string },
    eventId: string,
    accessPolicy: AccessPolicy,
    limit?: string,
    cursor?: string,
    heroId?: string,
    roles: Role[] = [],
  ) {
    if (heroId) {
      await this.eventsService.getHeroWithAccessCheck(
        guildData.id,
        eventId,
        heroId,
        roles,
        accessPolicy,
      );
    }

    const result = await this.eventsService.getEventKillHistory(
      guildData.id,
      eventId,
      limit ? Number.parseInt(limit, 10) : 20,
      cursor,
      heroId,
    );

    return {
      ...result,
      data: result.data.filter((kill) =>
        this.eventsService.isHeroVisibleToUser(
          { npcLvl: kill.heroNpc.npcLvl },
          roles,
          accessPolicy,
        ),
      ),
    };
  }

  async getMemberKillHistory(
    guildData: { id: string },
    eventId: string,
    memberId: string,
    accessPolicy: AccessPolicy,
    limit?: string,
    cursor?: string,
    heroId?: string,
    roles: Role[] = [],
  ) {
    const parsedMemberId = Number.parseInt(memberId, 10);

    if (Number.isNaN(parsedMemberId)) {
      throw new BadRequestException("Invalid member ID");
    }

    if (heroId) {
      await this.eventsService.getHeroWithAccessCheck(
        guildData.id,
        eventId,
        heroId,
        roles,
        accessPolicy,
      );
    }

    const result = await this.eventsService.getMemberKillHistory(
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
        this.eventsService.isHeroVisibleToUser(
          { npcLvl: kill.heroNpc.npcLvl },
          roles,
          accessPolicy,
        ),
      ),
    };
  }

  async getHeroKillHistory(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    accessPolicy: AccessPolicy,
    limit?: string,
    cursor?: string,
    roles: Role[] = [],
  ) {
    await this.eventsService.getHeroWithAccessCheck(
      guildData.id,
      eventId,
      heroId,
      roles,
      accessPolicy,
    );

    return this.eventsService.getHeroKillHistory(
      guildData.id,
      eventId,
      heroId,
      limit ? Number.parseInt(limit, 10) : 20,
      cursor,
    );
  }

  async getKillDetail(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    killId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    await this.eventsService.getHeroWithAccessCheck(
      guildData.id,
      eventId,
      heroId,
      roles,
      accessPolicy,
    );

    return this.eventsService.getKillDetail(
      guildData.id,
      eventId,
      heroId,
      killId,
    );
  }

  updateKillPoint(
    guildData: { id: string },
    eventId: string,
    killId: string,
    killPointId: string,
    data: UpdateKillPointDto,
    userId: string,
  ) {
    return this.eventsService.updateKillPoint(
      guildData.id,
      eventId,
      killId,
      killPointId,
      data.pointsDelta,
      data.comment,
      userId,
    );
  }
}
