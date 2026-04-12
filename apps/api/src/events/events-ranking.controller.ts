import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UserId } from "@lootlog/nest-shared";
import { ZodResponse } from "nestjs-zod";
import { Permission, type Role } from "src/generated/prisma/client";
import type {
  UpdateKillPointDto,
  UpdateRankingPointsDto,
} from "./dto/update-points.dto";
import {
  ConfirmParticipationForKillResponseDto,
  EventRankingEntryResponseDto,
  EventTimerResponseDto,
  PendingParticipationConfirmationsResponseDto,
  RankingEditHistoryEntryResponseDto,
} from "./dto/event-response.dto";
import {
  EventHeroStatsResponseDto,
  EventKillHistoryResponseDto,
  EventMemberKillHistoryResponseDto,
  KillDetailResponseDto,
} from "./dto/event-kill-response.dto";
import { EventsService } from "./events.service";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import { GuildMember } from "src/shared/decorators/member.decorator";
import { MemberPermissions } from "src/shared/decorators/member-permissions.decorator";
import { MemberRoles } from "src/shared/decorators/member-roles.decorator";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";

@ApiTags("events")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class EventsRankingController {
  constructor(private readonly eventsService: EventsService) {}

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/participation-confirmations/pending")
  @ApiOperation({
    operationId: "listPendingParticipationConfirmations",
    summary: "Get participation confirmations",
    description:
      "Get pending and expired kill participation confirmations for currently authenticated member",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ZodResponse({
    status: 200,
    description: "Participation confirmations",
    type: PendingParticipationConfirmationsResponseDto,
  })
  getPendingParticipationConfirmations(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @GuildMember() member: { id: number },
  ) {
    return this.eventsService.getPendingParticipationConfirmations(
      guildData.id,
      eventId,
      member.id,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_WRITE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/events/:eventId/kills/:killId/confirm-participation")
  @ApiOperation({
    operationId: "confirmParticipationForKill",
    summary: "Confirm participation in kill tracking",
    description:
      "Confirm member participation for a kill within configured confirmation window",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "killId", description: "Kill ID" })
  @ZodResponse({
    status: 200,
    description: "Participation confirmed",
    type: ConfirmParticipationForKillResponseDto,
  })
  confirmParticipationForKill(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("killId") killId: string,
    @GuildMember() member: { id: number },
  ) {
    return this.eventsService.confirmParticipationForKill(
      guildData.id,
      eventId,
      killId,
      member.id,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/ranking")
  @ApiOperation({
    operationId: "listEventRanking",
    summary: "Get event ranking",
    description: "Get the ranking for an event",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ZodResponse({
    status: 200,
    description: "Event ranking",
    type: [EventRankingEntryResponseDto],
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getRanking(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    const [eventOverview, rankings] = await Promise.all([
      this.eventsService.getEventOverview(guildData.id, eventId),
      this.eventsService.getRanking(guildData.id, eventId),
    ]);

    const filteredOverview = this.eventsService.filterEventHeroesByLevel(
      eventOverview,
      roles,
      permissions,
    );
    const visibleHeroNames = new Set(
      filteredOverview.heroNpcs.map((hero) => hero.npcName),
    );

    return rankings.filter((ranking) =>
      visibleHeroNames.has(ranking.heroNpcName),
    );
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Patch("/guilds/:guildId/events/:eventId/ranking/:rankingId")
  @ApiOperation({
    operationId: "updateRankingPoints",
    summary: "Update ranking points",
    description:
      "Apply a signed manual points delta to a ranking entry (OWNER/ADMIN only)",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "rankingId", description: "Ranking ID" })
  @ApiResponse({
    status: 200,
    description: "Ranking updated",
  })
  @ApiResponse({ status: 404, description: "Ranking not found" })
  updateRankingPoints(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("rankingId") rankingId: string,
    @Body() data: UpdateRankingPointsDto,
    @UserId() userId: string,
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

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/ranking/:rankingId/history")
  @ApiOperation({
    operationId: "listRankingEditHistory",
    summary: "Get ranking edit history",
    description: "Get the edit history for a ranking entry (OWNER/ADMIN only)",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "rankingId", description: "Ranking ID" })
  @ZodResponse({
    status: 200,
    description: "Edit history returned",
    type: [RankingEditHistoryEntryResponseDto],
  })
  @ApiResponse({ status: 404, description: "Ranking not found" })
  getRankingEditHistory(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("rankingId") rankingId: string,
  ) {
    return this.eventsService.getRankingEditHistory(
      guildData.id,
      eventId,
      rankingId,
    );
  }

  @Permissions(Permission.LOOTLOG_TIMERS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/timers")
  @ApiOperation({
    operationId: "listEventHeroTimers",
    summary: "Get event hero timers",
    description: "Get timers for all hero NPCs in this event",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiQuery({ name: "world", description: "World name", required: true })
  @ZodResponse({
    status: 200,
    description: "List of timers for event heroes",
    type: [EventTimerResponseDto],
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getEventHeroTimers(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Query("world") world: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
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
        permissions,
      );
    });
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/hero-stats")
  @ApiOperation({
    summary: "Get event hero stats",
    description: "Get kill counts and stats for all heroes in an event",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ZodResponse({
    status: 200,
    description: "List of hero stats with kill counts",
    type: [EventHeroStatsResponseDto],
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getEventHeroStats(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    const stats = await this.eventsService.getEventHeroStats(
      guildData.id,
      eventId,
    );

    return stats.filter((stat) =>
      this.eventsService.isHeroVisibleToUser(
        { npcLvl: stat.npcLvl },
        roles,
        permissions,
      ),
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/kills")
  @ApiOperation({
    summary: "Get event kill history",
    description:
      "Get paginated kill history for all heroes in an event, with participant point details",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiQuery({
    name: "limit",
    description: "Number of kills to return (default 20)",
    required: false,
  })
  @ApiQuery({
    name: "cursor",
    description: "Cursor for pagination",
    required: false,
  })
  @ApiQuery({
    name: "heroId",
    description: "Filter by hero ID (optional)",
    required: false,
  })
  @ZodResponse({
    status: 200,
    description: "Paginated list of kills with participant details",
    type: EventKillHistoryResponseDto,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  async getEventKillHistory(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
    @Query("heroId") heroId?: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    if (heroId) {
      await this.eventsService.getHeroWithAccessCheck(
        guildData.id,
        eventId,
        heroId,
        roles,
        permissions,
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
          permissions,
        ),
      ),
    };
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/members/:memberId/kills")
  @ApiOperation({
    summary: "Get member kill history",
    description:
      "Get paginated kill history for a specific member in an event, with detailed point breakdown per kill",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "memberId", description: "Member ID" })
  @ApiQuery({
    name: "limit",
    description: "Number of kills to return (default 20)",
    required: false,
  })
  @ApiQuery({
    name: "cursor",
    description: "Cursor for pagination",
    required: false,
  })
  @ApiQuery({
    name: "heroId",
    description: "Filter by hero ID (optional)",
    required: false,
  })
  @ZodResponse({
    status: 200,
    description: "Paginated list of member kills with point breakdown",
    type: EventMemberKillHistoryResponseDto,
  })
  @ApiResponse({ status: 404, description: "Event or member not found" })
  async getMemberKillHistory(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("memberId") memberId: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
    @Query("heroId") heroId?: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
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
        permissions,
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
          permissions,
        ),
      ),
    };
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/heroes/:heroId/kills")
  @ApiOperation({
    summary: "Get hero kill history",
    description:
      "Get paginated kill history for a specific hero, with participant point details",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiQuery({
    name: "limit",
    description: "Number of kills to return (default 20)",
    required: false,
  })
  @ApiQuery({
    name: "cursor",
    description: "Cursor for pagination",
    required: false,
  })
  @ZodResponse({
    status: 200,
    description: "Paginated list of kills with participant details",
    type: EventKillHistoryResponseDto,
  })
  @ApiResponse({ status: 404, description: "Hero not found" })
  async getHeroKillHistory(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    await this.eventsService.getHeroWithAccessCheck(
      guildData.id,
      eventId,
      heroId,
      roles,
      permissions,
    );

    return this.eventsService.getHeroKillHistory(
      guildData.id,
      eventId,
      heroId,
      limit ? Number.parseInt(limit, 10) : 20,
      cursor,
    );
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/events/:eventId/heroes/:heroId/kills/:killId")
  @ApiOperation({
    summary: "Get kill details",
    description:
      "Get detailed information about a specific kill including participants, scoring breakdown, and matching loots",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "heroId", description: "Hero ID" })
  @ApiParam({ name: "killId", description: "Kill ID" })
  @ZodResponse({
    status: 200,
    description:
      "Kill details with participants, event config, and matching loots",
    type: KillDetailResponseDto,
  })
  @ApiResponse({ status: 404, description: "Kill not found" })
  async getKillDetail(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("heroId") heroId: string,
    @Param("killId") killId: string,
    @MemberRoles() roles: Role[] = [],
    @MemberPermissions() permissions: Permission[] = [],
  ) {
    await this.eventsService.getHeroWithAccessCheck(
      guildData.id,
      eventId,
      heroId,
      roles,
      permissions,
    );

    return this.eventsService.getKillDetail(
      guildData.id,
      eventId,
      heroId,
      killId,
    );
  }

  @Permissions(Permission.OWNER, Permission.ADMIN)
  @UseGuards(PermissionsGuard)
  @Patch("/guilds/:guildId/events/:eventId/kills/:killId/points/:killPointId")
  @ApiOperation({
    summary: "Update kill point",
    description:
      "Apply a signed manual points delta for a specific kill participant (OWNER/ADMIN only). Automatically recalculates ranking.",
  })
  @ApiParam({ name: "guildId", description: "Guild ID" })
  @ApiParam({ name: "eventId", description: "Event ID" })
  @ApiParam({ name: "killId", description: "Kill ID" })
  @ApiParam({ name: "killPointId", description: "Kill Point ID" })
  @ApiResponse({
    status: 200,
    description: "Kill point updated and ranking recalculated",
  })
  @ApiResponse({ status: 404, description: "Kill point not found" })
  updateKillPoint(
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
    @Param("killId") killId: string,
    @Param("killPointId") killPointId: string,
    @Body() data: UpdateKillPointDto,
    @UserId() userId: string,
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
