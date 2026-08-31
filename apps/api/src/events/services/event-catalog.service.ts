import { and, not, or } from "@prisma/orm-family-sql/orm-client";
import { createId } from "@paralleldrive/cuid2";
import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import type { Event } from "#src/db/domain";
import { PrismaService } from "#src/db/prisma.service";
import {
  attachAssignedMembersToHeroes,
  attachAssignedMembersToMaps,
} from "#src/db/many-to-many";
import { RedisService } from "@lootlog/nest-shared/redis";
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
} from "@lootlog/scoring";
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
import {
  attachComputedEventActive,
  applyActiveEventFilter,
  compareEventsByActivityAndStart,
  isEventActiveAt,
} from "../utils/event-activity.util.js";

interface TimerNpcData {
  id: number;
  name: string;
  icon: string;
}

const memberSelectWithTopRole = {
  id: true,
  name: true,
  avatar: true,
  userId: true,
  roles: {
    select: {
      position: true,
      color: true,
    },
    orderBy: {
      position: "desc" as const,
    },
    take: 1,
  },
};

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

@Injectable()
export class EventCatalogService {
  constructor(
    private readonly prisma: PrismaService,
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

    const createdEvent = await this.prisma.transaction(async (transaction) => {
      const event = await transaction.orm.public.Event.create({
        ...eventData,
        id: createId(),
        world: normalizedWorld,
        guildId,
        startsAt: startDate,
        endsAt: endDate,
        scoringMode: normalizedScoringMode,
        scoringRules: normalizedScoringRules,
        rulebookMarkdown: normalizedRulebookMarkdown,
        updatedAt: now,
      });
      await this.createEventHeroes(transaction, event.id, heroNpcs ?? []);
      return event;
    });

    await this.eventReadCache.invalidateGuild(guildId);

    return attachComputedEventActive(createdEvent, now);
  }

  getEvents(
    guildId: string,
    world?: string,
    activeOnly = true,
  ): Promise<any[]> {
    return this.eventReadCache.getOrSet(
      this.eventReadCache.getGuildKey(guildId, "list", {
        activeOnly,
        world: world?.trim().toLowerCase(),
      }),
      async () => {
        const normalizedWorld = world?.trim().toLowerCase();
        const referenceTime = new Date();

        let eventsQuery = this.prisma.orm.public.Event.where((row) =>
          row.guildId.eq(guildId),
        );
        if (normalizedWorld) {
          eventsQuery = eventsQuery.where((row) =>
            row.world.eq(normalizedWorld),
          );
        }
        if (activeOnly) {
          eventsQuery = applyActiveEventFilter(eventsQuery, referenceTime);
        }
        const events = await eventsQuery
          .select(
            "id",
            "guildId",
            "name",
            "world",
            "startsAt",
            "endsAt",
            "createdAt",
            "updatedAt",
          )
          .include("heroNpcs", (row) =>
            row.select("id", "npcId", "npcName", "npcIcon", "npcLvl"),
          )
          .orderBy([(row) => row.createdAt.desc()])
          .all();

        return events
          .map((event) => attachComputedEventActive(event, referenceTime))
          .sort(compareEventsByActivityAndStart);
      },
    );
  }

  getEvent(guildId: string, eventId: string): Promise<any> {
    return this.getEventOverview(guildId, eventId);
  }

  getEventOverview(guildId: string, eventId: string) {
    return this.eventReadCache.getOrSet(
      this.eventReadCache.getEventKey(guildId, eventId, "overview"),
      async () => {
        const event = await this.prisma.orm.public.Event.where((row) =>
          and(row.id.eq(eventId), row.guildId.eq(guildId)),
        )
          .select(
            "id",
            "guildId",
            "name",
            "world",
            "startsAt",
            "endsAt",
            "createdAt",
            "updatedAt",
            "basePointsPerKill",
            "assignmentTimeoutMinutes",
            "participationConfirmationMinutes",
            "mapAssignmentCap",
            "scoringMode",
            "scoringRules",
            "rulebookMarkdown",
          )
          .include("heroNpcs", (row) =>
            row.select("id", "npcId", "npcName", "npcIcon", "npcLvl"),
          )
          .first();

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
        const event = await this.prisma.orm.public.Event.where((row) =>
          and(row.id.eq(eventId), row.guildId.eq(guildId)),
        )
          .select("id")
          .include("heroNpcs", (row) =>
            row
              .select("id", "npcId", "npcName", "npcIcon", "npcLvl")
              .include("locations", (rowRow) =>
                rowRow
                  .select("id", "name", "order")
                  .include("maps", (rowRowRow) =>
                    rowRowRow
                      .select("id", "mapId", "mapName", "locationId")
                      .orderBy((rowRowRowRow) => rowRowRowRow.mapId.asc()),
                  )
                  .orderBy((rowRowRow) => rowRowRow.order.asc()),
              )
              .include("maps", (rowRow) =>
                rowRow
                  .select("id", "mapId", "mapName", "locationId")
                  .where((row) => row.locationId.isNull())
                  .orderBy((rowRowRow) => rowRowRow.mapId.asc()),
              ),
          )
          .first();

        if (!event) {
          throw new NotFoundException("Event not found");
        }

        const heroNpcs = await attachAssignedMembersToHeroes(
          this.prisma,
          event.heroNpcs,
        );
        return { ...event, heroNpcs };
      },
    );
  }

