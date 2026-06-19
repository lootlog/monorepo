import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import type { Queue } from "bullmq";
import type {
  Event,
  EventHeroNpc,
  EventKillPoint,
  Guild,
  Permission,
  Role,
} from "src/generated/prisma/client";
import type { EventWrappedResponseDto } from "./dto/event-wrapped.dto";
import { EVENT_HERO_KILL_QUEUE } from "./constants/event-hero-kill-queue.constant";
import type { CreateEventDto } from "./dto/create-event.dto";
import type { CreateHeroDto } from "./dto/create-hero.dto";
import type { CreateLocationDto } from "./dto/create-location.dto";
import type { CreateMapDto } from "./dto/create-map.dto";
import type { ReorderLocationsDto } from "./dto/reorder-locations.dto";
import type { UpdateEventDto } from "./dto/update-event.dto";
import type { UpdateHeroDto } from "./dto/update-hero.dto";
import type { UpdateLocationDto } from "./dto/update-location.dto";
import type {
  CheckEventHeroKillParams,
  EventHeroKillJobData,
  KillTimerData,
} from "./interfaces";
import type {
  CloseRespawnWindowOptions,
  OpenRespawnWindowOptions,
} from "./interfaces/respawn-window.interface";
import {
  EVENT_HERO_KILL_JOB_NAME,
  buildEventHeroKillJobId,
  createEventHeroKillJobData,
  getEventHeroKillWindowKey,
} from "./utils/event-hero-kill-job";
import { EventAccessService } from "./services/event-access.service";
import { EventCatalogService } from "./services/event-catalog.service";
import { EventKillService } from "./services/event-kill.service";
import { EventPointsService } from "./services/event-points.service";
import { EventQueueDiagnosticsService } from "./services/event-queue-diagnostics.service";
import { EventRespawnService } from "./services/event-respawn.service";
import { EventTrackingService } from "./services/event-tracking.service";
import { EventWrappedService } from "./services/event-wrapped.service";
import { EventCoordinationService } from "./services/event-coordination.service";

@Injectable()
export class EventsService {
  constructor(
    private readonly catalogService: EventCatalogService,
    private readonly accessService: EventAccessService,
    private readonly queueDiagnosticsService: EventQueueDiagnosticsService,
    private readonly pointsService: EventPointsService,
    private readonly trackingService: EventTrackingService,
    private readonly killService: EventKillService,
    private readonly respawnService: EventRespawnService,
    private readonly wrappedService: EventWrappedService,
    private readonly coordinationService: EventCoordinationService,
    @InjectQueue(EVENT_HERO_KILL_QUEUE)
    private readonly eventHeroKillQueue: Queue<EventHeroKillJobData>,
  ) {}

  createEvent(guildId: string, data: CreateEventDto) {
    return this.catalogService.createEvent(guildId, data);
  }

  getEvents(guildId: string, world?: string, activeOnly = true) {
    return this.catalogService.getEvents(guildId, world, activeOnly);
  }

  getEvent(guildId: string, eventId: string) {
    return this.catalogService.getEvent(guildId, eventId);
  }

  getEventOverview(guildId: string, eventId: string) {
    return this.catalogService.getEventOverview(guildId, eventId);
  }

  getEventMaps(guildId: string, eventId: string) {
    return this.catalogService.getEventMaps(guildId, eventId);
  }

  getCoordination(guildId: string, eventId: string) {
    return this.coordinationService.getCoordination(guildId, eventId);
  }

  getWrapped(
    guild: Guild,
    eventId: string,
    permissions: Permission[],
    roles: Role[],
  ): Promise<EventWrappedResponseDto> {
    return this.wrappedService.getWrapped(guild, eventId, permissions, roles);
  }

  updateEvent(guildId: string, eventId: string, data: UpdateEventDto) {
    return this.catalogService.updateEvent(guildId, eventId, data);
  }

  recalculateEventPointsForEvent(guildId: string, eventId: string) {
    return this.catalogService.recalculateEventPointsForEvent(guildId, eventId);
  }

  deleteEvent(guildId: string, eventId: string) {
    return this.catalogService.deleteEvent(guildId, eventId);
  }

