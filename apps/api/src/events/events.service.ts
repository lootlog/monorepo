import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateHeroDto } from './dto/create-hero.dto';
import { CreateMapDto } from './dto/create-map.dto';
import { UpdateHeroDto } from './dto/update-hero.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { Event, EventHeroNpc, EventKillPoint, Prisma } from 'generated/client';

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

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
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
      orderBy: [
        { active: 'desc' },
        { createdAt: 'desc' },
      ],
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
      ...updateData
    } = data;

    // Auto-set endsAt when deactivating event (if not already set)
    const shouldSetEndsAt =
      updateData.active === false && event.active === true && !event.endsAt && endsAt === undefined;

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
            timeOfDayMultipliers: timeOfDayMultipliers as unknown as Prisma.InputJsonValue,
          }),
          ...(trackersMultipliers !== undefined && {
            trackersMultipliers: trackersMultipliers as unknown as Prisma.InputJsonValue,
          }),
          ...(mapsCountMultipliers !== undefined && {
            mapsCountMultipliers: mapsCountMultipliers as unknown as Prisma.InputJsonValue,
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
    });

    if (!map) {
      throw new NotFoundException('Map not found');
    }

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
    const heroesWithoutId = event.heroNpcs.filter((hero) => hero.npcId === null);

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
    const heroesWithoutId = event.heroNpcs.filter((hero) => hero.npcId === null);

    const npcIds = heroesWithId.map((hero) => hero.npcId as number);
    const npcNames = heroesWithoutId.map((hero) => hero.npcName);

    // Build OR conditions for npcSnapshot matching
    const npcSnapshotConditions: Array<{ npcId?: { in: number[] }; name?: { in: string[] } }> = [];

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
          OR: [
            { startsAt: null },
            { startsAt: { lte: now } },
          ],
          AND: [
            {
              OR: [
                { endsAt: null },
                { endsAt: { gte: now } },
              ],
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
            OR: [
              { startsAt: null },
              { startsAt: { lte: now } },
            ],
            AND: [
              {
                OR: [
                  { endsAt: null },
                  { endsAt: { gte: now } },
                ],
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

    // Calculate points
    const { points, appliedMultiplier } = this.calculateMemberPoints(
      event,
      killedAt,
      heroMaps.length,
      assignedMemberIds.length,
    );

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

      // Create points for each assigned member
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

      return { kill: heroKill, points: createdPoints, clearedMapIds: heroMaps.map((m) => m.id) };
    });

    // Update rankings
    await this.updateRankingAfterKill(event.id, kill.points);

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

    const appliedMultiplier = timeMultiplier * trackersMultiplier * mapsMultiplier;
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
    killPoints: EventKillPoint[],
  ): Promise<void> {
    for (const killPoint of killPoints) {
      const existing = await this.prisma.eventRanking.findUnique({
        where: {
          eventId_memberId: {
            eventId,
            memberId: killPoint.memberId,
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
            eventId_memberId: {
              eventId,
              memberId: killPoint.memberId,
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
      heroNpc: { npcId: number | null; npcName: string; event: { world: string } };
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
}
