import type { AccessPolicy } from "@lootlog/domain/access-policy";

import { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";
type Role = typeof roleTable.$inferSelect;
import { CloseRespawnWindowDto } from "./dto/close-respawn-window.dto.js";
import { EventCoordinationResponseDto } from "./dto/event-coordination-response.dto.js";
import { OpenRespawnWindowDto } from "./dto/open-respawn-window.dto.js";
import {
  CoverageGapResponseDto,
  HeroCoverageGapResponseDto,
  HeroPresenceStatsResponseDto,
  HeroRespawnConfigResponseDto,
  KillTimelineMapResponseDto,
  NullableCoverageGapResponseDto,
} from "./dto/event-monitoring-response.dto.js";
import { EventsService } from "./events.service.js";

export class EventsMonitoringController {
  constructor(private readonly eventsService: EventsService) {}

  getCoordination(guildData: { id: string }, eventId: string) {
    return this.eventsService.getCoordination(guildData.id, eventId);
  }

  async getKillTimelineData(
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

    return this.eventsService.getKillTimelineData(
      guildData.id,
      eventId,
      heroId,
      killId,
    );
  }

  async getHeroCoverageGaps(
    guildData: { id: string },
    eventId: string,
    heroId: string,
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

    return this.eventsService.getHeroCoverageGaps(
      guildData.id,
      eventId,
      heroId,
    );
  }

  getMapCoverageGaps(
    guildData: { id: string },
    eventId: string,
    mapId: string,
  ) {
    return this.eventsService.getMapCoverageGaps(guildData.id, eventId, mapId);
  }

  getActiveGapForMap(
    guildData: { id: string },
    eventId: string,
    mapId: string,
  ) {
    return this.eventsService.getActiveGapForMap(guildData.id, eventId, mapId);
  }

  async getActiveGapsForHero(
    guildData: { id: string },
    eventId: string,
    heroId: string,
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

    return this.eventsService.getActiveGapsForHero(
      guildData.id,
      eventId,
      heroId,
    );
  }

  async getHeroPresenceStats(
    guildData: { id: string },
    eventId: string,
    heroId: string,
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

    return this.eventsService.getHeroPresenceStats(
      guildData.id,
      eventId,
      heroId,
    );
  }

  async getHeroRespawnConfig(
    guildData: { id: string },
    eventId: string,
    heroId: string,
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

    return this.eventsService.getHeroRespawnConfig(
      guildData.id,
      eventId,
      heroId,
    );
  }

  async closeRespawnWindow(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    data: CloseRespawnWindowDto,
  ) {
    await this.eventsService.closeRespawnWindow(guildData.id, eventId, heroId, {
      createNewWindow: data.createNewWindow,
      newMinSpawnTime: data.newMinSpawnTime
        ? new Date(data.newMinSpawnTime)
        : undefined,
      newMaxSpawnTime: data.newMaxSpawnTime
        ? new Date(data.newMaxSpawnTime)
        : undefined,
    });

    return { success: true };
  }

  async openRespawnWindow(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    data: OpenRespawnWindowDto,
  ) {
    const result = await this.eventsService.openRespawnWindow(
      guildData.id,
      eventId,
      heroId,
      {
        minSpawnTime: new Date(data.minSpawnTime),
        maxSpawnTime: new Date(data.maxSpawnTime),
      },
    );

    return {
      success: true,
      minSpawnTime: result.minSpawnTime,
      maxSpawnTime: result.maxSpawnTime,
    };
  }
}