  async updateEvent(guildId: string, eventId: string, data: UpdateEventDto) {
    const event = await this.prisma.orm.public.Event.where((row) =>
      and(row.id.eq(eventId), row.guildId.eq(guildId)),
    ).first();

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
    const existingScoringMode = normalizeEventScoringMode(
      (event as { scoringMode?: unknown }).scoringMode,
    );
    const targetScoringMode: EventScoringMode = normalizeEventScoringMode(
      scoringMode ?? existingScoringMode,
    );
    let nextScoringRules: Event["scoringRules"] | undefined;
    if (scoringMode !== undefined || scoringRules !== undefined) {
      nextScoringRules =
        targetScoringMode === "ADVANCED"
          ? normalizeEventScoringRules(
              scoringRules ??
                event.scoringRules ??
                DEFAULT_ADVANCED_EVENT_SCORING_RULES,
            )
          : null;
    }

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

    const updatedEvent = await this.prisma.transaction(
      async (transactionClient) => {
        if (!currentEventIsActive || !updatedEventIsActive) {
          await transactionClient.orm.public.UserPinnedEvent.where((row) =>
            row.eventId.eq(eventId),
          ).deleteAndCount();
        }

        if (heroNpcs) {
          await transactionClient.orm.public.EventHeroNpc.where((row) =>
            row.eventId.eq(eventId),
          ).deleteAndCount();
        }

        const savedEvent = await transactionClient.orm.public.Event.where(
          (row) => row.id.eq(eventId),
        ).update({
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
          updatedAt: new Date(),
        });
        if (heroNpcs) {
          await this.createEventHeroes(transactionClient, eventId, heroNpcs);
        }
        return savedEvent;
      },
    );

    await Promise.all([
      this.redis.deleteByPattern(getEventWrappedCachePattern(guildId, eventId)),
      this.eventReadCache.invalidateEvent(guildId, eventId),
    ]);

    return attachComputedEventActive(updatedEvent, referenceTime);
  }

  async recalculateEventPointsForEvent(guildId: string, eventId: string) {
    const event = await this.prisma.orm.public.Event.where((row) =>
      and(row.id.eq(eventId), row.guildId.eq(guildId)),
    )
      .select("id", "basePointsPerKill")
      .first();

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
    const event = await this.prisma.orm.public.Event.where((row) =>
      and(row.id.eq(eventId), row.guildId.eq(guildId)),
    )
      .select("id")
      .first();

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

    await this.prisma.orm.public.Event.where((row) =>
      row.id.eq(eventId),
    ).delete();

    await Promise.all([
      this.redis.deleteByPattern(getEventWrappedCachePattern(guildId, eventId)),
      this.eventReadCache.invalidateEvent(guildId, eventId),
    ]);

    return { success: true };
  }

  async createHero(guildId: string, eventId: string, data: CreateHeroDto) {
    const referenceTime = new Date();
    const event = await applyActiveEventFilter(
      this.prisma.orm.public.Event.where((row) =>
        and(row.id.eq(eventId), row.guildId.eq(guildId)),
      ),
      referenceTime,
    ).first();

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

    const createdHero = await this.prisma.transaction(async (transaction) => {
      const hero = await transaction.orm.public.EventHeroNpc.create({
        id: createId(),
        eventId,
        npcId,
        npcName: data.npcName,
        npcIcon,
      });
      if (data.maps?.length) {
        await transaction.orm.public.EventMap.createAndCount(
          data.maps.map((map) => ({
            id: createId(),
            heroNpcId: hero.id,
            mapId: map.mapId,
            mapName: map.mapName,
            updatedAt: new Date(),
          })),
        );
      }
      return hero;
    });

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return createdHero;
  }

  async updateHero(
    guildId: string,
    eventId: string,
    heroId: string,
    data: UpdateHeroDto,
  ) {
    const hero = await this.prisma.orm.public.EventHeroNpc.where((row) =>
      and(
        row.id.eq(heroId),
        row.eventId.eq(eventId),
        row.event.some((related) => related.guildId.eq(guildId)),
      ),
    ).first();

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    // @TODO - temporarily disabled hero locking for hotfix
    // if (hero.npcId !== null && hero.npcName !== data.npcName) {
    //   throw new BadRequestException("EVENT_HERO_NAME_LOCKED");
    // }

    const updatedHero = await this.prisma.orm.public.EventHeroNpc.where((row) =>
      row.id.eq(heroId),
    ).update({
      npcName: data.npcName,
      ...(data.npcId !== undefined && { npcId: data.npcId }),
    });

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return updatedHero;
  }

