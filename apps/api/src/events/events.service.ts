import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from 'src/db/prisma.service';
import { RESPAWN_WINDOW_QUEUE } from './constants/respawn-queue.constant';
import { EVENT_HERO_KILL_QUEUE } from './constants/event-hero-kill-queue.constant';
import type { AutoCloseRespawnWindowJobData } from './respawn-window.processor';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateHeroDto } from './dto/create-hero.dto';
import { CreateMapDto } from './dto/create-map.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ReorderLocationsDto } from './dto/reorder-locations.dto';
import { UpdateHeroDto } from './dto/update-hero.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import {
  Event,
  EventHeroNpc,
  EventKillPoint,
  Permission,
  type Role,
} from 'generated/client';
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  type EventScoringMode,
} from './constants/scoring-rules.constant';
import { filterHeroesByLevel } from 'src/shared/utils/can-view-event-hero';
import { TIMER_TYPES } from 'src/timers/constants/timer-limits';
import type {
  CheckEventHeroKillParams,
  EventHeroKillJobData,
  KillTimerData,
} from './interfaces';
import type {
  CloseRespawnWindowOptions,
  OpenRespawnWindowOptions,
  MapStatus,
} from './interfaces/respawn-window.interface';
import {
  EVENT_HERO_KILL_JOB_NAME,
  buildEventHeroKillJobId,
  createEventHeroKillJobData,
  getEventHeroKillWindowKey,
} from './utils/event-hero-kill-job';
import {
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from './utils/scoring-rules.util';

import { EventPointsService } from './services/event-points.service';
import { EventTrackingService } from './services/event-tracking.service';
import { EventKillService } from './services/event-kill.service';
import { EventRespawnService } from './services/event-respawn.service';

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
      position: 'desc' as const,
    },
    take: 1,
  },
};

