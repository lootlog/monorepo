import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import type { eventTable } from "#src/database/drizzle/schema";
import { RedisService } from "#src/redis/redis.service";
import { EventPointsService } from "#src/events/services/event-points.service";
import { EventReadCacheService } from "#src/events/services/event-read-cache.service";
import { EventTrackingService } from "#src/events/services/event-tracking.service";
import { TIMER_TYPES } from "#src/timers/constants/timer-limits";
import { getEventWrappedCachePattern } from "#src/shared/constants/cache.constant";
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  normalizeEventScoringMode,
  normalizeEventScoringRules,
  type EventScoringMode,
} from "@lootlog/domain/scoring";
import type { CreateEventDto } from "../dto/create-event.dto.js";
import type { CreateHeroDto } from "../dto/create-hero.dto.js";
import type { CreateLocationDto } from "../dto/create-location.dto.js";
import type { CreateMapDto } from "../dto/create-map.dto.js";
import type { ReorderLocationsDto } from "../dto/reorder-locations.dto.js";
import type { UpdateEventDto } from "../dto/update-event.dto.js";
import type { UpdateHeroDto } from "../dto/update-hero.dto.js";
import type { UpdateLocationDto } from "../dto/update-location.dto.js";
import { RESPAWN_WINDOW_QUEUE } from "../constants/respawn-queue.constant.js";
import type { AutoCloseRespawnWindowJobData } from "../interfaces/auto-close-respawn-window-job-data.js";
import { EventCatalogRepository } from "./event-catalog.repository.js";
import {
  attachComputedEventActive,
  compareEventsByActivityAndStart,
  isEventActiveAt,
} from "../utils/event-activity.util.js";

interface TimerNpcData {
  id: number;
  name: string;
  icon: string;
}

function resolveUpdatedEventDate(
  value: string | null | undefined,
  currentDate: Date | null,
): Date | null {
  if (value === undefined) {
    return currentDate;
  }

  if (!value) {
    return null;
  }

  return new Date(value);
}

function resolveUpdatedScoringRules(
  currentRules: (typeof eventTable.$inferSelect)["scoringRules"],
  currentMode: unknown,
  requestedMode: EventScoringMode | undefined,
  requestedRules: UpdateEventDto["scoringRules"],
) {
  const targetMode = normalizeEventScoringMode(
    requestedMode ?? normalizeEventScoringMode(currentMode),
  );
  const nextRules =
    requestedMode === undefined && requestedRules === undefined
      ? undefined
      : targetMode === "ADVANCED"
        ? normalizeEventScoringRules(
            requestedRules ??
              currentRules ??
              DEFAULT_ADVANCED_EVENT_SCORING_RULES,
          )
        : null;
  return { targetMode, nextRules };
}

@Injectable()
export class EventCatalogService {
  constructor(
    private readonly repository: EventCatalogRepository,
    private readonly redis: RedisService,
    private readonly eventReadCache: EventReadCacheService,
    private readonly pointsService: EventPointsService,
    private readonly trackingService: EventTrackingService,
    @InjectQueue(RESPAWN_WINDOW_QUEUE)
    private readonly respawnWindowQueue: Queue<AutoCloseRespawnWindowJobData>,
  ) {}

  async createEvent(guildId: string, data: CreateEventDto) {
    const {
      startsAt,
      endsAt,
      heroNpcs,
      world,
      scoringMode,
      scoringRules,
      rulebookMarkdown,
      ...eventData
    } = data;
    const normalizedWorld = world.trim().toLowerCase();
    const normalizedScoringMode = normalizeEventScoringMode(scoringMode);
    const normalizedScoringRules =
      normalizedScoringMode === "ADVANCED"
        ? normalizeEventScoringRules(
            scoringRules ?? DEFAULT_ADVANCED_EVENT_SCORING_RULES,
          )
        : null;
    const trimmedRulebookMarkdown = rulebookMarkdown?.trim();
    const normalizedRulebookMarkdown =
      trimmedRulebookMarkdown && trimmedRulebookMarkdown.length > 0
        ? trimmedRulebookMarkdown
        : null;

    if (!normalizedWorld) {
      throw new BadRequestException("World is required");
    }

    const startDate = startsAt ? new Date(startsAt) : new Date();
    const endDate = endsAt ? new Date(endsAt) : null;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException("End date must be after start date");
    }