  async deleteHero(guildId: string, eventId: string, heroId: string) {
    const hero = await this.prisma.orm.public.EventHeroNpc.where((row) =>
      and(
        row.id.eq(heroId),
        row.eventId.eq(eventId),
        row.event.some((related) => related.guildId.eq(guildId)),
      ),
    ).first();

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    await this.prisma.orm.public.EventHeroNpc.where((row) =>
      row.id.eq(heroId),
    ).delete();

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return { success: true };
  }

  async addMap(
    guildId: string,
    eventId: string,
    heroId: string,
    data: CreateMapDto,
  ) {
    const hero = await this.prisma.orm.public.EventHeroNpc.where((row) =>
      and(
        row.id.eq(heroId),
        row.eventId.eq(eventId),
        row.event.some((related) => related.guildId.eq(guildId)),
      ),
    ).first();

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const existingMap = await this.prisma.orm.public.EventMap.where((row) =>
      and(row.heroNpcId.eq(heroId), row.mapId.eq(data.mapId)),
    ).first();

    if (existingMap) {
      throw new BadRequestException("Map already exists for this hero");
    }

    const map = await this.prisma.orm.public.EventMap.create({
      id: createId(),
      heroNpcId: heroId,
      mapId: data.mapId,
      mapName: data.mapName,
      updatedAt: new Date(),
    });

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
    const map = await this.prisma.orm.public.EventMap.where((row) =>
      and(
        row.id.eq(mapId),
        row.heroNpcId.eq(heroId),
        row.heroNpc.some((related) =>
          and(
            related.eventId.eq(eventId),
            related.event.some((related) => related.guildId.eq(guildId)),
          ),
        ),
      ),
    ).first();

    if (!map) {
      throw new NotFoundException("Map not found");
    }

    await this.prisma.orm.public.EventMap.where((row) =>
      row.id.eq(mapId),
    ).delete();

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return { success: true };
  }