  assignMemberToMap(
    guildId: string,
    eventId: string,
    mapId: string,
    memberId: number,
  ) {
    return this.trackingService.assignMemberToMap(
      guildId,
      eventId,
      mapId,
      memberId,
    );
  }

  unassignMemberFromMap(
    guildId: string,
    eventId: string,
    mapId: string,
    memberId?: number,
  ) {
    return this.trackingService.unassignMemberFromMap(
      guildId,
      eventId,
      mapId,
      memberId,
    );
  }

  getRanking(guildId: string, eventId: string) {
    return this.pointsService.getRanking(guildId, eventId);
  }

  getMemberByDiscordId(discordId: string, guildId: string) {
    return this.trackingService.getMemberByDiscordId(discordId, guildId);
  }

  createHero(guildId: string, eventId: string, data: CreateHeroDto) {
    return this.catalogService.createHero(guildId, eventId, data);
  }

  updateHero(
    guildId: string,
    eventId: string,
    heroId: string,
    data: UpdateHeroDto,
  ) {
    return this.catalogService.updateHero(guildId, eventId, heroId, data);
  }

  deleteHero(guildId: string, eventId: string, heroId: string) {
    return this.catalogService.deleteHero(guildId, eventId, heroId);
  }

  addMap(guildId: string, eventId: string, heroId: string, data: CreateMapDto) {
    return this.catalogService.addMap(guildId, eventId, heroId, data);
  }

  deleteMap(guildId: string, eventId: string, heroId: string, mapId: string) {
    return this.catalogService.deleteMap(guildId, eventId, heroId, mapId);
  }

  createLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    data: CreateLocationDto,
  ) {
    return this.catalogService.createLocation(guildId, eventId, heroId, data);
  }

  updateLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    locationId: string,
    data: UpdateLocationDto,
  ) {
    return this.catalogService.updateLocation(
      guildId,
      eventId,
      heroId,
      locationId,
      data,
    );
  }

  deleteLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    locationId: string,
  ) {
    return this.catalogService.deleteLocation(
      guildId,
      eventId,
      heroId,
      locationId,
    );
  }

  reorderLocations(
    guildId: string,
    eventId: string,
    heroId: string,
    data: ReorderLocationsDto,
  ) {
    return this.catalogService.reorderLocations(guildId, eventId, heroId, data);
  }

  assignMapToLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    mapId: string,
    locationId: string | null,
  ) {
    return this.catalogService.assignMapToLocation(
      guildId,
      eventId,
      heroId,
      mapId,
      locationId,
    );
  }

  getLocations(guildId: string, eventId: string, heroId: string) {
    return this.catalogService.getLocations(guildId, eventId, heroId);
  }

  openUnassignedGap(mapId: string, heroNpcId: string): Promise<void> {
    return this.trackingService.openUnassignedGap(mapId, heroNpcId);
  }

  closeUnassignedGap(mapId: string): Promise<void> {
    return this.trackingService.closeUnassignedGap(mapId);
  }

  openUncoveredGap(mapId: string, heroNpcId: string): Promise<void> {
    return this.trackingService.openUncoveredGap(mapId, heroNpcId);
  }

  closeUncoveredGap(mapId: string): Promise<void> {
    return this.trackingService.closeUncoveredGap(mapId);
  }

  closeAllGapsForHero(heroNpcId: string): Promise<void> {
    return this.trackingService.closeAllGapsForHero(heroNpcId);
  }

  getMapCoverageGaps(guildId: string, eventId: string, mapId: string) {
    return this.trackingService.getMapCoverageGaps(guildId, eventId, mapId);
  }

  getHeroCoverageGaps(guildId: string, eventId: string, heroNpcId: string) {
    return this.trackingService.getHeroCoverageGaps(
      guildId,
      eventId,
      heroNpcId,
    );
  }

  getActiveGapForMap(guildId: string, eventId: string, mapId: string) {
    return this.trackingService.getActiveGapForMap(guildId, eventId, mapId);
  }

  getActiveGapsForHero(guildId: string, eventId: string, heroNpcId: string) {
    return this.trackingService.getActiveGapsForHero(
      guildId,
      eventId,
      heroNpcId,
    );
  }

  handlePlayerPresenceChange(
    guildId: string,
    mapName: string,
    discordId: string,
    hasPlayer: boolean,
    isAfk = false,
  ): Promise<void> {
    return this.trackingService.handlePlayerPresenceChange(
      guildId,
      mapName,
      discordId,
      hasPlayer,
      isAfk,
    );
  }

  getHeroPresenceStats(guildId: string, eventId: string, heroNpcId: string) {
    return this.trackingService.getHeroPresenceStats(
      guildId,
      eventId,
      heroNpcId,
    );
  }

  getEventHeroTimers(guildId: string, eventId: string, world: string) {
    return this.killService.getEventHeroTimers(guildId, eventId, world);
  }

  getEventHeroStats(guildId: string, eventId: string) {
    return this.killService.getEventHeroStats(guildId, eventId);
  }

  async enqueueEventHeroKillCheck(
    params: CheckEventHeroKillParams,
    isManualClose = false,
  ): Promise<void> {
    const windowKey = getEventHeroKillWindowKey(params.timerData);
    const jobId = buildEventHeroKillJobId({
      guildId: params.guildId,
      world: params.world,
      npcId: params.npcId,
      windowKey,
      isManualClose,
    });

    await this.eventHeroKillQueue.add(
      EVENT_HERO_KILL_JOB_NAME,
      createEventHeroKillJobData(params, isManualClose),
      {
        jobId,
        attempts: 5,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  checkAndRecordEventHeroKill(
    params: CheckEventHeroKillParams,
    isManualClose = false,
  ): Promise<void> {
    return this.killService.checkAndRecordEventHeroKill(
      params.guildId,
      params.world,
      params.npcId,
      params.npcName,
      params.npcIcon,
      params.timerData,
      isManualClose,
      params.npcLvl,
    );
  }

  findActiveEventHeroByNpc(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
  ): Promise<{ eventHero: EventHeroNpc; event: Event } | null> {
    return this.killService.findActiveEventHeroByNpc(
      guildId,
      world,
      npcId,
      npcName,
    );
  }

  recordHeroKill(
    guildId: string,
    eventHero: EventHeroNpc,
    event: Event,
    timerData: KillTimerData,
  ) {
    return this.killService.recordHeroKill(
      guildId,
      eventHero,
      event,
      timerData,
    );
  }

  recalculateEventPoints(
    eventId: string,
    newBasePoints: number,
  ): Promise<void> {
    return this.pointsService.recalculateEventPoints(eventId, newBasePoints);
  }

  getMemberPresenceStats(heroNpcId: string, memberId: number, since?: Date) {
    return this.pointsService.getMemberPresenceStats(
      heroNpcId,
      memberId,
      since,
    );
  }

  updateRankingAfterKill(
    eventId: string,
    heroNpcName: string,
    killPoints: EventKillPoint[],
  ): Promise<void> {
    return this.pointsService.updateRankingAfterKill(
      eventId,
      heroNpcName,
      killPoints,
    );
  }

  updateKillPoint(
    guildId: string,
    eventId: string,
    killId: string,
    killPointId: string,
    pointsDelta: number,
    comment: string | undefined,
    editedByUserId: string,
  ) {
    return this.pointsService.updateKillPoint(
      guildId,
      eventId,
      killId,
      killPointId,
      pointsDelta,
      comment,
      editedByUserId,
    );
  }

  updateRankingPoints(
    guildId: string,
    eventId: string,
    rankingId: string,
    pointsDelta: number,
    comment: string | undefined,
    editedByUserId: string,
  ) {
    return this.pointsService.updateRankingPoints(
      guildId,
      eventId,
      rankingId,
      pointsDelta,
      comment,
      editedByUserId,
    );
  }

  getRankingEditHistory(guildId: string, eventId: string, rankingId: string) {
    return this.pointsService.getRankingEditHistory(
      guildId,
      eventId,
      rankingId,
    );
  }

  getHeroKillHistory(
    guildId: string,
    eventId: string,
    heroId: string,
    limit = 20,
    cursor?: string,
  ) {
    return this.killService.getHeroKillHistory(
      guildId,
      eventId,
      heroId,
      limit,
      cursor,
    );
  }

  getEventKillHistory(
    guildId: string,
    eventId: string,
    limit = 20,
    cursor?: string,
    heroId?: string,
  ) {
    return this.killService.getEventKillHistory(
      guildId,
      eventId,
      limit,
      cursor,
      heroId,
    );
  }

  getMemberKillHistory(
    guildId: string,
    eventId: string,
    memberId: number,
    limit = 20,
    cursor?: string,
    heroId?: string,
  ) {
    return this.killService.getMemberKillHistory(
      guildId,
      eventId,
      memberId,
      limit,
      cursor,
      heroId,
    );
  }

  getPendingParticipationConfirmations(
    guildId: string,
    eventId: string,
    memberId: number,
  ) {
    return this.pointsService.getPendingParticipationConfirmations(
      guildId,
      eventId,
      memberId,
    );
  }

  confirmParticipationForKill(
    guildId: string,
    eventId: string,
    killId: string,
    memberId: number,
  ) {
    return this.pointsService.confirmParticipationForKill(
      guildId,
      eventId,
      killId,
      memberId,
    );
  }

  getKillDetail(
    guildId: string,
    eventId: string,
    heroId: string,
    killId: string,
  ) {
    return this.killService.getKillDetail(guildId, eventId, heroId, killId);
  }

  getKillTimelineData(
    guildId: string,
    eventId: string,
    heroId: string,
    killId: string,
  ) {
    return this.killService.getKillTimelineData(
      guildId,
      eventId,
      heroId,
      killId,
    );
  }

  closeRespawnWindow(
    guildId: string,
    eventId: string,
    heroId: string,
    options: CloseRespawnWindowOptions = {},
  ): Promise<void> {
    return this.respawnService.closeRespawnWindow(
      guildId,
      eventId,
      heroId,
      options,
    );
  }

  openRespawnWindow(
    guildId: string,
    eventId: string,
    heroId: string,
    options: OpenRespawnWindowOptions,
  ): Promise<{ minSpawnTime: Date; maxSpawnTime: Date }> {
    return this.respawnService.openRespawnWindow(
      guildId,
      eventId,
      heroId,
      options,
    );
  }

  getHeroRespawnConfig(
    guildId: string,
    eventId: string,
    heroId: string,
  ): Promise<{
    hasTimer: boolean;
    windowStatus: "OPEN" | "WAITING" | "OVERDUE" | "NONE";
    minSpawnTime: Date | null;
    maxSpawnTime: Date | null;
    overdueMs: number | null;
  }> {
    return this.respawnService.getHeroRespawnConfig(guildId, eventId, heroId);
  }

  getAutoCloseJobsStatus(guildId: string, eventId: string) {
    return this.queueDiagnosticsService.getAutoCloseJobsStatus(
      guildId,
      eventId,
    );
  }

  getQueueHealth(guildId: string, eventId: string) {
    return this.queueDiagnosticsService.getQueueHealth(guildId, eventId);
  }

  filterEventHeroesByLevel<
    T extends { heroNpcs: Array<{ npcLvl: number | null }> },
  >(event: T, roles: Role[], permissions: Permission[]): T {
    return this.accessService.filterEventHeroesByLevel(
      event,
      roles,
      permissions,
    );
  }

  filterEventsHeroesByLevel<
    T extends { heroNpcs: Array<{ npcLvl: number | null }> },
  >(events: T[], roles: Role[], permissions: Permission[]): T[] {
    return this.accessService.filterEventsHeroesByLevel(
      events,
      roles,
      permissions,
    );
  }

  isHeroVisibleToUser(
    hero: { npcLvl: number | null },
    roles: Role[],
    permissions: Permission[],
  ): boolean {
    return this.accessService.isHeroVisibleToUser(hero, roles, permissions);
  }

  getHeroWithAccessCheck(
    guildId: string,
    eventId: string,
    heroId: string,
    roles: Role[],
    permissions: Permission[],
  ) {
    return this.accessService.getHeroWithAccessCheck(
      guildId,
      eventId,
      heroId,
      roles,
      permissions,
    );
  }

  getMapWithHeroAccessCheck(
    guildId: string,
    eventId: string,
    mapId: string,
    roles: Role[],
    permissions: Permission[],
  ) {
    return this.accessService.getMapWithHeroAccessCheck(
      guildId,
      eventId,
      mapId,
      roles,
      permissions,
    );
  }
}
