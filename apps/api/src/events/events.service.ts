import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from 'src/db/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateHeroDto } from './dto/create-hero.dto';
import { CreateMapDto } from './dto/create-map.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ReorderLocationsDto } from './dto/reorder-locations.dto';
import { UpdateHeroDto } from './dto/update-hero.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { RESPAWN_WINDOW_QUEUE } from './constants/respawn-queue.constant';
import type { AutoCloseRespawnWindowJobData } from './respawn-window.processor';
import {
  CoverageGapType,
  Event,
  EventHeroNpc,
  EventKillPoint,
  Prisma,
} from 'generated/client';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';

interface TimeOfDayMultiplier {
  from: string; // "HH:mm"
  to: string; // "HH:mm"
  multiplier: number;
}

interface KillTimerData {
  minSpawnTime: Date;
  maxSpawnTime: Date;
  memberId: number;
  previousMinSpawnTime: Date | null;
}

export type MapStatus =
  | 'ASSIGNED_PRESENT'
  | 'ASSIGNED_ABSENT'
  | 'UNASSIGNED'
  | 'WRONG_PLAYER';

export interface CloseRespawnWindowOptions {
  createNewWindow?: boolean;
  newMinSpawnTime?: Date;
  newMaxSpawnTime?: Date;
  isAutoClose?: boolean;
}

export interface OpenRespawnWindowOptions {
  minSpawnTime?: Date;
  maxSpawnTime?: Date;
}

