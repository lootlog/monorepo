import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
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
  Prisma,
} from 'generated/client';
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
  ) {}

  async createEvent(guildId: string, data: CreateEventDto) {
    const { heroNpcs = [], startsAt, endsAt, ...eventData } = data;

    const event = await this.prisma.event.create({
      data: {
        ...eventData,
        guildId,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        ...(heroNpcs.length > 0 && {
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
        active: true,
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
      assignmentTimeoutMinutes,
      autoCalculatePoints,
      basePointsPerKill,
      ...updateData
    } = data;

    // Auto-set endsAt when deactivating event (if not already set)
    const shouldSetEndsAt =
      updateData.active === false &&
      event.active === true &&
      !event.endsAt &&
      endsAt === undefined;

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
          ...(startsAt !== undefined && {
            startsAt: startsAt ? new Date(startsAt) : null,
          }),
          ...(endsAt !== undefined && {
            endsAt: endsAt ? new Date(endsAt) : null,
          }),
          ...(shouldSetEndsAt && {
            endsAt: new Date(),
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
          ...(assignmentTimeoutMinutes !== undefined && {
            assignmentTimeoutMinutes,
          }),
          ...(autoCalculatePoints !== undefined && {
            autoCalculatePoints,
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

    // Recalculate points if basePointsPerKill changed
    if (
      basePointsPerKill !== undefined &&
      basePointsPerKill !== event.basePointsPerKill
    ) {
      await this.recalculateEventPoints(eventId, basePointsPerKill);
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

  async assignMemberToMap(
    guildId: string,
    eventId: string,
    mapId: string,
    memberId: number,
  ) {
    return this.trackingService.assignMemberToMap(guildId, eventId, mapId, memberId);
  }

  async unassignMemberFromMap(
    guildId: string,
    eventId: string,
    mapId: string,
    memberId?: number,
  ) {
    return this.trackingService.unassignMemberFromMap(guildId, eventId, mapId, memberId);
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

    return this.prisma.eventHeroNpc.create({
      data: {
        eventId,
        npcId: data.npcId,
        npcName: data.npcName,
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
  async getHeroCoverageGaps(guildId: string, eventId: string, heroNpcId: string) {
    return this.trackingService.getHeroCoverageGaps(guildId, eventId, heroNpcId);
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
  async getActiveGapsForHero(guildId: string, eventId: string, heroNpcId: string) {
    return this.trackingService.getActiveGapsForHero(guildId, eventId, heroNpcId);
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
    return this.trackingService.getHeroPresenceStats(guildId, eventId, heroNpcId);
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
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
    npcIcon: string,
    timerData: KillTimerData,
  ): Promise<void> {
    return this.killService.checkAndRecordEventHeroKill(
      guildId,
      world,
      npcId,
      npcName,
      npcIcon,
      timerData,
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
    return this.killService.findActiveEventHeroByNpc(guildId, world, npcId, npcName);
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
    return this.killService.recordHeroKill(guildId, eventHero, event, timerData);
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
    return this.pointsService.getMemberPresenceStats(heroNpcId, memberId, since);
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
    return this.pointsService.getRankingEditHistory(guildId, eventId, rankingId);
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
    return this.killService.getHeroKillHistory(guildId, eventId, heroId, limit, cursor);
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
    return this.killService.getEventKillHistory(guildId, eventId, limit, cursor, heroId);
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
    return this.killService.getKillTimelineData(guildId, eventId, heroId, killId);
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
    return this.respawnService.closeRespawnWindow(guildId, eventId, heroId, options);
  }

  /**
   * Open a new respawn window for an event hero.
   */
  async openRespawnWindow(
    guildId: string,
    eventId: string,
    heroId: string,
    options: OpenRespawnWindowOptions = {},
  ): Promise<{ minSpawnTime: Date; maxSpawnTime: Date }> {
    return this.respawnService.openRespawnWindow(guildId, eventId, heroId, options);
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
    defaultRespBaseSeconds: number;
    defaultRespRandomness: number;
  }> {
    return this.respawnService.getHeroRespawnConfig(guildId, eventId, heroId);
  }
}
