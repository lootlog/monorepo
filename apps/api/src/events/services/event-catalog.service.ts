import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Queue } from "bullmq";
import type { Event } from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import { RedisService } from "@lootlog/nest-shared";
import { EventPointsService } from "src/events/services/event-points.service";
import { EventTrackingService } from "src/events/services/event-tracking.service";
import { TIMER_TYPES } from "src/timers/constants/timer-limits";
import { getEventWrappedCacheKey } from "src/shared/constants/cache.constant";
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  type EventScoringMode,
} from "../constants/scoring-rules.constant";
import type { CreateEventDto } from "../dto/create-event.dto";
import type { CreateHeroDto } from "../dto/create-hero.dto";
import type { CreateLocationDto } from "../dto/create-location.dto";
import type { CreateMapDto } from "../dto/create-map.dto";
import type { ReorderLocationsDto } from "../dto/reorder-locations.dto";
import type { UpdateEventDto } from "../dto/update-event.dto";
import type { UpdateHeroDto } from "../dto/update-hero.dto";
import type { UpdateLocationDto } from "../dto/update-location.dto";
import { RESPAWN_WINDOW_QUEUE } from "../constants/respawn-queue.constant";
import type { AutoCloseRespawnWindowJobData } from "../interfaces/auto-close-respawn-window-job-data";
import {
  attachComputedEventActive,
  buildActiveEventWhere,
  compareEventsByActivityAndStart,
} from "../utils/event-activity.util";
import {
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from "../utils/scoring-rules.util";

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

@Injectable()
export class EventCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
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

    const createdEvent = await this.prisma.event.create({
      data: {
        ...eventData,
        world: normalizedWorld,
        guildId,
        startsAt: startDate,
        endsAt: endDate,
        scoringMode: normalizedScoringMode,
        scoringRules: normalizedScoringRules,
        rulebookMarkdown: normalizedRulebookMarkdown,
        ...(heroNpcs && {
          heroNpcs: {
            create: heroNpcs.map((npc) => ({
              npcId: npc.npcId,
              npcName: npc.npcName,
              maps: npc.maps
                ? {
                    create: npc.maps.map((map) => ({
                      mapId: map.mapId,
                      mapName: map.mapName,
                    })),
                  }
                : undefined,
            })),
          },
        }),
      },
      include: {
        heroNpcs: {
          include: {
            maps: {
              orderBy: { mapId: "asc" },
              include: {
                assignedMembers: {
                  select: memberSelectWithTopRole,
                },
              },
            },
          },
        },
      },
    });

    return attachComputedEventActive(createdEvent, now);
  }

  async getEvents(guildId: string, world?: string, activeOnly = true) {
    const normalizedWorld = world?.trim().toLowerCase();
    const referenceTime = new Date();

    const events = await this.prisma.event.findMany({
      where: {
        guildId,
        ...(normalizedWorld && { world: normalizedWorld }),
        ...(activeOnly ? buildActiveEventWhere(referenceTime) : {}),
      },
      select: {
        id: true,
        guildId: true,
        name: true,
        world: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        updatedAt: true,
        heroNpcs: {
          select: {
            id: true,
            npcId: true,
            npcName: true,
            npcIcon: true,
            npcLvl: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return events
      .map((event) => attachComputedEventActive(event, referenceTime))
      .sort(compareEventsByActivityAndStart);
  }

  getEvent(guildId: string, eventId: string) {
    return this.getEventOverview(guildId, eventId);
  }

  async getEventOverview(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        guildId,
      },
      select: {
        id: true,
        guildId: true,
        name: true,
        world: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        updatedAt: true,
        basePointsPerKill: true,
        assignmentTimeoutMinutes: true,
        participationConfirmationMinutes: true,
        mapAssignmentCap: true,
        scoringMode: true,
        scoringRules: true,
        rulebookMarkdown: true,
        heroNpcs: {
          select: {
            id: true,
            npcId: true,
            npcName: true,
            npcIcon: true,
            npcLvl: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return attachComputedEventActive(event, new Date());
  }

  async getEventMaps(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        guildId,
      },
      select: {
        id: true,
        heroNpcs: {
          select: {
            id: true,
            npcId: true,
            npcName: true,
            npcIcon: true,
            npcLvl: true,
            locations: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                name: true,
                order: true,
                maps: {
                  orderBy: { mapId: "asc" },
                  select: {
                    id: true,
                    mapId: true,
                    mapName: true,
                    locationId: true,
                    assignedMembers: {
                      select: memberSelectWithTopRole,
                    },
                  },
                },
              },
            },
            maps: {
              where: { locationId: null },
              orderBy: { mapId: "asc" },
              select: {
                id: true,
                mapId: true,
                mapName: true,
                locationId: true,
                assignedMembers: {
                  select: memberSelectWithTopRole,
                },
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return event;
  }

  async updateEvent(guildId: string, eventId: string, data: UpdateEventDto) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
    });

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

    let newStartDate: Date | null = event.startsAt;
    if (startsAt !== undefined) {
      newStartDate = startsAt ? new Date(startsAt) : null;
    }

    let newEndDate: Date | null = event.endsAt;
    if (endsAt !== undefined) {
      newEndDate = endsAt ? new Date(endsAt) : null;
    }

    if (newEndDate && newStartDate && newEndDate <= newStartDate) {
      throw new BadRequestException("End date must be after start date");
    }

    const referenceTime = new Date();

    const updatedEvent = await this.prisma.$transaction(
      async (transactionClient) => {
        if (heroNpcs) {
          await transactionClient.eventHeroNpc.deleteMany({
            where: { eventId },
          });
        }

        return transactionClient.event.update({
          where: { id: eventId },
          data: {
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
            ...(heroNpcs && {
              heroNpcs: {
                create: heroNpcs.map((npc) => ({
                  npcId: npc.npcId,
                  npcName: npc.npcName,
                  maps: {
                    create: npc.maps.map((map) => ({
                      mapId: map.mapId,
                      mapName: map.mapName,
                    })),
                  },
                })),
              },
            }),
          },
          include: {
            heroNpcs: {
              include: {
                maps: {
                  orderBy: { mapId: "asc" },
                  include: {
                    assignedMembers: {
                      select: memberSelectWithTopRole,
                    },
                  },
                },
              },
            },
          },
        });
      },
    );

    await this.redis.del(getEventWrappedCacheKey(guildId, eventId));

    return attachComputedEventActive(updatedEvent, referenceTime);
  }

  async recalculateEventPointsForEvent(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      select: { id: true, basePointsPerKill: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    await this.pointsService.recalculateEventPoints(
      event.id,
      event.basePointsPerKill,
    );

    await this.redis.del(getEventWrappedCacheKey(guildId, eventId));

    return { success: true };
  }

  async deleteEvent(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      select: { id: true },
    });

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

    await this.prisma.event.delete({
      where: { id: eventId },
    });

    await this.redis.del(getEventWrappedCacheKey(guildId, eventId));

    return { success: true };
  }

  async createHero(guildId: string, eventId: string, data: CreateHeroDto) {
    const referenceTime = new Date();
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        guildId,
        ...buildActiveEventWhere(referenceTime),
      },
    });

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

    return this.prisma.eventHeroNpc.create({
      data: {
        eventId,
        npcId,
        npcName: data.npcName,
        npcIcon,
        maps: {
          create: (data.maps ?? []).map((map) => ({
            mapId: map.mapId,
            mapName: map.mapName,
          })),
        },
      },
      include: {
        maps: {
          orderBy: { mapId: "asc" },
          include: {
            assignedMembers: {
              select: memberSelectWithTopRole,
            },
          },
        },
      },
    });
  }

  async updateHero(
    guildId: string,
    eventId: string,
    heroId: string,
    data: UpdateHeroDto,
  ) {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroId,
        eventId,
        event: { guildId },
      },
    });

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    // @TODO - temporarily disabled hero locking for hotfix
    // if (hero.npcId !== null && hero.npcName !== data.npcName) {
    //   throw new BadRequestException("EVENT_HERO_NAME_LOCKED");
    // }

    return this.prisma.eventHeroNpc.update({
      where: { id: heroId },
      data: {
        npcName: data.npcName,
        ...(data.npcId !== undefined && { npcId: data.npcId }),
      },
    });
  }

  async deleteHero(guildId: string, eventId: string, heroId: string) {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroId,
        eventId,
        event: { guildId },
      },
    });

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    await this.prisma.eventHeroNpc.delete({
      where: { id: heroId },
    });

    return { success: true };
  }

  async addMap(
    guildId: string,
    eventId: string,
    heroId: string,
    data: CreateMapDto,
  ) {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroId,
        eventId,
        event: { guildId },
      },
    });

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const existingMap = await this.prisma.eventMap.findFirst({
      where: {
        heroNpcId: heroId,
        mapId: data.mapId,
      },
    });

    if (existingMap) {
      throw new BadRequestException("Map already exists for this hero");
    }

    const map = await this.prisma.eventMap.create({
      data: {
        heroNpcId: heroId,
        mapId: data.mapId,
        mapName: data.mapName,
      },
      include: {
        assignedMembers: {
          select: memberSelectWithTopRole,
        },
      },
    });

    await this.trackingService.openUnassignedGap(map.id, heroId);

    return map;
  }

  async deleteMap(
    guildId: string,
    eventId: string,
    heroId: string,
    mapId: string,
  ) {
    const map = await this.prisma.eventMap.findFirst({
      where: {
        id: mapId,
        heroNpcId: heroId,
        heroNpc: {
          eventId,
          event: { guildId },
        },
      },
    });

    if (!map) {
      throw new NotFoundException("Map not found");
    }

    await this.prisma.eventMap.delete({
      where: { id: mapId },
    });

    return { success: true };
  }

  async createLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    data: CreateLocationDto,
  ) {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroId,
        eventId,
        event: { guildId },
      },
    });

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const existingLocation = await this.prisma.eventMapLocation.findFirst({
      where: {
        heroNpcId: heroId,
        name: data.name,
      },
    });

    if (existingLocation) {
      throw new BadRequestException("Location with this name already exists");
    }

    const maxOrderResult = await this.prisma.eventMapLocation.aggregate({
      where: { heroNpcId: heroId },
      _max: { order: true },
    });
    const newOrder = (maxOrderResult._max.order ?? -1) + 1;

    return this.prisma.eventMapLocation.create({
      data: {
        heroNpcId: heroId,
        name: data.name,
        order: newOrder,
      },
      include: {
        maps: {
          orderBy: { mapId: "asc" },
          include: {
            assignedMembers: {
              select: memberSelectWithTopRole,
            },
          },
        },
      },
    });
  }

  async updateLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    locationId: string,
    data: UpdateLocationDto,
  ) {
    const location = await this.prisma.eventMapLocation.findFirst({
      where: {
        id: locationId,
        heroNpcId: heroId,
        heroNpc: {
          eventId,
          event: { guildId },
        },
      },
    });

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    if (data.name && data.name !== location.name) {
      const existingLocation = await this.prisma.eventMapLocation.findFirst({
        where: {
          heroNpcId: heroId,
          name: data.name,
          id: { not: locationId },
        },
      });

      if (existingLocation) {
        throw new BadRequestException("Location with this name already exists");
      }
    }

    return this.prisma.eventMapLocation.update({
      where: { id: locationId },
      data: {
        ...(data.name && { name: data.name }),
      },
      include: {
        maps: {
          orderBy: { mapId: "asc" },
          include: {
            assignedMembers: {
              select: memberSelectWithTopRole,
            },
          },
        },
      },
    });
  }

  async deleteLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    locationId: string,
  ) {
    const location = await this.prisma.eventMapLocation.findFirst({
      where: {
        id: locationId,
        heroNpcId: heroId,
        heroNpc: {
          eventId,
          event: { guildId },
        },
      },
    });

    if (!location) {
      throw new NotFoundException("Location not found");
    }

    await this.prisma.eventMapLocation.delete({
      where: { id: locationId },
    });

    return { success: true };
  }

  async reorderLocations(
    guildId: string,
    eventId: string,
    heroId: string,
    data: ReorderLocationsDto,
  ) {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroId,
        eventId,
        event: { guildId },
      },
    });

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    const locations = await this.prisma.eventMapLocation.findMany({
      where: {
        heroNpcId: heroId,
        id: { in: data.locationIds },
      },
    });

    if (locations.length !== data.locationIds.length) {
      throw new BadRequestException(
        "Some locations not found or do not belong to this hero",
      );
    }

    await this.prisma.$transaction(
      data.locationIds.map((locationId, index) =>
        this.prisma.eventMapLocation.update({
          where: { id: locationId },
          data: { order: index },
        }),
      ),
    );

    return { success: true };
  }

  async assignMapToLocation(
    guildId: string,
    eventId: string,
    heroId: string,
    mapId: string,
    locationId: string | null,
  ) {
    const map = await this.prisma.eventMap.findFirst({
      where: {
        id: mapId,
        heroNpcId: heroId,
        heroNpc: {
          eventId,
          event: { guildId },
        },
      },
    });

    if (!map) {
      throw new NotFoundException("Map not found");
    }

    if (locationId) {
      const location = await this.prisma.eventMapLocation.findFirst({
        where: {
          id: locationId,
          heroNpcId: heroId,
        },
      });

      if (!location) {
        throw new NotFoundException("Location not found");
      }
    }

    return this.prisma.eventMap.update({
      where: { id: mapId },
      data: { locationId },
      include: {
        assignedMembers: {
          select: memberSelectWithTopRole,
        },
        location: true,
      },
    });
  }

  async getLocations(guildId: string, eventId: string, heroId: string) {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroId,
        eventId,
        event: { guildId },
      },
    });

    if (!hero) {
      throw new NotFoundException("Hero not found");
    }

    return this.prisma.eventMapLocation.findMany({
      where: { heroNpcId: heroId },
      orderBy: { order: "asc" },
      include: {
        maps: {
          orderBy: { mapId: "asc" },
          include: {
            assignedMembers: {
              select: memberSelectWithTopRole,
            },
          },
        },
      },
    });
  }

  private async findTimerNpcDataByName(
    guildId: string,
    world: string,
    npcName: string,
  ): Promise<TimerNpcData | null> {
    const manualTimerType = String(TIMER_TYPES.CUSTOM_MANUAL);

    const results = await this.prisma.$queryRaw<{ npc: TimerNpcData }[]>`
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
}