  async createLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    data: CreateLocationDto,
  ) {
    const hero = await this.prisma.orm.public.EventHeroNpc.where((row) =>
      and(
        row.id.eq(heroId),
        row.eventId.eq(eventId),
        row.event.some((related) => related.guildId.eq(guildId)),
      ),
    ).first();

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const existingLocation =
      await this.prisma.orm.public.EventMapLocation.where((row) =>
        and(row.heroNpcId.eq(heroId), row.name.eq(data.name)),
      ).first();

    if (existingLocation) {
      throw new BadRequestException("Location with this name already exists");
    }

    const maxOrderResult = await this.prisma.orm.public.EventMapLocation.where(
      (row) => row.heroNpcId.eq(heroId),
    ).aggregate((aggregate) => ({ maxOrder: aggregate.max("order") }));
    const newOrder = (maxOrderResult.maxOrder ?? -1) + 1;

    const createdLocation =
      await this.prisma.orm.public.EventMapLocation.create({
        id: createId(),
        heroNpcId: heroId,
        name: data.name,
        order: newOrder,
        updatedAt: new Date(),
      });

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
    const location = await this.prisma.orm.public.EventMapLocation.where(
      (row) =>
        and(
          row.id.eq(locationId),
          row.heroNpcId.eq(heroId),
          row.heroNpc.some((related) =>
            and(
              related.eventId.eq(eventId),
              related.event.some((related) => related.guildId.eq(guildId)),
            ),
          ),
        ),
    ).first();

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    if (data.name && data.name !== location.name) {
      const existingLocation =
        await this.prisma.orm.public.EventMapLocation.where((row) =>
          and(
            row.heroNpcId.eq(heroId),
            row.name.eq(data.name),
            row.id.neq(locationId),
          ),
        ).first();

      if (existingLocation) {
        throw new BadRequestException("Location with this name already exists");
      }
    }

    const updatedLocation = await this.prisma.orm.public.EventMapLocation.where(
      (row) => row.id.eq(locationId),
    ).update({
      ...(data.name && { name: data.name }),
      updatedAt: new Date(),
    });

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return updatedLocation;
  }

  async deleteLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    locationId: string,
  ) {
    const location = await this.prisma.orm.public.EventMapLocation.where(
      (row) =>
        and(
          row.id.eq(locationId),
          row.heroNpcId.eq(heroId),
          row.heroNpc.some((related) =>
            and(
              related.eventId.eq(eventId),
              related.event.some((related) => related.guildId.eq(guildId)),
            ),
          ),
        ),
    ).first();

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    await this.prisma.orm.public.EventMapLocation.where((row) =>
      row.id.eq(locationId),
    ).delete();

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return { success: true };
  }

  async reorderLocations(
    guildId: string,
    eventId: string,
    heroId: string,
    data: ReorderLocationsDto,
  ) {
    const hero = await this.prisma.orm.public.EventHeroNpc.where((row) =>
      and(
        row.id.eq(heroId),
        row.eventId.eq(eventId),
        row.event.some((related) => related.guildId.eq(guildId)),
      ),
    ).first();

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const locations = await this.prisma.orm.public.EventMapLocation.where(
      (row) => and(row.heroNpcId.eq(heroId), row.id.in(data.locationIds)),
    ).all();

    if (locations.length !== data.locationIds.length) {
      throw new BadRequestException(
        "Some locations not found or do not belong to this hero",
      );
    }

    await this.prisma.transaction(async (transaction) => {
      for (const [index, locationId] of data.locationIds.entries()) {
        await transaction.orm.public.EventMapLocation.where((row) =>
          row.id.eq(locationId),
        ).update({ order: index, updatedAt: new Date() });
      }
    });

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
    const map = await this.prisma.orm.public.EventMap.where((row) =>
      and(
        row.id.eq(mapId),
        row.heroNpcId.eq(heroId),
        row.heroNpc.some((related) =>
          and(
            related.eventId.eq(eventId),
            related.event.some((related) => related.guildId.eq(guildId)),
          ),
        ),
      ),
    ).first();

    if (!map) {
      throw new NotFoundException("Map not found");
    }

    if (locationId) {
      const location = await this.prisma.orm.public.EventMapLocation.where(
        (row) => and(row.id.eq(locationId), row.heroNpcId.eq(heroId)),
      ).first();

      if (!location) {
        throw new NotFoundException("Location not found");
      }
    }

    const updatedMap = await this.prisma.orm.public.EventMap.where((row) =>
      row.id.eq(mapId),
    ).update({ locationId, updatedAt: new Date() });

    await this.eventReadCache.invalidateEvent(guildId, eventId);

    return updatedMap;
  }

  async getLocations(guildId: string, eventId: string, heroId: string) {
    const hero = await this.prisma.orm.public.EventHeroNpc.where((row) =>
      and(
        row.id.eq(heroId),
        row.eventId.eq(eventId),
        row.event.some((related) => related.guildId.eq(guildId)),
      ),
    ).first();

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const locations = await this.prisma.orm.public.EventMapLocation.where(
      (row) => row.heroNpcId.eq(heroId),
    )
      .include("maps", (relation) =>
        relation.orderBy((relationRow) => relationRow.mapId.asc()),
      )
      .orderBy((row) => row.order.asc())
      .all();
    const maps = await attachAssignedMembersToMaps(
      this.prisma,
      locations.flatMap((location) => location.maps),
    );
    const mapsById = new Map(maps.map((map) => [map.id, map]));
    return locations.map((location) => ({
      ...location,
      maps: location.maps.map((map) => mapsById.get(map.id) ?? map),
    }));
  }

  private async findTimerNpcDataByName(
    guildId: string,
    world: string,
    npcName: string,
  ): Promise<TimerNpcData | null> {
    const manualTimerType = String(TIMER_TYPES.CUSTOM_MANUAL);

    const results = await this.prisma.sql<{ npc: TimerNpcData }[]>`
      SELECT t."npc"
      FROM "Timer" t
      WHERE t."guildId" = ${guildId}
        AND t."world" = ${world}
        AND t."npc"->>'name' ILIKE ${npcName}
        AND COALESCE(t."npc"->>'margonemType', '0') != ${manualTimerType}
      ORDER BY t."updatedAt" DESC
      LIMIT 1
    `;

    if (results.length === 0) {
      return null;
    }

    const npc = results[0].npc;
    return {
      id: npc.id,
      name: npc.name,
      icon: npc.icon,
    };
  }

  private async createEventHeroes(
    transaction: Pick<PrismaService, "orm">,
    eventId: string,
    heroNpcs: CreateEventDto["heroNpcs"],
  ): Promise<void> {
    for (const npc of heroNpcs ?? []) {
      const heroId = createId();
      await transaction.orm.public.EventHeroNpc.create({
        id: heroId,
        eventId,
        npcId: npc.npcId,
        npcName: npc.npcName,
      });
      if ((npc.maps ?? []).length > 0) {
        await transaction.orm.public.EventMap.createAndCount(
          (npc.maps ?? []).map((map) => ({
            id: createId(),
            heroNpcId: heroId,
            mapId: map.mapId,
            mapName: map.mapName,
            updatedAt: new Date(),
          })),
        );
      }
    }
  }
}