// Default respawn values when no previous timer exists
const DEFAULT_RESP_BASE_SECONDS = 3600; // 1 hour
const DEFAULT_RESP_RANDOMNESS = 20; // 20%

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
    @InjectQueue(RESPAWN_WINDOW_QUEUE)
    private readonly respawnWindowQueue: Queue<AutoCloseRespawnWindowJobData>,
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
      where: { id: eventId, guildId },
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

    return updated;
  }

  async deleteEvent(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
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
    const map = await this.prisma.eventMap.findFirst({
      where: {
        id: mapId,
        heroNpc: {
          event: {
            id: eventId,
            guildId,
          },
        },
      },
      include: {
        assignedMembers: true,
      },
    });

    if (!map) {
      throw new NotFoundException('Map not found');
    }

    const wasUnassigned = map.assignedMembers.length === 0;

    const updated = await this.prisma.eventMap.update({
      where: { id: mapId },
      data: {
        assignedMembers: {
          connect: { id: memberId },
        },
      },
      include: {
        assignedMembers: true,
      },
    });

    // Close UNASSIGNED gap if this is the first member being assigned
    if (wasUnassigned) {
      await this.closeUnassignedGap(mapId);
      // Open UNCOVERED gap since member is assigned but not yet on the map
      await this.openUncoveredGap(mapId, map.heroNpcId);
    }

    await this.emitMapStatusUpdate(guildId, eventId, mapId);

    return updated;
  }

  async unassignMemberFromMap(
    guildId: string,
    eventId: string,
    mapId: string,
    memberId?: number,
  ) {
    const map = await this.prisma.eventMap.findFirst({
      where: {
        id: mapId,
        heroNpc: {
          event: {
            id: eventId,
            guildId,
          },
        },
      },
      include: {
        assignedMembers: true,
        heroNpc: true,
      },
    });

    if (!map) {
      throw new NotFoundException('Map not found');
    }

    // If memberId provided, disconnect specific member; otherwise disconnect all
    const updated = await this.prisma.eventMap.update({
      where: { id: mapId },
      data: {
        assignedMembers: memberId
          ? { disconnect: { id: memberId } }
          : { set: [] },
      },
      include: {
        assignedMembers: true,
      },
    });

    // Open UNASSIGNED gap if no members are left
    if (updated.assignedMembers.length === 0) {
      await this.openUnassignedGap(mapId, map.heroNpcId);
      // Also close any UNCOVERED gap since there's no one to cover
      await this.closeUncoveredGap(mapId);
    }

    await this.emitMapStatusUpdate(guildId, eventId, mapId);

    return updated;
  }

  async updatePresence(
    guildId: string,
    eventId: string,
    memberId: number,
    mapName: string,
    isAfk: boolean,
  ) {
    // Find the map for this event (now through heroNpc)
    const map = await this.prisma.eventMap.findFirst({
      where: {
        mapName,
        heroNpc: {
          event: {
            id: eventId,
            guildId,
          },
        },
      },
    });

    if (!map) {
      // Member is not on a tracked map
      return null;
    }

    // Close any existing open presence log for this member on this map
    await this.prisma.eventPresenceLog.updateMany({
      where: {
        mapId: map.id,
        memberId,
        endedAt: null,
      },
      data: {
        endedAt: new Date(),
      },
    });

    // Create new presence log
    const presenceLog = await this.prisma.eventPresenceLog.create({
      data: {
        mapId: map.id,
        memberId,
        isAfk,
      },
      include: {
        member: true,
      },
    });

    await this.emitPresenceUpdate(guildId, eventId, map.id, presenceLog);

    return presenceLog;
  }

  async getRanking(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.prisma.eventRanking.findMany({
      where: { eventId },
      include: {
        member: true,
      },
      orderBy: {
        totalPoints: 'desc',
      },
    });
  }

  async getMemberByDiscordId(discordId: string, guildId: string) {
    return this.prisma.member.findFirst({
      where: {
        userId: discordId,
        guildId,
        active: true,
      },
    });
  }

  async createHero(guildId: string, eventId: string, data: CreateHeroDto) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
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

    return this.prisma.eventMap.create({
      data: {
        heroNpcId: heroId,
        mapId: data.mapId,
        mapName: data.mapName,
      },
      include: {
        assignedMembers: true,
      },
    });
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

    // Notify about map deletion so clients can update state (e.g. remove from tracking)
    // We reuse the status update mechanism but maybe we need a specific deletion event?
    // For now, let's just accept it disappears from lists on refresh/polling or if we add real-time deletion.
    // The current emitMapStatusUpdate is for assignments.
    // Let's at least try to emit a status update with "deleted" logic if we had one, but we don't.
    // Clients currently rely on polling or initial load for the structure, and socket for status.
    // We might need to implement real-time structure updates later, but for now this is fine.

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

  private async emitMapStatusUpdate(
    guildId: string,
    eventId: string,
    mapId: string,
  ) {
    try {
      await this.amqpConnection.publish(
        'amq.topic',
        RoutingKey.EVENT_MAP_STATUS_UPDATE,
        {
          guildId,
          eventId,
          mapId,
        },
      );
    } catch (error) {
      console.error('Failed to emit map status update', error);
    }
  }

  private async emitPresenceUpdate(
    guildId: string,
    eventId: string,
    mapId: string,
    presenceLog: any,
  ) {
    try {
      await this.amqpConnection.publish(
        'amq.topic',
        RoutingKey.EVENT_PRESENCE_UPDATE,
        {
          guildId,
          eventId,
          mapId,
          presenceLog,
        },
      );
    } catch (error) {
      console.error('Failed to emit presence update', error);
    }
  }

  // ========== COVERAGE GAP MANAGEMENT ==========

  /**
   * Open an UNASSIGNED gap when a map has no assigned members.
   * Called when the last member is unassigned from a map.
   */
  async openUnassignedGap(mapId: string, heroNpcId: string): Promise<void> {
    // Check if there's already an open UNASSIGNED gap
    const existingGap = await this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        gapType: CoverageGapType.UNASSIGNED,
        endedAt: null,
      },
    });

    if (existingGap) {
      return; // Gap already open
    }

    await this.prisma.eventMapCoverageGap.create({
      data: {
        mapId,
        heroNpcId,
        gapType: CoverageGapType.UNASSIGNED,
        startedAt: new Date(),
      },
    });

    this.logger.debug({
      message: 'Opened UNASSIGNED gap',
      mapId,
      heroNpcId,
    });
  }

  /**
   * Close an UNASSIGNED gap when a member is assigned to a map.
   */
  async closeUnassignedGap(mapId: string): Promise<void> {
    const now = new Date();

    const openGap = await this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        gapType: CoverageGapType.UNASSIGNED,
        endedAt: null,
      },
    });

    if (!openGap) {
      return;
    }

    const durationSeconds = Math.round(
      (now.getTime() - openGap.startedAt.getTime()) / 1000,
    );

    await this.prisma.eventMapCoverageGap.update({
      where: { id: openGap.id },
      data: {
        endedAt: now,
        durationSeconds,
      },
    });

    this.logger.debug({
      message: 'Closed UNASSIGNED gap',
      mapId,
      durationSeconds,
    });
  }

  /**
   * Open an UNCOVERED gap when no players are present on a map with assigned members.
   */
  async openUncoveredGap(mapId: string, heroNpcId: string): Promise<void> {
    // Check if there's already an open UNCOVERED gap
    const existingGap = await this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        gapType: CoverageGapType.UNCOVERED,
        endedAt: null,
      },
    });

    if (existingGap) {
      return; // Gap already open
    }

    await this.prisma.eventMapCoverageGap.create({
      data: {
        mapId,
        heroNpcId,
        gapType: CoverageGapType.UNCOVERED,
        startedAt: new Date(),
      },
    });

    this.logger.debug({
      message: 'Opened UNCOVERED gap',
      mapId,
      heroNpcId,
    });
  }

  /**
   * Close an UNCOVERED gap when a player arrives on the map.
   */
  async closeUncoveredGap(mapId: string): Promise<void> {
    const now = new Date();

    const openGap = await this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        gapType: CoverageGapType.UNCOVERED,
        endedAt: null,
      },
    });

    if (!openGap) {
      return;
    }

    const durationSeconds = Math.round(
      (now.getTime() - openGap.startedAt.getTime()) / 1000,
    );

    await this.prisma.eventMapCoverageGap.update({
      where: { id: openGap.id },
      data: {
        endedAt: now,
        durationSeconds,
      },
    });

    this.logger.debug({
      message: 'Closed UNCOVERED gap',
      mapId,
      durationSeconds,
    });
  }

  /**
   * Close all open gaps for a hero when killed.
   */
  async closeAllGapsForHero(heroNpcId: string): Promise<void> {
    const now = new Date();

    const openGaps = await this.prisma.eventMapCoverageGap.findMany({
      where: {
        heroNpcId,
        endedAt: null,
      },
    });

    for (const gap of openGaps) {
      const durationSeconds = Math.round(
        (now.getTime() - gap.startedAt.getTime()) / 1000,
      );

      await this.prisma.eventMapCoverageGap.update({
        where: { id: gap.id },
        data: {
          endedAt: now,
          durationSeconds,
        },
      });
    }

    this.logger.debug({
      message: 'Closed all gaps for hero',
      heroNpcId,
      closedCount: openGaps.length,
    });
  }

  /**
   * Get coverage gaps for a specific map.
   */
  async getMapCoverageGaps(mapId: string) {
    return this.prisma.eventMapCoverageGap.findMany({
      where: { mapId },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Get coverage gaps for a hero (all maps).
   */
  async getHeroCoverageGaps(heroNpcId: string) {
    return this.prisma.eventMapCoverageGap.findMany({
      where: { heroNpcId },
      orderBy: { startedAt: 'desc' },
      include: {
        map: {
          select: {
            mapName: true,
            mapId: true,
          },
        },
      },
    });
  }

  /**
   * Get active (ongoing) gap for a map.
   */
  async getActiveGapForMap(mapId: string) {
    return this.prisma.eventMapCoverageGap.findFirst({
      where: {
        mapId,
        endedAt: null,
      },
    });
  }

  /**
   * Get all active (ongoing) gaps for a hero.
   * Returns all gaps where endedAt is null for all maps of this hero.
   */
  async getActiveGapsForHero(heroNpcId: string) {
    return this.prisma.eventMapCoverageGap.findMany({
      where: {
        heroNpcId,
        endedAt: null,
      },
    });
  }

  /**
   * Handle coverage gap logic when presence changes.
   * Called from the gateway handler when a player changes maps.
   * AFK players don't count as coverage - only active players close the gap.
   */
  async handlePresenceCoverageCheck(
    guildId: string,
    mapName: string,
    discordId: string,
    hasPlayer: boolean,
    isAfk = false,
  ): Promise<void> {
    // Find all event maps with this name in active events for this guild
    const eventMaps = await this.prisma.eventMap.findMany({
      where: {
        mapName,
        heroNpc: {
          event: {
            guildId,
            active: true,
          },
        },
      },
      include: {
        assignedMembers: true,
        heroNpc: true,
      },
    });

    for (const map of eventMaps) {
      const hasAssignedMembers = map.assignedMembers.length > 0;

      if (!hasAssignedMembers) {
        // No assigned members - UNASSIGNED gap should be open
        // (handled in assign/unassign methods)
        continue;
      }

      // Map has assigned members - check UNCOVERED gap
      if (hasPlayer) {
        if (isAfk) {
          // AFK player doesn't count as coverage
          // Check if there are any other active (non-AFK) players
          const activeNonAfkPlayers = await this.getActiveNonAfkPlayersOnMap(
            map.id,
          );
          if (activeNonAfkPlayers.length === 0) {
            // No active players - open UNCOVERED gap
            await this.openUncoveredGap(map.id, map.heroNpcId);
          }
        } else {
          // Active player arrived - close UNCOVERED gap if open
          await this.closeUncoveredGap(map.id);
        }
        // Emit map status update to refresh frontend
        await this.emitMapStatusUpdate(guildId, map.heroNpc.eventId, map.id);
      } else {
        // Player left - check if map is now uncovered
        // We need to check if any other active (non-AFK) players are still on this map
        const activeNonAfkPlayers = await this.getActiveNonAfkPlayersOnMap(
          map.id,
        );

        if (activeNonAfkPlayers.length === 0) {
          // No active players on the map - open UNCOVERED gap
          await this.openUncoveredGap(map.id, map.heroNpcId);
          // Emit map status update to refresh frontend
          await this.emitMapStatusUpdate(guildId, map.heroNpc.eventId, map.id);
        }
      }
    }
  }

  /**
   * Get count of active players on a map (from presence logs).
   */
  private async getActivePlayersOnMap(mapId: string): Promise<number[]> {
    const activeLogs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId,
        endedAt: null,
      },
      select: {
        memberId: true,
      },
      distinct: ['memberId'],
    });

    return activeLogs.map((log) => log.memberId);
  }

  /**
   * Get active non-AFK players on a map (from presence logs).
   * Used for coverage gap logic - AFK players don't count as coverage.
   */
  private async getActiveNonAfkPlayersOnMap(mapId: string): Promise<number[]> {
    const activeLogs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId,
        endedAt: null,
        isAfk: false,
      },
      select: {
        memberId: true,
      },
      distinct: ['memberId'],
    });

    return activeLogs.map((log) => log.memberId);
  }

  async getEventHeroTimers(guildId: string, eventId: string, world: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      include: {
        heroNpcs: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.heroNpcs.length === 0) {
      return [];
    }

    const heroesWithId = event.heroNpcs.filter((hero) => hero.npcId !== null);
    const heroesWithoutId = event.heroNpcs.filter(
      (hero) => hero.npcId === null,
    );

    const npcIds = heroesWithId.map((hero) => hero.npcId as number);
    const npcNames = heroesWithoutId.map((hero) => hero.npcName);

    const now = new Date();

    // For heroes without ID, we need to match by name in the npc JSON
    // Using raw query for name matching since Prisma JSON filtering is limited
    if (npcNames.length > 0) {
      // We'll handle name-based matching with a separate query
      const nameMatchTimers = await this.prisma.$queryRaw<
        Array<{
          createdById: number;
          guildId: string;
          npcId: number;
          world: string;
          minSpawnTime: Date;
          maxSpawnTime: Date;
          latestRespBaseSeconds: number;
          latestRespawnRandomness: number;
          tempId: string | null;
          wasReset: boolean;
          npc: unknown;
          createdAt: Date;
          updatedAt: Date;
        }>
      >`
        SELECT t.*
        FROM "Timer" t
        WHERE t."guildId" = ${guildId}
          AND t."world" = ${world}
          AND t."maxSpawnTime" > ${now}
          AND t."npc"->>'name' = ANY(${npcNames}::text[])
      `;

      // If we also have npcId matches, combine results
      if (npcIds.length > 0) {
        const idMatchTimers = await this.prisma.timer.findMany({
          where: {
            guildId,
            world,
            npcId: { in: npcIds },
            maxSpawnTime: { gt: now.toISOString() },
          },
          include: {
            member: true,
          },
        });

        // Combine and deduplicate by npcId
        const seen = new Set<number>();
        const combined = [];

        for (const timer of idMatchTimers) {
          if (!seen.has(timer.npcId)) {
            seen.add(timer.npcId);
            combined.push(timer);
          }
        }

        for (const timer of nameMatchTimers) {
          if (!seen.has(timer.npcId)) {
            seen.add(timer.npcId);
            // Fetch member for raw query results
            const member = await this.prisma.member.findUnique({
              where: { id: timer.createdById },
            });
            combined.push({ ...timer, member });
          }
        }

        return combined;
      }

      // Only name-based matches - fetch members
      const timersWithMembers = await Promise.all(
        nameMatchTimers.map(async (timer) => {
          const member = await this.prisma.member.findUnique({
            where: { id: timer.createdById },
          });
          return { ...timer, member };
        }),
      );

      return timersWithMembers;
    }

    // Only npcId-based matches
    const timers = await this.prisma.timer.findMany({
      where: {
        guildId,
        world,
        npcId: { in: npcIds },
        maxSpawnTime: { gt: now.toISOString() },
      },
      include: {
        member: true,
      },
    });

    return timers;
  }

  async getEventHeroLoots(
    guildId: string,
    eventId: string,
    world: string,
    limit = 10,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      include: {
        heroNpcs: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.heroNpcs.length === 0) {
      return [];
    }

    const heroesWithId = event.heroNpcs.filter((hero) => hero.npcId !== null);
    const heroesWithoutId = event.heroNpcs.filter(
      (hero) => hero.npcId === null,
    );

    const npcIds = heroesWithId.map((hero) => hero.npcId as number);
    const npcNames = heroesWithoutId.map((hero) => hero.npcName);

    // Build OR conditions for npcSnapshot matching
    const npcSnapshotConditions: Array<{
      npcId?: { in: number[] };
      name?: { in: string[] };
    }> = [];

    if (npcIds.length > 0) {
      npcSnapshotConditions.push({ npcId: { in: npcIds } });
    }

    if (npcNames.length > 0) {
      npcSnapshotConditions.push({ name: { in: npcNames } });
    }

    const loots = await this.prisma.loot.findMany({
      where: {
        world,
        lootSubmissions: {
          some: {
            guildId,
          },
        },
        lootNpcs: {
          some: {
            npcSnapshot: {
              OR: npcSnapshotConditions,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        uniqueId: true,
        world: true,
        source: true,
        location: true,
        lootShare: true,
        createdAt: true,
        updatedAt: true,
        lootSubmissions: {
          where: { guildId },
          include: {
            member: {
              select: {
                name: true,
                avatar: true,
                userId: true,
              },
            },
          },
        },
        lootItems: {
          include: { itemSnapshot: true },
          orderBy: { id: 'asc' },
        },
        lootPlayers: {
          include: { playerSnapshot: true },
          orderBy: { id: 'asc' },
        },
        lootNpcs: {
          include: { npcSnapshot: true },
          orderBy: { id: 'asc' },
        },
      },
    });

    return loots.map((loot) => ({
      id: loot.id,
      uniqueId: loot.uniqueId,
      world: loot.world,
      source: loot.source,
      location: loot.location,
      lootShare: loot.lootShare,
      createdAt: loot.createdAt,
      updatedAt: loot.updatedAt,
      member: loot.lootSubmissions[0]?.member || null,
      items: loot.lootItems.map((item) => ({
        id: item.itemSnapshot.itemId,
        hid: item.hid,
        name: item.itemSnapshot.name,
        icon: item.itemSnapshot.icon,
        stat: item.itemSnapshot.statRaw,
        type: item.itemSnapshot.itemType,
        rarity: item.itemSnapshot.rarity,
        lvl: item.itemSnapshot.lvl,
      })),
      players: loot.lootPlayers.map((player) => ({
        id: player.playerSnapshot.characterId,
        name: player.playerSnapshot.name,
        lvl: player.lvl,
        prof: player.playerSnapshot.prof,
        icon: player.playerSnapshot.icon,
      })),
      npcs: loot.lootNpcs.map((npc) => ({
        id: npc.npcSnapshot.npcId,
        name: npc.npcSnapshot.name,
        lvl: npc.npcSnapshot.lvl,
        type: npc.npcSnapshot.type,
        icon: npc.npcSnapshot.icon,
      })),
    }));
  }

  async getEventHeroStats(guildId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      include: {
        heroNpcs: {
          include: {
            kills: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event.heroNpcs.map((hero) => ({
      heroId: hero.id,
      npcId: hero.npcId,
      npcName: hero.npcName,
      killCount: hero.kills.length,
    }));
  }

  // ========== KILL DETECTION & POINT CALCULATION ==========

  /**
   * Check if NPC is an event hero and record a kill if so.
   * Called from TimersService after timer creation.
   * Also updates hero's npcId and npcIcon if they are missing.
   */
  async checkAndRecordEventHeroKill(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
    npcIcon: string,
    timerData: KillTimerData,
  ): Promise<void> {
    const result = await this.findActiveEventHeroByNpc(
      guildId,
      world,
      npcId,
      npcName,
    );

    if (!result) {
      return; // Not an event hero
    }

    let { eventHero } = result;
    const { event } = result;

    // Update hero's npcId and npcIcon if missing
    if (eventHero.npcId === null || eventHero.npcIcon === null) {
      eventHero = await this.prisma.eventHeroNpc.update({
        where: { id: eventHero.id },
        data: {
          ...(eventHero.npcId === null && { npcId }),
          ...(eventHero.npcIcon === null && { npcIcon }),
        },
      });
      this.logger.log({
        message: 'Hero NPC data updated',
        heroId: eventHero.id,
        npcId: eventHero.npcId,
        npcIcon: eventHero.npcIcon,
      });
    }

    try {
      await this.recordHeroKill(guildId, eventHero, event, timerData);
      this.logger.log({
        message: 'Hero kill recorded',
        guildId,
        eventId: event.id,
        heroId: eventHero.id,
        npcName: eventHero.npcName,
      });
    } catch (error) {
      this.logger.error({
        message: 'Failed to record hero kill',
        guildId,
        eventId: event.id,
        heroId: eventHero.id,
        error: error instanceof Error ? error.message : error,
      });
    }
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
    const now = new Date();

    // First try to match by npcId
    let heroNpc = await this.prisma.eventHeroNpc.findFirst({
      where: {
        npcId,
        event: {
          guildId,
          world,
          active: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [
            {
              OR: [{ endsAt: null }, { endsAt: { gte: now } }],
            },
          ],
        },
      },
      include: {
        event: true,
      },
    });

    // If not found by ID, try by name
    if (!heroNpc) {
      heroNpc = await this.prisma.eventHeroNpc.findFirst({
        where: {
          npcName,
          npcId: null, // Only match by name for heroes without explicit npcId
          event: {
            guildId,
            world,
            active: true,
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [
              {
                OR: [{ endsAt: null }, { endsAt: { gte: now } }],
              },
            ],
          },
        },
        include: {
          event: true,
        },
      });
    }

    if (!heroNpc) {
      return null;
    }

    return {
      eventHero: heroNpc,
      event: heroNpc.event,
    };
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
    const killedAt = new Date();

    // Get all maps for this hero with assigned members
    const heroMaps = await this.prisma.eventMap.findMany({
      where: { heroNpcId: eventHero.id },
      include: {
        assignedMembers: true,
      },
    });

    // Collect unique assigned members
    const memberMapAssignments = new Map<number, string[]>();
    for (const map of heroMaps) {
      for (const member of map.assignedMembers) {
        const maps = memberMapAssignments.get(member.id) || [];
        maps.push(map.mapName);
        memberMapAssignments.set(member.id, maps);
      }
    }

    const assignedMemberIds = Array.from(memberMapAssignments.keys());

    if (assignedMemberIds.length === 0) {
      this.logger.log({
        message: 'No assigned members for hero kill',
        heroId: eventHero.id,
        eventId: event.id,
      });
      // Still record the kill but with no points
    }

    // Calculate points (only if autoCalculatePoints is enabled)
    const shouldCalculatePoints = event.autoCalculatePoints !== false;
    const { points, appliedMultiplier } = shouldCalculatePoints
      ? this.calculateMemberPoints(
          event,
          killedAt,
          heroMaps.length,
          assignedMemberIds.length,
        )
      : { points: 0, appliedMultiplier: 0 };

    // Create kill record with points in a transaction
    const kill = await this.prisma.$transaction(async (tx) => {
      const heroKill = await tx.eventHeroKill.create({
        data: {
          heroNpcId: eventHero.id,
          killedAt,
          minSpawnTimeAtKill: timerData.minSpawnTime,
          maxSpawnTimeAtKill: timerData.maxSpawnTime,
          timerCreatedById: timerData.memberId,
        },
      });

      const killPointsData: Array<{
        killId: string;
        memberId: number;
        mapName: string;
        basePoints: number;
        points: number;
        appliedMultiplier: number;
        timeOnMapSeconds: number;
        afkPercentage: number;
        wasPresent: boolean;
      }> = [];

      // Create points for each assigned member (only if autoCalculatePoints is enabled)
      if (shouldCalculatePoints) {
        for (const memberId of assignedMemberIds) {
          const mapNames = memberMapAssignments.get(memberId) || [];
          const presenceStats = await this.getMemberPresenceStats(
            eventHero.id,
            memberId,
            timerData.previousMinSpawnTime ?? undefined,
          );

          killPointsData.push({
            killId: heroKill.id,
            memberId,
            mapName: mapNames.join(', '),
            basePoints: event.basePointsPerKill,
            points,
            appliedMultiplier,
            timeOnMapSeconds: presenceStats.timeOnMapSeconds,
            afkPercentage: presenceStats.afkPercentage,
            wasPresent: presenceStats.wasPresent,
          });
        }

        // Batch create all kill points
        if (killPointsData.length > 0) {
          await tx.eventKillPoint.createMany({
            data: killPointsData,
          });
        }
      }

      // Clear map assignments for this hero after recording the kill
      for (const map of heroMaps) {
        await tx.eventMap.update({
          where: { id: map.id },
          data: {
            assignedMembers: { set: [] },
          },
        });
      }

      // Fetch the created points
      const createdPoints = await tx.eventKillPoint.findMany({
        where: { killId: heroKill.id },
      });

      return {
        kill: heroKill,
        points: createdPoints,
        clearedMapIds: heroMaps.map((m) => m.id),
      };
    });

    // Update rankings (only if autoCalculatePoints is enabled)
    if (shouldCalculatePoints && kill.points.length > 0) {
      await this.updateRankingAfterKill(
        event.id,
        eventHero.npcName,
        kill.points,
      );
    }

    // Close all coverage gaps for this hero
    await this.closeAllGapsForHero(eventHero.id);

    // Emit real-time event
    await this.emitHeroKilled(guildId, event.id, kill.kill.id);

    // Emit map status updates for cleared assignments
    for (const mapId of kill.clearedMapIds) {
      await this.emitMapStatusUpdate(guildId, event.id, mapId);
    }

    return kill.kill;
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
    const basePoints = event.basePointsPerKill;

    // Get multipliers
    const timeMultiplier = this.getTimeOfDayMultiplier(
      event.timeOfDayMultipliers as unknown as TimeOfDayMultiplier[] | null,
      killTime,
    );

    const trackersMultiplier = this.getTrackersMultiplier(
      event.trackersMultipliers as unknown as Record<string, number> | null,
      assignedMembersCount,
    );

    const mapsMultiplier = this.getMapsCountMultiplier(
      event.mapsCountMultipliers as unknown as Record<string, number> | null,
      heroMapCount,
    );

    const appliedMultiplier =
      timeMultiplier * trackersMultiplier * mapsMultiplier;
    const points = Math.round(basePoints * appliedMultiplier);

    return { points, appliedMultiplier };
  }

  /**
   * Get time-of-day multiplier based on kill time.
   */
  private getTimeOfDayMultiplier(
    multipliers: TimeOfDayMultiplier[] | null,
    killTime: Date,
  ): number {
    if (!multipliers || multipliers.length === 0) {
      return 1.0;
    }

    const hours = killTime.getHours();
    const minutes = killTime.getMinutes();
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    for (const range of multipliers) {
      if (this.isTimeInRange(timeStr, range.from, range.to)) {
        return range.multiplier;
      }
    }

    return 1.0;
  }

  /**
   * Check if time is within a range (handles overnight ranges).
   */
  private isTimeInRange(time: string, from: string, to: string): boolean {
    if (from <= to) {
      // Normal range (e.g., 06:00 to 18:00)
      return time >= from && time < to;
    } else {
      // Overnight range (e.g., 22:00 to 06:00)
      return time >= from || time < to;
    }
  }

  /**
   * Get trackers multiplier based on number of assigned members.
   */
  private getTrackersMultiplier(
    multipliers: Record<string, number> | null,
    assignedCount: number,
  ): number {
    if (!multipliers || assignedCount === 0) {
      return 1.0;
    }

    // Find the highest key <= assignedCount
    const sortedKeys = Object.keys(multipliers)
      .map(Number)
      .filter((k) => !isNaN(k))
      .sort((a, b) => b - a); // Descending

    for (const key of sortedKeys) {
      if (assignedCount >= key) {
        return multipliers[key.toString()] ?? 1.0;
      }
    }

    // If assignedCount is less than all keys, return highest multiplier
    if (sortedKeys.length > 0) {
      const minKey = sortedKeys[sortedKeys.length - 1];
      return multipliers[minKey.toString()] ?? 1.0;
    }

    return 1.0;
  }

  /**
   * Get maps count multiplier.
   */
  private getMapsCountMultiplier(
    multipliers: Record<string, number> | null,
    mapCount: number,
  ): number {
    if (!multipliers || mapCount === 0) {
      return 1.0;
    }

    // Find the highest key <= mapCount
    const sortedKeys = Object.keys(multipliers)
      .map(Number)
      .filter((k) => !isNaN(k))
      .sort((a, b) => b - a); // Descending

    for (const key of sortedKeys) {
      if (mapCount >= key) {
        return multipliers[key.toString()] ?? 1.0;
      }
    }

    return 1.0;
  }

  /**
   * Get presence statistics for a member on hero maps.
   */
  async getMemberPresenceStats(
    heroNpcId: string,
    memberId: number,
    since?: Date,
  ): Promise<{
    timeOnMapSeconds: number;
    afkPercentage: number;
    wasPresent: boolean;
    mapName: string;
  }> {
    const maps = await this.prisma.eventMap.findMany({
      where: { heroNpcId },
      select: { id: true, mapName: true },
    });

    if (maps.length === 0) {
      return {
        timeOnMapSeconds: 0,
        afkPercentage: 0,
        wasPresent: false,
        mapName: '',
      };
    }

    const mapIds = maps.map((m) => m.id);

    // Get presence logs
    const logs = await this.prisma.eventPresenceLog.findMany({
      where: {
        mapId: { in: mapIds },
        memberId,
        ...(since && { startedAt: { gte: since } }),
      },
      orderBy: { startedAt: 'asc' },
    });

    if (logs.length === 0) {
      return {
        timeOnMapSeconds: 0,
        afkPercentage: 0,
        wasPresent: false,
        mapName: maps[0]?.mapName || '',
      };
    }

    const now = new Date();
    let totalTimeMs = 0;
    let afkTimeMs = 0;
    let lastMapName = '';

    for (const log of logs) {
      const endTime = log.endedAt || now;
      const duration = endTime.getTime() - log.startedAt.getTime();
      totalTimeMs += duration;

      if (log.isAfk) {
        afkTimeMs += duration;
      }

      const mapEntry = maps.find((m) => m.id === log.mapId);
      if (mapEntry) {
        lastMapName = mapEntry.mapName;
      }
    }

    const timeOnMapSeconds = Math.round(totalTimeMs / 1000);
    const afkPercentage = totalTimeMs > 0 ? (afkTimeMs / totalTimeMs) * 100 : 0;

    return {
      timeOnMapSeconds,
      afkPercentage: Math.round(afkPercentage * 100) / 100,
      wasPresent: totalTimeMs > 0,
      mapName: lastMapName,
    };
  }

  /**
   * Update event rankings after a kill.
   */
  async updateRankingAfterKill(
    eventId: string,
    heroNpcName: string,
    killPoints: EventKillPoint[],
  ): Promise<void> {
    for (const killPoint of killPoints) {
      const existing = await this.prisma.eventRanking.findUnique({
        where: {
          eventId_memberId_heroNpcName: {
            eventId,
            memberId: killPoint.memberId,
            heroNpcName,
          },
        },
      });

      if (existing) {
        // Calculate new average AFK
        const newTotalKills = existing.totalKills + 1;
        const newAvgAfk =
          (existing.avgAfkPercentage * existing.totalKills +
            killPoint.afkPercentage) /
          newTotalKills;

        await this.prisma.eventRanking.update({
          where: {
            eventId_memberId_heroNpcName: {
              eventId,
              memberId: killPoint.memberId,
              heroNpcName,
            },
          },
          data: {
            totalPoints: { increment: killPoint.points },
            totalKills: { increment: 1 },
            totalTimeSeconds: { increment: killPoint.timeOnMapSeconds },
            avgAfkPercentage: Math.round(newAvgAfk * 100) / 100,
          },
        });
      } else {
        await this.prisma.eventRanking.create({
          data: {
            eventId,
            memberId: killPoint.memberId,
            heroNpcName,
            totalPoints: killPoint.points,
            totalKills: 1,
            totalTimeSeconds: killPoint.timeOnMapSeconds,
            avgAfkPercentage: killPoint.afkPercentage,
          },
        });
      }
    }
  }

  /**
   * Emit hero killed event via RabbitMQ.
   */
  private async emitHeroKilled(
    guildId: string,
    eventId: string,
    killId: string,
  ): Promise<void> {
    try {
      await this.amqpConnection.publish(
        'amq.topic',
        RoutingKey.EVENT_HERO_KILLED,
        {
          guildId,
          eventId,
          killId,
        },
      );
    } catch (error) {
      this.logger.error('Failed to emit hero killed event', error);
    }
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
    // Verify the hero belongs to the event in this guild
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

    const kills = await this.prisma.eventHeroKill.findMany({
      where: {
        heroNpcId: heroId,
        ...(cursor && { id: { lt: cursor } }),
      },
      orderBy: { killedAt: 'desc' },
      take: limit + 1,
      include: {
        heroNpc: true,
        timerCreatedBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
            userId: true,
          },
        },
        points: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                avatar: true,
                userId: true,
                roles: {
                  select: {
                    position: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const hasMore = kills.length > limit;
    const data = hasMore ? kills.slice(0, limit) : kills;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return {
      data,
      nextCursor,
    };
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
    // Verify the event exists in this guild
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const kills = await this.prisma.eventHeroKill.findMany({
      where: {
        heroNpc: {
          eventId,
          ...(heroId && { id: heroId }),
        },
        ...(cursor && { id: { lt: cursor } }),
      },
      orderBy: { killedAt: 'desc' },
      take: limit + 1,
      include: {
        heroNpc: true,
        timerCreatedBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
            userId: true,
          },
        },
        points: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                avatar: true,
                userId: true,
                roles: {
                  select: {
                    position: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const hasMore = kills.length > limit;
    const data = hasMore ? kills.slice(0, limit) : kills;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return {
      data,
      nextCursor,
    };
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
    const kill = await this.prisma.eventHeroKill.findFirst({
      where: {
        id: killId,
        heroNpcId: heroId,
        heroNpc: {
          eventId,
          event: { guildId },
        },
      },
      include: {
        heroNpc: {
          include: {
            event: true,
          },
        },
        timerCreatedBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
            userId: true,
          },
        },
        points: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                avatar: true,
                userId: true,
                roles: {
                  select: {
                    position: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!kill) {
      throw new NotFoundException('Kill not found');
    }

    // Get matching loots
    const loots = await this.getMatchingLootsForKill(kill, guildId);

    return {
      kill,
      loots,
      eventConfig: {
        basePointsPerKill: kill.heroNpc.event.basePointsPerKill,
        timeOfDayMultipliers: kill.heroNpc.event.timeOfDayMultipliers,
        trackersMultipliers: kill.heroNpc.event.trackersMultipliers,
        mapsCountMultipliers: kill.heroNpc.event.mapsCountMultipliers,
      },
    };
  }

  /**
   * Get loots matching a kill by time window and NPC.
   */
  private async getMatchingLootsForKill(
    kill: {
      killedAt: Date;
      heroNpc: {
        npcId: number | null;
        npcName: string;
        event: { world: string };
      };
    },
    guildId: string,
  ) {
    const timeWindowMs = 5 * 60 * 1000; // 5 minutes
    const minTime = new Date(kill.killedAt.getTime() - timeWindowMs);
    const maxTime = new Date(kill.killedAt.getTime() + timeWindowMs);

    // Build NPC matching conditions
    const npcSnapshotConditions: Array<{ npcId?: number; name?: string }> = [];

    if (kill.heroNpc.npcId !== null) {
      npcSnapshotConditions.push({ npcId: kill.heroNpc.npcId });
    }
    npcSnapshotConditions.push({ name: kill.heroNpc.npcName });

    const loots = await this.prisma.loot.findMany({
      where: {
        world: kill.heroNpc.event.world,
        createdAt: {
          gte: minTime,
          lte: maxTime,
        },
        lootSubmissions: {
          some: {
            guildId,
          },
        },
        lootNpcs: {
          some: {
            npcSnapshot: {
              OR: npcSnapshotConditions,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        uniqueId: true,
        world: true,
        source: true,
        location: true,
        lootShare: true,
        createdAt: true,
        updatedAt: true,
        lootSubmissions: {
          where: { guildId },
          include: {
            member: {
              select: {
                name: true,
                avatar: true,
                userId: true,
              },
            },
          },
        },
        lootItems: {
          include: { itemSnapshot: true },
          orderBy: { id: 'asc' },
        },
        lootPlayers: {
          include: { playerSnapshot: true },
          orderBy: { id: 'asc' },
        },
        lootNpcs: {
          include: { npcSnapshot: true },
          orderBy: { id: 'asc' },
        },
      },
    });

    return loots.map((loot) => ({
      id: loot.id,
      uniqueId: loot.uniqueId,
      world: loot.world,
      source: loot.source,
      location: loot.location,
      lootShare: loot.lootShare,
      createdAt: loot.createdAt,
      updatedAt: loot.updatedAt,
      member: loot.lootSubmissions[0]?.member || null,
      items: loot.lootItems.map((item) => ({
        id: item.itemSnapshot.itemId,
        hid: item.hid,
        name: item.itemSnapshot.name,
        icon: item.itemSnapshot.icon,
        stat: item.itemSnapshot.statRaw,
        type: item.itemSnapshot.itemType,
        rarity: item.itemSnapshot.rarity,
        lvl: item.itemSnapshot.lvl,
      })),
      players: loot.lootPlayers.map((player) => ({
        id: player.playerSnapshot.characterId,
        name: player.playerSnapshot.name,
        lvl: player.lvl,
        prof: player.playerSnapshot.prof,
        icon: player.playerSnapshot.icon,
      })),
      npcs: loot.lootNpcs.map((npc) => ({
        id: npc.npcSnapshot.npcId,
        name: npc.npcSnapshot.name,
        lvl: npc.npcSnapshot.lvl,
        type: npc.npcSnapshot.type,
        icon: npc.npcSnapshot.icon,
      })),
    }));
  }

  /**
   * Close a respawn window for an event hero.
   * Optionally creates a new respawn window.
   */
  async closeRespawnWindow(
    guildId: string,
    eventId: string,
    heroId: string,
    options: CloseRespawnWindowOptions = {},
  ): Promise<void> {
    const {
      createNewWindow = false,
      newMinSpawnTime,
      newMaxSpawnTime,
      isAutoClose = false,
    } = options;

    // Get hero with event info
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: { id: heroId, event: { id: eventId, guildId } },
      include: {
        event: true,
        maps: {
          include: { assignedMembers: true },
        },
      },
    });

    if (!hero) {
      throw new NotFoundException('Hero not found');
    }

    if (!hero.npcId) {
      throw new BadRequestException(
        'Hero has no NPC ID - cannot manage respawn window',
      );
    }

    this.logger.log({
      message: isAutoClose
        ? 'Auto-closing respawn window'
        : 'Manually closing respawn window',
      heroId,
      eventId,
      guildId,
      createNewWindow,
    });

    // 1. Clear all map assignments for this hero
    for (const map of hero.maps) {
      if (map.assignedMembers.length > 0) {
        await this.prisma.eventMap.update({
          where: { id: map.id },
          data: { assignedMembers: { set: [] } },
        });
        await this.emitMapStatusUpdate(guildId, eventId, map.id);
      }
    }

    // 2. Close all coverage gaps for this hero
    await this.closeAllGapsForHero(heroId);

    // 3. Delete the timer
    try {
      await this.prisma.timer.delete({
        where: {
          timerId: {
            guildId,
            world: hero.event.world,
            npcId: hero.npcId,
          },
        },
      });
    } catch (error) {
      // Timer might not exist, that's okay
      if (
        !(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        )
      ) {
        throw error;
      }
    }

    // 4. Cancel any scheduled auto-close job
    await this.cancelScheduledAutoClose(heroId);

    // 5. Emit respawn window closed event
    await this.emitRespawnWindowClosed(guildId, eventId, heroId);

    // 6. Optionally create a new respawn window
    if (createNewWindow) {
      await this.openRespawnWindow(guildId, eventId, heroId, {
        minSpawnTime: newMinSpawnTime,
        maxSpawnTime: newMaxSpawnTime,
      });
    }
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
    // Get hero with event info
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: { id: heroId, event: { id: eventId, guildId } },
      include: { event: true },
    });

    if (!hero) {
      throw new NotFoundException('Hero not found');
    }

    if (!hero.npcId) {
      throw new BadRequestException(
        'Hero has no NPC ID - cannot manage respawn window',
      );
    }

    let minSpawnTime: Date;
    let maxSpawnTime: Date;

    if (options.minSpawnTime && options.maxSpawnTime) {
      // Use custom times
      minSpawnTime = options.minSpawnTime;
      maxSpawnTime = options.maxSpawnTime;
    } else {
      // Use default times from last timer or fallback defaults
      const lastTimer = await this.getLastTimerForHero(
        guildId,
        hero.event.world,
        hero.npcId,
      );
      const now = new Date();
      const { min, max } = this.calculateRespawnTime(
        lastTimer?.latestRespBaseSeconds ?? DEFAULT_RESP_BASE_SECONDS,
        lastTimer?.latestRespawnRandomness ?? DEFAULT_RESP_RANDOMNESS,
        now,
      );
      minSpawnTime = min;
      maxSpawnTime = max;
    }

    this.logger.log({
      message: 'Opening respawn window',
      heroId,
      eventId,
      guildId,
      minSpawnTime,
      maxSpawnTime,
    });

    // Get the first member from the guild to use as timer creator (system action)
    const firstMember = await this.prisma.member.findFirst({
      where: { guildId },
      select: { id: true },
    });

    if (!firstMember) {
      throw new BadRequestException('No members found in guild');
    }

    // Create or update the timer
    const npcData = {
      id: hero.npcId,
      name: hero.npcName,
      prof: '',
      location: '',
      wt: '',
      lvl: 0,
      type: 'hero',
      icon: hero.npcIcon || '',
      margonemType: '0',
    };

    const timer = await this.prisma.timer.upsert({
      where: {
        timerId: {
          guildId,
          world: hero.event.world,
          npcId: hero.npcId,
        },
      },
      create: {
        guildId,
        createdById: firstMember.id,
        world: hero.event.world,
        npcId: hero.npcId,
        minSpawnTime,
        maxSpawnTime,
        latestRespBaseSeconds: Math.round(
          (maxSpawnTime.getTime() - minSpawnTime.getTime()) / 2000,
        ),
        latestRespawnRandomness: DEFAULT_RESP_RANDOMNESS,
        wasReset: false,
        npc: npcData,
      },
      update: {
        minSpawnTime,
        maxSpawnTime,
        wasReset: false,
        npc: npcData,
      },
      include: {
        member: true,
      },
    });

    // Schedule auto-close at maxSpawnTime
    await this.scheduleAutoClose(
      guildId,
      eventId,
      heroId,
      hero.npcId,
      hero.event.world,
      maxSpawnTime,
    );

    // Open coverage gaps for all hero maps
    // When manually opening a respawn window, we assume no one is on any map yet
    const heroMaps = await this.prisma.eventMap.findMany({
      where: { heroNpcId: heroId },
      include: {
        assignedMembers: true,
      },
    });

    let unassignedCount = 0;
    let uncoveredCount = 0;

    for (const map of heroMaps) {
      if (!map.assignedMembers || map.assignedMembers.length === 0) {
        // No assigned members - open UNASSIGNED gap
        await this.openUnassignedGap(map.id, heroId);
        unassignedCount++;
      } else {
        // Has assigned members but no one on map yet - open UNCOVERED gap
        await this.openUncoveredGap(map.id, heroId);
        uncoveredCount++;
      }
    }

    this.logger.log({
      message: 'Opened coverage gaps for hero maps',
      heroId,
      mapsCount: heroMaps.length,
      unassignedCount,
      uncoveredCount,
    });

    // Emit respawn window opened event
    await this.emitRespawnWindowOpened(guildId, eventId, heroId);

    // Emit timer update with full timer data (including member and npc)
    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_TIMERS_UPDATE,
      timer,
    );

    return { minSpawnTime, maxSpawnTime };
  }

  /**
   * Get the last timer data for a hero (for default respawn times).
   */
  private async getLastTimerForHero(
    guildId: string,
    world: string,
    npcId: number,
  ): Promise<{
    latestRespBaseSeconds: number;
    latestRespawnRandomness: number;
  } | null> {
    // First try to find an existing timer
    const existingTimer = await this.prisma.timer.findUnique({
      where: {
        timerId: { guildId, world, npcId },
      },
      select: {
        latestRespBaseSeconds: true,
        latestRespawnRandomness: true,
      },
    });

    if (existingTimer) {
      return existingTimer;
    }

    // Otherwise look at recent kills to get historical timer data
    const recentKill = await this.prisma.eventHeroKill.findFirst({
      where: {
        heroNpc: {
          npcId,
          event: { guildId, world },
        },
      },
      orderBy: { killedAt: 'desc' },
      select: {
        minSpawnTimeAtKill: true,
        maxSpawnTimeAtKill: true,
      },
    });

    if (
      recentKill &&
      recentKill.minSpawnTimeAtKill &&
      recentKill.maxSpawnTimeAtKill
    ) {
      const diffMs =
        recentKill.maxSpawnTimeAtKill.getTime() -
        recentKill.minSpawnTimeAtKill.getTime();
      const baseSeconds = Math.round(diffMs / 2000);
      return {
        latestRespBaseSeconds: baseSeconds,
        latestRespawnRandomness:
          baseSeconds > 0
            ? Math.round((diffMs / 2 / (baseSeconds * 1000)) * 100)
            : DEFAULT_RESP_RANDOMNESS,
      };
    }

    return null;
  }

  /**
   * Calculate respawn time window from base seconds and randomness.
   */
  private calculateRespawnTime(
    respBaseSeconds: number,
    respawnRandomness: number,
    now: Date,
  ): { min: Date; max: Date } {
    const dateMs = now.getTime();
    const respMs = respBaseSeconds * 1000;
    const multiplier = respawnRandomness / 100;
    const variance = Math.round(respMs * multiplier);

    return {
      min: new Date(dateMs + respMs - variance),
      max: new Date(dateMs + respMs + variance),
    };
  }

  /**
   * Schedule an auto-close job for a respawn window.
   */
  private async scheduleAutoClose(
    guildId: string,
    eventId: string,
    heroId: string,
    npcId: number,
    world: string,
    maxSpawnTime: Date,
  ): Promise<void> {
    const delay = maxSpawnTime.getTime() - Date.now();

    if (delay <= 0) {
      this.logger.warn({
        message: 'maxSpawnTime is in the past, skipping auto-close scheduling',
        heroId,
        maxSpawnTime,
      });
      return;
    }

    const jobId = this.getAutoCloseJobId(heroId, maxSpawnTime);

    await this.respawnWindowQueue.add(
      'auto-close-respawn-window',
      { guildId, eventId, heroId, npcId, world },
      {
        delay,
        jobId,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    this.logger.log({
      message: 'Scheduled auto-close job',
      heroId,
      jobId,
      delay,
      maxSpawnTime,
    });
  }

  /**
   * Cancel a scheduled auto-close job.
   */
  private async cancelScheduledAutoClose(heroId: string): Promise<void> {
    // Get all delayed jobs and find the one for this hero
    const delayedJobs = await this.respawnWindowQueue.getJobs(['delayed']);

    for (const job of delayedJobs) {
      if (job.data.heroId === heroId) {
        await job.remove();
        this.logger.log({
          message: 'Cancelled scheduled auto-close job',
          heroId,
          jobId: job.id,
        });
      }
    }
  }

  /**
   * Get job ID for auto-close job.
   */
  private getAutoCloseJobId(heroId: string, maxSpawnTime: Date): string {
    return `respawn-close-${heroId}-${maxSpawnTime.getTime()}`;
  }

  /**
   * Emit respawn window opened event.
   */
  private async emitRespawnWindowOpened(
    guildId: string,
    eventId: string,
    heroId: string,
  ): Promise<void> {
    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
      { guildId, eventId, heroId },
    );
  }

  /**
   * Emit respawn window closed event.
   */
  private async emitRespawnWindowClosed(
    guildId: string,
    eventId: string,
    heroId: string,
  ): Promise<void> {
    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.EVENT_RESPAWN_WINDOW_CLOSED,
      { guildId, eventId, heroId },
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
    defaultRespBaseSeconds: number;
    defaultRespRandomness: number;
  }> {
    const hero = await this.prisma.eventHeroNpc.findFirst({
      where: { id: heroId, event: { id: eventId, guildId } },
      include: { event: true },
    });

    if (!hero) {
      throw new NotFoundException('Hero not found');
    }

    if (!hero.npcId) {
      return {
        hasTimer: false,
        windowStatus: 'NONE',
        minSpawnTime: null,
        maxSpawnTime: null,
        defaultRespBaseSeconds: DEFAULT_RESP_BASE_SECONDS,
        defaultRespRandomness: DEFAULT_RESP_RANDOMNESS,
      };
    }

    const now = new Date();

    // Check for active timer
    const timer = await this.prisma.timer.findUnique({
      where: {
        timerId: {
          guildId,
          world: hero.event.world,
          npcId: hero.npcId,
        },
      },
    });

    // Get default values
    const lastTimerData = await this.getLastTimerForHero(
      guildId,
      hero.event.world,
      hero.npcId,
    );

    // Determine window status:
    // OPEN - between min and max spawn time (mob can respawn any moment)
    // WAITING - timer exists but before minSpawnTime (waiting for window to open)
    // NONE - no timer or timer expired
    let windowStatus: 'OPEN' | 'WAITING' | 'NONE' = 'NONE';
    let hasActiveTimer = false;

    if (timer) {
      const minTime = new Date(timer.minSpawnTime);
      const maxTime = new Date(timer.maxSpawnTime);

      if (now >= minTime && now < maxTime) {
        windowStatus = 'OPEN';
        hasActiveTimer = true;
      } else if (now < minTime) {
        windowStatus = 'WAITING';
      }
      // else: timer expired, windowStatus stays 'NONE'
    }

    return {
      hasTimer: hasActiveTimer,
      windowStatus,
      minSpawnTime: timer?.minSpawnTime ?? null,
      maxSpawnTime: timer?.maxSpawnTime ?? null,
      defaultRespBaseSeconds:
        lastTimerData?.latestRespBaseSeconds ?? DEFAULT_RESP_BASE_SECONDS,
      defaultRespRandomness:
        lastTimerData?.latestRespawnRandomness ?? DEFAULT_RESP_RANDOMNESS,
    };
  }
}