    const now = new Date();

    const createdEvent = await this.repository.createEvent(
      {
        ...eventData,
        world: normalizedWorld,
        guildId,
        startsAt: startDate,
        endsAt: endDate,
        scoringMode: normalizedScoringMode,
        scoringRules: normalizedScoringRules,
        rulebookMarkdown: normalizedRulebookMarkdown,
      },
      heroNpcs ?? [],
    );

    await this.eventReadCache.invalidateGuild(guildId);

    return attachComputedEventActive(createdEvent, now);
  }

  getEvents(guildId: string, world?: string, activeOnly = true) {
    return this.eventReadCache.getOrSet(
      this.eventReadCache.getGuildKey(guildId, "list", {
        activeOnly,
        world: world?.trim().toLowerCase(),
      }),
      async () => {
        const normalizedWorld = world?.trim().toLowerCase();
        const referenceTime = new Date();

        const events = await this.repository.findEvents(
          guildId,
          normalizedWorld,
          activeOnly,
          referenceTime,
        );

        return events
          .map((event) => attachComputedEventActive(event, referenceTime))
          .sort(compareEventsByActivityAndStart);
      },
    );
  }

  getEvent(guildId: string, eventId: string) {
    return this.getEventOverview(guildId, eventId);
  }

  getEventOverview(guildId: string, eventId: string) {
    return this.eventReadCache.getOrSet(
      this.eventReadCache.getEventKey(guildId, eventId, "overview"),
      async () => {
        const event = await this.repository.findOverview(guildId, eventId);

        if (!event) {
          throw new NotFoundException("Event not found");
        }

        return attachComputedEventActive(event, new Date());
      },
    );
  }

  getEventMaps(guildId: string, eventId: string) {
    return this.eventReadCache.getOrSet(
      this.eventReadCache.getEventKey(guildId, eventId, "maps"),
      async () => {
        const event = await this.repository.findEventMaps(guildId, eventId);

        if (!event) {
          throw new NotFoundException("Event not found");
        }

        return event;
      },
    );
  }

  async updateEvent(guildId: string, eventId: string, data: UpdateEventDto) {
    const event = await this.repository.findScopedEvent(guildId, eventId);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const {
      heroNpcs,
      startsAt,
      endsAt,
      assignmentTimeoutMinutes,
      participationConfirmationMinutes,
      basePointsPerKill,
      scoringMode,
      scoringRules,
      rulebookMarkdown,
      ...updateData
    } = data;
    const { targetMode: targetScoringMode, nextRules: nextScoringRules } =
      resolveUpdatedScoringRules(
        event.scoringRules,
        event.scoringMode,
        scoringMode,
        scoringRules,
      );

    const newStartDate = resolveUpdatedEventDate(startsAt, event.startsAt);
    const newEndDate = resolveUpdatedEventDate(endsAt, event.endsAt);

    if (newEndDate && newStartDate && newEndDate <= newStartDate) {
      throw new BadRequestException("End date must be after start date");
    }

    const referenceTime = new Date();
    const currentEventIsActive = isEventActiveAt(event, referenceTime);
    const updatedEventIsActive = isEventActiveAt(
      {
        startsAt: newStartDate,
        endsAt: newEndDate,
        createdAt: event.createdAt,
      },
      referenceTime,
    );

    const updatedEvent = await this.repository.updateEvent(
      eventId,
      {
        ...updateData,
        ...(startsAt !== undefined && {
          startsAt: newStartDate,
        }),
        ...(endsAt !== undefined && {
          endsAt: newEndDate,
        }),
        ...(assignmentTimeoutMinutes !== undefined && {
          assignmentTimeoutMinutes,
        }),
        ...(participationConfirmationMinutes !== undefined && {
          participationConfirmationMinutes,
        }),
        ...(basePointsPerKill !== undefined && {
          basePointsPerKill,
        }),
        ...(scoringMode !== undefined && {
          scoringMode: targetScoringMode,
        }),
        ...(nextScoringRules !== undefined && {
          scoringRules: nextScoringRules,
        }),
        ...(rulebookMarkdown !== undefined && {
          rulebookMarkdown:
            typeof rulebookMarkdown === "string" &&
            rulebookMarkdown.trim().length > 0
              ? rulebookMarkdown.trim()
              : null,
        }),
      },
      heroNpcs,
      !currentEventIsActive || !updatedEventIsActive,
    );

    await Promise.all([
      this.redis.deleteByPattern(getEventWrappedCachePattern(guildId, eventId)),
      this.eventReadCache.invalidateEvent(guildId, eventId),
    ]);

    return attachComputedEventActive(updatedEvent, referenceTime);
  }

  async recalculateEventPointsForEvent(guildId: string, eventId: string) {
    const event = await this.repository.findScopedEvent(guildId, eventId);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    await this.pointsService.recalculateEventPoints(
      event.id,
      event.basePointsPerKill,
    );

    await Promise.all([
      this.redis.deleteByPattern(getEventWrappedCachePattern(guildId, eventId)),
      this.eventReadCache.invalidateEvent(guildId, eventId),
    ]);

    return { success: true };
  }

  async deleteEvent(guildId: string, eventId: string) {
    const event = await this.repository.findScopedEvent(guildId, eventId);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const jobs = await Promise.all([
      this.respawnWindowQueue.getJobs(["waiting"]),
      this.respawnWindowQueue.getJobs(["delayed"]),
    ]);

    const eventJobs = jobs.flat().filter((job) => job.data.eventId === eventId);

    await Promise.all(
      eventJobs.map((job) => job.remove().catch(() => undefined)),
    );

    await this.repository.deleteEvent(eventId);

    await Promise.all([
      this.redis.deleteByPattern(getEventWrappedCachePattern(guildId, eventId)),
      this.eventReadCache.invalidateEvent(guildId, eventId),
    ]);

    return { success: true };
  }

  async createHero(guildId: string, eventId: string, data: CreateHeroDto) {
    const referenceTime = new Date();
    const event = await this.repository.findActiveEvent(
      guildId,
      eventId,
      referenceTime,
    );

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    let npcId = data.npcId;
    let npcIcon: string | undefined;

    if (!npcId) {
      const npcData = await this.findTimerNpcDataByName(
        guildId,
        event.world,
        data.npcName,
      );
      if (npcData) {
        npcId = npcData.id;
        npcIcon = npcData.icon;
      }
    }

    const createdHero = await this.repository.createHero(
      eventId,
      {
        npcId,
        npcName: data.npcName,
        npcIcon,
      },
      data.maps ?? [],
    );

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return createdHero;
  }

  async updateHero(
    guildId: string,
    eventId: string,
    heroId: string,
    data: UpdateHeroDto,
  ) {
    const hero = await this.repository.findHero(guildId, eventId, heroId);

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    // @TODO - temporarily disabled hero locking for hotfix
    // if (hero.npcId !== null && hero.npcName !== data.npcName) {
    //   throw new BadRequestException("EVENT_HERO_NAME_LOCKED");
    // }

    const updatedHero = await this.repository.updateHero(heroId, {
      npcName: data.npcName,
      ...(data.npcId !== undefined && { npcId: data.npcId }),
    });

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return updatedHero;
  }

  async deleteHero(guildId: string, eventId: string, heroId: string) {
    const hero = await this.repository.findHero(guildId, eventId, heroId);

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    await this.repository.deleteHero(heroId);

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return { success: true };
  }

  async addMap(
    guildId: string,
    eventId: string,
    heroId: string,
    data: CreateMapDto,
  ) {
    const hero = await this.repository.findHero(guildId, eventId, heroId);

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const existingMap = await this.repository.findMapByNumericId(
      heroId,
      data.mapId,
    );

    if (existingMap) {
      throw new BadRequestException("Map already exists for this hero");
    }

    const map = await this.repository.createMap(
      heroId,
      data.mapId,
      data.mapName,
    );

    await this.trackingService.openUnassignedGap(map.id, heroId);
    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return map;
  }

  async deleteMap(
    guildId: string,
    eventId: string,
    heroId: string,
    mapId: string,
  ) {
    const map = await this.repository.findMap(guildId, eventId, heroId, mapId);

    if (!map) {
      throw new NotFoundException("Map not found");
    }

    await this.repository.deleteMap(mapId);

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return { success: true };
  }

  async createLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    data: CreateLocationDto,
  ) {
    const hero = await this.repository.findHero(guildId, eventId, heroId);

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const existingLocation = await this.repository.findLocationByName(
      heroId,
      data.name,
    );

    if (existingLocation) {
      throw new BadRequestException("Location with this name already exists");
    }

    const createdLocation = await this.repository.createLocation(
      heroId,
      data.name,
    );

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return createdLocation;
  }

  async updateLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    locationId: string,
    data: UpdateLocationDto,
  ) {
    const location = await this.repository.findLocation(
      guildId,
      eventId,
      heroId,
      locationId,
    );

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    if (data.name && data.name !== location.name) {
      const existingLocation = await this.repository.findLocationByName(
        heroId,
        data.name,
        locationId,
      );

      if (existingLocation) {
        throw new BadRequestException("Location with this name already exists");
      }
    }

    const updatedLocation = await this.repository.updateLocation(
      locationId,
      data.name ?? location.name,
    );

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return updatedLocation;
  }

  async deleteLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    locationId: string,
  ) {
    const location = await this.repository.findLocation(
      guildId,
      eventId,
      heroId,
      locationId,
    );

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    await this.repository.deleteLocation(locationId);

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return { success: true };
  }

  async reorderLocations(
    guildId: string,
    eventId: string,
    heroId: string,
    data: ReorderLocationsDto,
  ) {
    const hero = await this.repository.findHero(guildId, eventId, heroId);

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const locations = await this.repository.findLocationsByIds(
      heroId,
      data.locationIds,
    );

    if (locations.length !== data.locationIds.length) {
      throw new BadRequestException(
        "Some locations not found or do not belong to this hero",
      );
    }

    await this.repository.reorderLocations(data.locationIds);

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return { success: true };
  }

  async assignMapToLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    mapId: string,
    locationId: string | null,
  ) {
    const map = await this.repository.findMap(guildId, eventId, heroId, mapId);

    if (!map) {
      throw new NotFoundException("Map not found");
    }

    if (locationId) {
      const location = await this.repository.findLocation(
        guildId,
        eventId,
        heroId,
        locationId,
      );

      if (!location) {
        throw new NotFoundException("Location not found");
      }
    }

    const updatedMap = await this.repository.assignMapToLocation(
      mapId,
      locationId,
    );

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return updatedMap;
  }

  async getLocations(guildId: string, eventId: string, heroId: string) {
    const hero = await this.repository.findHero(guildId, eventId, heroId);

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    return this.repository.findLocationsWithMaps(heroId);
  }

  private async findTimerNpcDataByName(
    guildId: string,
    world: string,
    npcName: string,
  ): Promise<TimerNpcData | null> {
    const manualTimerType = String(TIMER_TYPES.CUSTOM_MANUAL);

    const npc = await this.repository.findTimerNpc(
      guildId,
      world,
      npcName,
      manualTimerType,
    );
    if (!npc) return null;
    return {
      id: npc.id,
      name: npc.name,
      icon: npc.icon,
    };
  }
}