export type { MapStatus, CloseRespawnWindowOptions, OpenRespawnWindowOptions };
export type { CheckEventHeroKillParams, KillTimerData };

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pointsService: EventPointsService,
    private readonly trackingService: EventTrackingService,
    private readonly killService: EventKillService,
    private readonly respawnService: EventRespawnService,
    @InjectQueue(RESPAWN_WINDOW_QUEUE)
    private readonly respawnWindowQueue: Queue<AutoCloseRespawnWindowJobData>,
    @InjectQueue(EVENT_HERO_KILL_QUEUE)
    private readonly eventHeroKillQueue: Queue<EventHeroKillJobData>,
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
      normalizedScoringMode === 'ADVANCED'
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
      throw new BadRequestException('World is required');
    }

    const startDate = startsAt ? new Date(startsAt) : new Date();
    const endDate = endsAt ? new Date(endsAt) : null;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const now = new Date();
    const active = startDate <= now && (!endDate || endDate > now);

    const event = await this.prisma.event.create({
      data: {
        ...eventData,
        world: normalizedWorld,
        active,
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
              orderBy: { mapId: 'asc' },
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

    return event;
  }

  async getEvents(guildId: string, world?: string, activeOnly = true) {
    const normalizedWorld = world?.trim().toLowerCase();

    return this.prisma.event.findMany({
      where: {
        guildId,
        ...(normalizedWorld && { world: normalizedWorld }),
        ...(activeOnly && { active: true }),
      },
      select: {
        id: true,
        guildId: true,
        name: true,
        world: true,
        active: true,
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
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getEvent(guildId: string, eventId: string) {
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
        active: true,
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
      throw new NotFoundException('Event not found');
    }

    return event;
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
              orderBy: { order: 'asc' },
              select: {
                id: true,
                name: true,
                order: true,
                maps: {
                  orderBy: { mapId: 'asc' },
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
              orderBy: { mapId: 'asc' },
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
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async updateEvent(guildId: string, eventId: string, data: UpdateEventDto) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const {
      heroNpcs,
      startsAt,
      endsAt,
      active,
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
    let nextScoringRules: Event['scoringRules'] | undefined;
    if (scoringMode !== undefined || scoringRules !== undefined) {
      nextScoringRules =
        targetScoringMode === 'ADVANCED'
          ? normalizeEventScoringRules(
              scoringRules ??
                event.scoringRules ??
                DEFAULT_ADVANCED_EVENT_SCORING_RULES,
            )
          : null;
    }

    const newStartDate =
      startsAt !== undefined
        ? startsAt
          ? new Date(startsAt)
          : event.startsAt
        : event.startsAt;

    const isExplicitDeactivation = active === false && event.active;
    const newEndDate = isExplicitDeactivation
      ? new Date()
      : endsAt !== undefined
        ? endsAt
          ? new Date(endsAt)
          : null
        : event.endsAt;

    if (newEndDate && newStartDate && newEndDate <= newStartDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const now = new Date();
    const newActive = isExplicitDeactivation
      ? false
      : newStartDate &&
        newStartDate <= now &&
        (!newEndDate || newEndDate > now);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (heroNpcs) {
        await tx.eventHeroNpc.deleteMany({ where: { eventId } });
      }

      return tx.event.update({
        where: { id: eventId },
        data: {
          ...updateData,
          active: newActive,
          ...(startsAt !== undefined && {
            startsAt: startsAt ? new Date(startsAt) : null,
          }),
          ...((endsAt !== undefined || isExplicitDeactivation) && {
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
              typeof rulebookMarkdown === 'string' &&
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
                orderBy: { mapId: 'asc' },
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
    });

    return updated;
  }

  async recalculateEventPointsForEvent(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      select: { id: true, basePointsPerKill: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.pointsService.recalculateEventPoints(
      event.id,
      event.basePointsPerKill,
    );

    return { success: true };
  }

  async deleteEvent(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const jobs = await Promise.all([
      this.respawnWindowQueue.getJobs(['waiting']),
      this.respawnWindowQueue.getJobs(['delayed']),
    ]);

    const eventJobs = jobs.flat().filter((job) => job.data.eventId === eventId);

    for (const job of eventJobs) {
      await job.remove().catch(() => undefined);
    }

    await this.prisma.event.delete({
      where: { id: eventId },
    });

    return { success: true };
  }

  async assignMemberToMap(
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

  async unassignMemberFromMap(
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

  async getRanking(guildId: string, eventId: string) {
    return this.pointsService.getRanking(guildId, eventId);
  }

  async getMemberByDiscordId(discordId: string, guildId: string) {
    return this.trackingService.getMemberByDiscordId(discordId, guildId);
  }

  async createHero(guildId: string, eventId: string, data: CreateHeroDto) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId, active: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
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
          create: (data.maps || []).map((map) => ({
            mapId: map.mapId,
            mapName: map.mapName,
          })),
        },
      },
      include: {
        maps: {
          orderBy: { mapId: 'asc' },
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
      throw new NotFoundException('Hero not found');
    }

    return this.prisma.eventHeroNpc.update({
      where: { id: heroId },
      data: {
        npcName: data.npcName,
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
      throw new NotFoundException('Hero not found');
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
      throw new NotFoundException('Hero not found');
    }

    const existingMap = await this.prisma.eventMap.findFirst({
      where: {
        heroNpcId: heroId,
        mapId: data.mapId,
      },
    });

    if (existingMap) {
      throw new BadRequestException('Map already exists for this hero');
    }

    const map = await this.prisma.eventMap.create({
      data: {
        heroNpcId: heroId,
        mapId: data.mapId,
        mapName: data.mapName,
      },
      include: {
        assignedMembers: true,
      },
    });

    await this.openUnassignedGap(map.id, heroId);

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
      throw new NotFoundException('Map not found');
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
      throw new NotFoundException('Hero not found');
    }

    const existingLocation = await this.prisma.eventMapLocation.findFirst({
      where: {
        heroNpcId: heroId,
        name: data.name,
      },
    });

    if (existingLocation) {
      throw new BadRequestException('Location with this name already exists');
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
          orderBy: { mapId: 'asc' },
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
      throw new NotFoundException('Location not found');
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
        throw new BadRequestException('Location with this name already exists');
      }
    }

    return this.prisma.eventMapLocation.update({
      where: { id: locationId },
      data: {
        ...(data.name && { name: data.name }),
      },
      include: {
        maps: {
          orderBy: { mapId: 'asc' },
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
      throw new NotFoundException('Location not found');
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
      throw new NotFoundException('Hero not found');
    }

    const locations = await this.prisma.eventMapLocation.findMany({
      where: {
        heroNpcId: heroId,
        id: { in: data.locationIds },
      },
    });

    if (locations.length !== data.locationIds.length) {
      throw new BadRequestException(
        'Some locations not found or do not belong to this hero',
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
      throw new NotFoundException('Map not found');
    }

    if (locationId) {
      const location = await this.prisma.eventMapLocation.findFirst({
        where: {
          id: locationId,
          heroNpcId: heroId,
        },
      });

      if (!location) {
        throw new NotFoundException('Location not found');
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
      throw new NotFoundException('Hero not found');
    }

    return this.prisma.eventMapLocation.findMany({
      where: { heroNpcId: heroId },
      orderBy: { order: 'asc' },
      include: {
        maps: {
          orderBy: { mapId: 'asc' },
          include: {
            assignedMembers: {
              select: memberSelectWithTopRole,
            },
          },
        },
      },
    });
  }

  async openUnassignedGap(mapId: string, heroNpcId: string): Promise<void> {
    return this.trackingService.openUnassignedGap(mapId, heroNpcId);
  }

  async closeUnassignedGap(mapId: string): Promise<void> {
    return this.trackingService.closeUnassignedGap(mapId);
  }

  async openUncoveredGap(mapId: string, heroNpcId: string): Promise<void> {
    return this.trackingService.openUncoveredGap(mapId, heroNpcId);
  }

  async closeUncoveredGap(mapId: string): Promise<void> {
    return this.trackingService.closeUncoveredGap(mapId);
  }

  async closeAllGapsForHero(heroNpcId: string): Promise<void> {
    return this.trackingService.closeAllGapsForHero(heroNpcId);
  }

  async getMapCoverageGaps(guildId: string, eventId: string, mapId: string) {
    return this.trackingService.getMapCoverageGaps(guildId, eventId, mapId);
  }

  async getHeroCoverageGaps(
    guildId: string,
    eventId: string,
    heroNpcId: string,
  ) {
    return this.trackingService.getHeroCoverageGaps(
      guildId,
      eventId,
      heroNpcId,
    );
  }

  async getActiveGapForMap(guildId: string, eventId: string, mapId: string) {
    return this.trackingService.getActiveGapForMap(guildId, eventId, mapId);
  }

  async getActiveGapsForHero(
    guildId: string,
    eventId: string,
    heroNpcId: string,
  ) {
    return this.trackingService.getActiveGapsForHero(
      guildId,
      eventId,
      heroNpcId,
    );
  }

  async handlePlayerPresenceChange(
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

  async getHeroPresenceStats(
    guildId: string,
    eventId: string,
    heroNpcId: string,
  ) {
    return this.trackingService.getHeroPresenceStats(
      guildId,
      eventId,
      heroNpcId,
    );
  }

  async getEventHeroTimers(guildId: string, eventId: string, world: string) {
    return this.killService.getEventHeroTimers(guildId, eventId, world);
  }

  async getEventHeroStats(guildId: string, eventId: string) {
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
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async checkAndRecordEventHeroKill(
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

  async findActiveEventHeroByNpc(
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

  async recordHeroKill(
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

  calculateMemberPoints(
    _event: Event,
    killTime: Date,
    _heroMapCount: number,
    assignedMembersCount: number,
  ): { points: number } {
    const result = this.pointsService.calculateMemberPoints({
      scoringMode: 'SIMPLE',
      scoringRules: null,
      eligible: true,
      trackingDurationPercentage: 100,
      trackingDurationSeconds: 0,
      assignedMembersCount,
      killTime,
      respawnStartTime: killTime,
      memberLeaveTime: null,
      memberPresentAtKill: true,
      timeOnMapSeconds: 0,
      afkPercentage: 0,
      wasPresent: true,
    });

    return {
      points: result.totalPoints,
    };
  }

  async recalculateEventPoints(
    eventId: string,
    newBasePoints: number,
  ): Promise<void> {
    return this.pointsService.recalculateEventPoints(eventId, newBasePoints);
  }

  async getMemberPresenceStats(
    heroNpcId: string,
    memberId: number,
    since?: Date,
  ) {
    return this.pointsService.getMemberPresenceStats(
      heroNpcId,
      memberId,
      since,
    );
  }

  async updateRankingAfterKill(
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

  async updateKillPoint(
    guildId: string,
    eventId: string,
    killId: string,
    killPointId: string,
    newPoints: number,
    editedByUserId: string,
  ) {
    return this.pointsService.updateKillPoint(
      guildId,
      eventId,
      killId,
      killPointId,
      newPoints,
      editedByUserId,
    );
  }

  async updateRankingPoints(
    guildId: string,
    eventId: string,
    rankingId: string,
    newTotalPoints: number,
    editedByUserId: string,
  ) {
    return this.pointsService.updateRankingPoints(
      guildId,
      eventId,
      rankingId,
      newTotalPoints,
      editedByUserId,
    );
  }

  async getRankingEditHistory(
    guildId: string,
    eventId: string,
    rankingId: string,
  ) {
    return this.pointsService.getRankingEditHistory(
      guildId,
      eventId,
      rankingId,
    );
  }

  async getHeroKillHistory(
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

  async getEventKillHistory(
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

  async getMemberKillHistory(
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

  async getPendingParticipationConfirmations(
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

  async confirmParticipationForKill(
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

  async getKillDetail(
    guildId: string,
    eventId: string,
    heroId: string,
    killId: string,
  ) {
    return this.killService.getKillDetail(guildId, eventId, heroId, killId);
  }

  async getKillTimelineData(
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

  async closeRespawnWindow(
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

  async openRespawnWindow(
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

  async getHeroRespawnConfig(
    guildId: string,
    eventId: string,
    heroId: string,
  ): Promise<{
    hasTimer: boolean;
    windowStatus: 'OPEN' | 'WAITING' | 'NONE';
    minSpawnTime: Date | null;
    maxSpawnTime: Date | null;
  }> {
    return this.respawnService.getHeroRespawnConfig(guildId, eventId, heroId);
  }

  async getAutoCloseJobsStatus(
    guildId: string,
    eventId: string,
  ): Promise<{
    pending: { count: number; jobs: { jobId: string; heroId: string }[] };
    delayed: {
      count: number;
      jobs: { jobId: string; heroId: string; scheduledFor: Date }[];
    };
    failed: {
      count: number;
      jobs: { jobId: string; heroId: string; failedReason: string }[];
    };
  }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const heroes = await this.prisma.eventHeroNpc.findMany({
      where: { eventId },
      select: { id: true },
    });

    const heroIds = new Set(heroes.map((h) => h.id));

    const [pendingJobs, delayedJobs, failedJobs] = await Promise.all([
      this.respawnWindowQueue.getJobs(['waiting', 'active']),
      this.respawnWindowQueue.getJobs(['delayed']),
      this.respawnWindowQueue.getJobs(['failed']),
    ]);

    const filterJobsForEvent = (jobs: typeof pendingJobs) =>
      jobs.filter((job) => heroIds.has(job.data.heroId));

    const eventPendingJobs = filterJobsForEvent(pendingJobs);
    const eventDelayedJobs = filterJobsForEvent(delayedJobs);
    const eventFailedJobs = filterJobsForEvent(failedJobs);

    return {
      pending: {
        count: eventPendingJobs.length,
        jobs: eventPendingJobs.map((job) => ({
          jobId: job.id ?? 'unknown',
          heroId: job.data.heroId,
        })),
      },
      delayed: {
        count: eventDelayedJobs.length,
        jobs: eventDelayedJobs.map((job) => ({
          jobId: job.id ?? 'unknown',
          heroId: job.data.heroId,
          scheduledFor: new Date(job.timestamp + (job.opts.delay ?? 0)),
        })),
      },
      failed: {
        count: eventFailedJobs.length,
        jobs: eventFailedJobs.map((job) => ({
          jobId: job.id ?? 'unknown',
          heroId: job.data.heroId,
          failedReason: job.failedReason ?? 'Unknown',
        })),
      },
    };
  }

  async getQueueHealth(
    guildId: string,
    eventId: string,
  ): Promise<{
    queueName: string;
    isReady: boolean;
    isPaused: boolean;
    jobCounts: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
    workers: number;
  }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const [jobCounts, isPaused, workers] = await Promise.all([
      this.respawnWindowQueue.getJobCounts(),
      this.respawnWindowQueue.isPaused(),
      this.respawnWindowQueue.getWorkers(),
    ]);

    return {
      queueName: this.respawnWindowQueue.name,
      isReady: workers.length > 0,
      isPaused,
      jobCounts: {
        waiting: jobCounts.waiting ?? 0,
        active: jobCounts.active ?? 0,
        completed: jobCounts.completed ?? 0,
        failed: jobCounts.failed ?? 0,
        delayed: jobCounts.delayed ?? 0,
      },
      workers: workers.length,
    };
  }

  filterEventHeroesByLevel<
    T extends { heroNpcs: Array<{ npcLvl: number | null }> },
  >(event: T, roles: Role[], permissions: Permission[]): T {
    return {
      ...event,
      heroNpcs: filterHeroesByLevel(event.heroNpcs, roles, permissions),
    };
  }

  filterEventsHeroesByLevel<
    T extends { heroNpcs: Array<{ npcLvl: number | null }> },
  >(events: T[], roles: Role[], permissions: Permission[]): T[] {
    return events.map((event) =>
      this.filterEventHeroesByLevel(event, roles, permissions),
    );
  }

  isHeroVisibleToUser(
    hero: { npcLvl: number | null },
    roles: Role[],
    permissions: Permission[],
  ): boolean {
    return filterHeroesByLevel([hero], roles, permissions).length > 0;
  }

  async getHeroWithAccessCheck(
    guildId: string,
    eventId: string,
    heroId: string,
    roles: Role[],
    permissions: Permission[],
  ): Promise<EventHeroNpc> {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: {
        id: heroId,
        eventId,
        event: { guildId },
      },
    });

    if (!hero) {
      throw new NotFoundException('Hero not found');
    }

    if (!this.isHeroVisibleToUser(hero, roles, permissions)) {
      throw new NotFoundException('Hero not found');
    }

    return hero;
  }

  async getMapWithHeroAccessCheck(
    guildId: string,
    eventId: string,
    mapId: string,
    roles: Role[],
    permissions: Permission[],
  ) {
    const map = await this.prisma.eventMap.findFirst({
      where: {
        id: mapId,
        heroNpc: {
          eventId,
          event: { guildId },
        },
      },
      include: {
        heroNpc: true,
      },
    });

    if (!map) {
      throw new NotFoundException('Map not found');
    }

    if (!this.isHeroVisibleToUser(map.heroNpc, roles, permissions)) {
      throw new NotFoundException('Map not found');
    }

    return map;
  }
}
