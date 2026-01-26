import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from 'src/db/prisma.service';
import { RESPAWN_WINDOW_QUEUE } from './constants/respawn-queue.constant';
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
  Prisma,
  type Role,
} from 'generated/client';
import { filterHeroesByLevel } from 'src/shared/utils/can-view-event-hero';
import { TIMER_TYPES } from 'src/timers/constants/timer-limits';
import type { KillTimerData } from './interfaces/kill-timer-data.interface';
import type {
  CloseRespawnWindowOptions,
  OpenRespawnWindowOptions,
  MapStatus,
} from './interfaces/respawn-window.interface';

import { EventPointsService } from './services/event-points.service';
import { EventTrackingService } from './services/event-tracking.service';
import { EventKillService } from './services/event-kill.service';
import { EventRespawnService } from './services/event-respawn.service';

interface TimerNpcData {
  id: number;
  name: string;
  icon: string;
}

export interface CheckEventHeroKillParams {
  guildId: string;
  world: string;
  npcId: number;
  npcName: string;
  npcIcon: string;
  npcLvl?: number;
  timerData: KillTimerData;
}

// Re-export types for external consumers
export type { MapStatus, CloseRespawnWindowOptions, OpenRespawnWindowOptions };
export type { KillTimerData };

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
  ) {}

  async createEvent(guildId: string, data: CreateEventDto) {
    const { startsAt, endsAt, ...eventData } = data;

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
        active,
        guildId,
        startsAt: startDate,
        endsAt: endDate,
      },
      include: {
        heroNpcs: {
          include: {
            maps: {
              include: {
                assignedMembers: {
                  include: {
                    roles: true,
                  },
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
    return this.prisma.event.findMany({
      where: {
        guildId,
        ...(world && { world }),
        ...(activeOnly && { active: true }),
      },
      include: {
        heroNpcs: {
          include: {
            maps: {
              include: {
                assignedMembers: {
                  include: {
                    roles: true,
                  },
                },
              },
            },
          },
        },
        rankings: {
          include: {
            member: true,
          },
          orderBy: {
            totalPoints: 'desc',
          },
        },
      },
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getEvent(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        guildId,
      },
      include: {
        heroNpcs: {
          include: {
            locations: {
              orderBy: { order: 'asc' },
              include: {
                maps: {
                  include: {
                    assignedMembers: {
                      include: {
                        roles: true,
                      },
                    },
                    presenceLogs: {
                      where: {
                        endedAt: null,
                      },
                      include: {
                        member: true,
                      },
                    },
                  },
                },
              },
            },
            maps: {
              where: { locationId: null },
              include: {
                assignedMembers: {
                  include: {
                    roles: true,
                  },
                },
                presenceLogs: {
                  where: {
                    endedAt: null,
                  },
                  include: {
                    member: true,
                  },
                },
              },
            },
            kills: {
              orderBy: {
                killedAt: 'desc',
              },
              take: 10,
            },
          },
        },
        rankings: {
          include: {
            member: true,
          },
          orderBy: {
            totalPoints: 'desc',
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
      where: { id: eventId, guildId, active: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const {
      heroNpcs,
      startsAt,
      endsAt,
      timeOfDayMultipliers,
      trackersMultipliers,
      mapsCountMultipliers,
      trackingDurationMultipliers,
      assignmentTimeoutMinutes,
      basePointsPerKill,
      ...updateData
    } = data;

    // Calculate new dates (use existing if not provided)
    const newStartDate =
      startsAt !== undefined
        ? startsAt
          ? new Date(startsAt)
          : event.startsAt
        : event.startsAt;
    const newEndDate =
      endsAt !== undefined ? (endsAt ? new Date(endsAt) : null) : event.endsAt;

    // Validate endsAt > startsAt
    if (newEndDate && newStartDate && newEndDate <= newStartDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Recalculate active based on date range
    const now = new Date();
    const newActive =
      newStartDate && newStartDate <= now && (!newEndDate || newEndDate > now);

    // Update event and optionally recreate heroes/maps
    const updated = await this.prisma.$transaction(async (tx) => {
      // Delete existing heroNpcs (and their maps via cascade) if new ones are provided
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
          ...(endsAt !== undefined && {
            endsAt: endsAt ? new Date(endsAt) : null,
          }),
          ...(timeOfDayMultipliers !== undefined && {
            timeOfDayMultipliers:
              timeOfDayMultipliers as unknown as Prisma.InputJsonValue,
          }),
          ...(trackersMultipliers !== undefined && {
            trackersMultipliers:
              trackersMultipliers as unknown as Prisma.InputJsonValue,
          }),
          ...(mapsCountMultipliers !== undefined && {
            mapsCountMultipliers:
              mapsCountMultipliers as unknown as Prisma.InputJsonValue,
          }),
          ...(trackingDurationMultipliers !== undefined && {
            trackingDurationMultipliers:
              trackingDurationMultipliers as unknown as Prisma.InputJsonValue,
          }),
          ...(assignmentTimeoutMinutes !== undefined && {
            assignmentTimeoutMinutes,
          }),
          ...(basePointsPerKill !== undefined && {
            basePointsPerKill,
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
                include: {
                  assignedMembers: {
                    include: {
                      roles: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    // Check if any multiplier configuration changed
    const multipliersChanged =
      this.hasJsonChanged(timeOfDayMultipliers, event.timeOfDayMultipliers) ||
      this.hasJsonChanged(trackersMultipliers, event.trackersMultipliers) ||
      this.hasJsonChanged(mapsCountMultipliers, event.mapsCountMultipliers) ||
      this.hasJsonChanged(
        trackingDurationMultipliers,
        event.trackingDurationMultipliers,
      );

    const basePointsChanged =
      basePointsPerKill !== undefined &&
      basePointsPerKill !== event.basePointsPerKill;

    // Recalculate points if basePointsPerKill or any multiplier changed
    if (basePointsChanged || multipliersChanged) {
      await this.pointsService.recalculateEventPointsWithMultipliers(eventId, {
        basePointsPerKill: basePointsPerKill ?? event.basePointsPerKill,
        timeOfDayMultipliers:
          timeOfDayMultipliers !== undefined
            ? (timeOfDayMultipliers as unknown as Event['timeOfDayMultipliers'])
            : event.timeOfDayMultipliers,
        trackersMultipliers:
          trackersMultipliers !== undefined
            ? (trackersMultipliers as unknown as Event['trackersMultipliers'])
            : event.trackersMultipliers,
        mapsCountMultipliers:
          mapsCountMultipliers !== undefined
            ? (mapsCountMultipliers as unknown as Event['mapsCountMultipliers'])
            : event.mapsCountMultipliers,
        trackingDurationMultipliers:
          trackingDurationMultipliers !== undefined
            ? (trackingDurationMultipliers as unknown as Event['trackingDurationMultipliers'])
            : event.trackingDurationMultipliers,
      });
    }

    return updated;
  }

  async deleteEvent(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId, active: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        active: false,
        endsAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Compare two JSON values for deep equality.
   * Returns true if the new value is defined and different from the old value.
   */
  private hasJsonChanged(
    newValue: unknown,
    oldValue: unknown,
  ): boolean {
    if (newValue === undefined) {
      return false;
    }
    return JSON.stringify(newValue) !== JSON.stringify(oldValue);
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
          include: {
            assignedMembers: {
              include: {
                roles: true,
              },
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

    // Check if map already exists for this hero
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

    // Open UNASSIGNED gap for new map (no members assigned yet)
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

  // ========== LOCATION MANAGEMENT ==========

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

    // Check if location with this name already exists
    const existingLocation = await this.prisma.eventMapLocation.findFirst({
      where: {
        heroNpcId: heroId,
        name: data.name,
      },
    });

    if (existingLocation) {
      throw new BadRequestException('Location with this name already exists');
    }

    // Get max order for this hero
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
          include: {
            assignedMembers: {
              include: { roles: true },
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

    // Check for duplicate name if name is being changed
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
          include: {
            assignedMembers: {
              include: { roles: true },
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

    // Maps will have locationId set to null automatically (onDelete: SetNull)
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

    // Verify all locations belong to this hero
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

    // Update order in a transaction
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

    // If locationId is provided, verify it belongs to this hero
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
          include: { roles: true },
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
          include: {
            assignedMembers: {
              include: { roles: true },
            },
          },
        },
      },
    });
  }

  // ========== COVERAGE GAP MANAGEMENT ==========

  /**
   * Open an UNASSIGNED gap when a map has no assigned members.
   */
  async openUnassignedGap(mapId: string, heroNpcId: string): Promise<void> {
    return this.trackingService.openUnassignedGap(mapId, heroNpcId);
  }

  /**
   * Close an UNASSIGNED gap when a member is assigned to a map.
   */
  async closeUnassignedGap(mapId: string): Promise<void> {
    return this.trackingService.closeUnassignedGap(mapId);
  }

  /**
   * Open an UNCOVERED gap when no players are present on a map.
   */
  async openUncoveredGap(mapId: string, heroNpcId: string): Promise<void> {
    return this.trackingService.openUncoveredGap(mapId, heroNpcId);
  }

  /**
   * Close an UNCOVERED gap when a player arrives on the map.
   */
  async closeUncoveredGap(mapId: string): Promise<void> {
    return this.trackingService.closeUncoveredGap(mapId);
  }

  /**
   * Close all open gaps for a hero when killed.
   */
  async closeAllGapsForHero(heroNpcId: string): Promise<void> {
    return this.trackingService.closeAllGapsForHero(heroNpcId);
  }

  /**
   * Get coverage gaps for a specific map.
   */
  async getMapCoverageGaps(guildId: string, eventId: string, mapId: string) {
    return this.trackingService.getMapCoverageGaps(guildId, eventId, mapId);
  }

  /**
   * Get coverage gaps for a hero (all maps).
   */
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

  /**
   * Get active (ongoing) gap for a map.
   */
  async getActiveGapForMap(guildId: string, eventId: string, mapId: string) {
    return this.trackingService.getActiveGapForMap(guildId, eventId, mapId);
  }

  /**
   * Get all active (ongoing) gaps for a hero.
   */
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

  /**
   * Handle player presence change from gateway.
   * Creates presence logs and manages coverage gaps.
   */
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

  /**
   * Get presence statistics for a hero.
   * Validates that the hero belongs to the specified guild and event.
   */
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

  // ========== KILL DETECTION & POINT CALCULATION ==========

  /**
   * Check if NPC is an event hero and record a kill if so.
   */
  async checkAndRecordEventHeroKill(
    params: CheckEventHeroKillParams,
  ): Promise<void> {
    return this.killService.checkAndRecordEventHeroKill(
      params.guildId,
      params.world,
      params.npcId,
      params.npcName,
      params.npcIcon,
      params.timerData,
      false,
      params.npcLvl,
    );
  }

  /**
   * Find an active event hero by NPC ID or name.
   */
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

  /**
   * Record a hero kill and calculate points for all assigned members.
   */
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

  /**
   * Calculate points with all multipliers applied.
   */
  calculateMemberPoints(
    event: Event,
    killTime: Date,
    heroMapCount: number,
    assignedMembersCount: number,
  ): { points: number; appliedMultiplier: number } {
    return this.pointsService.calculateMemberPoints(
      event,
      killTime,
      heroMapCount,
      assignedMembersCount,
    );
  }

  /**
   * Recalculate all points for an event when basePointsPerKill changes.
   */
  async recalculateEventPoints(
    eventId: string,
    newBasePoints: number,
  ): Promise<void> {
    return this.pointsService.recalculateEventPoints(eventId, newBasePoints);
  }

  /**
   * Get presence statistics for a member on hero maps.
   */
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

  /**
   * Update event rankings after a kill.
   */
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

  // ========== MANUAL POINTS EDITING ==========

  /**
   * Update a kill point's points value and recalculate the ranking.
   */
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

  /**
   * Update a ranking's total points directly.
   */
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

  /**
   * Get edit history for a ranking.
   */
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

  // ========== KILL HISTORY ==========

  /**
   * Get kill history for a specific hero with pagination.
   */
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

  /**
   * Get kill history for an entire event with pagination.
   */
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

  /**
   * Get detailed information about a specific kill.
   */
  async getKillDetail(
    guildId: string,
    eventId: string,
    heroId: string,
    killId: string,
  ) {
    return this.killService.getKillDetail(guildId, eventId, heroId, killId);
  }

  /**
   * Get timeline data for maps during a kill event (assignments and coverage gaps).
   */
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

  // ========== RESPAWN WINDOW MANAGEMENT ==========

  /**
   * Close a respawn window for an event hero.
   */
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

  /**
   * Open a new respawn window for an event hero.
   */
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

  /**
   * Get hero's default respawn configuration for frontend display.
   */
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

  // ========== MONITORING ==========

  /**
   * Get status of auto-close jobs for a specific event.
   * Returns pending, delayed, and failed job counts with details.
   */
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
    // Verify event belongs to guild
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Get hero IDs for this event
    const heroes = await this.prisma.eventHeroNpc.findMany({
      where: { eventId },
      select: { id: true },
    });

    const heroIds = new Set(heroes.map((h) => h.id));

    // Get jobs from queue
    const [pendingJobs, delayedJobs, failedJobs] = await Promise.all([
      this.respawnWindowQueue.getJobs(['waiting', 'active']),
      this.respawnWindowQueue.getJobs(['delayed']),
      this.respawnWindowQueue.getJobs(['failed']),
    ]);

    // Filter jobs for this event's heroes
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

  /**
   * Get overall queue health status.
   * Returns queue readiness and job counts for monitoring.
   */
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
    // Verify event belongs to guild
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Get queue status
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

  // ========== HERO LEVEL FILTERING ==========

  /**
   * Filter heroes in an event by user's level range permissions.
   * Returns filtered heroNpcs array.
   */
  filterEventHeroesByLevel<
    T extends { heroNpcs: Array<{ npcLvl: number | null }> },
  >(event: T, roles: Role[], permissions: Permission[]): T {
    return {
      ...event,
      heroNpcs: filterHeroesByLevel(event.heroNpcs, roles, permissions),
    };
  }

  /**
   * Filter heroes in multiple events by user's level range permissions.
   */
  filterEventsHeroesByLevel<
    T extends { heroNpcs: Array<{ npcLvl: number | null }> },
  >(events: T[], roles: Role[], permissions: Permission[]): T[] {
    return events.map((event) =>
      this.filterEventHeroesByLevel(event, roles, permissions),
    );
  }

  /**
   * Check if a hero is visible to the user based on level restrictions.
   */
  isHeroVisibleToUser(
    hero: { npcLvl: number | null },
    roles: Role[],
    permissions: Permission[],
  ): boolean {
    return filterHeroesByLevel([hero], roles, permissions).length > 0;
  }

  /**
   * Get hero by ID and validate access.
   * Throws NotFoundException if hero doesn't exist or user can't access it.
   */
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

  /**
   * Get map and validate that the associated hero is accessible to the user.
   * Returns the map with hero data or throws.
   */
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
