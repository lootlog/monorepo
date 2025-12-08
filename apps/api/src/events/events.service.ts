import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { CreateEventDto, HeroNpcDto } from './dto/create-event.dto';
import { CreateHeroDto } from './dto/create-hero.dto';
import { CreateMapDto } from './dto/create-map.dto';
import { UpdateHeroDto } from './dto/update-hero.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RoutingKey } from 'src/enum/routing-key.enum';

export type MapStatus =
  | 'ASSIGNED_PRESENT'
  | 'ASSIGNED_ABSENT'
  | 'UNASSIGNED'
  | 'WRONG_PLAYER';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async createEvent(guildId: string, data: CreateEventDto) {
    const { heroNpcs, startsAt, endsAt, ...eventData } = data;

    const event = await this.prisma.event.create({
      data: {
        ...eventData,
        guildId,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        heroNpcs: {
          create: heroNpcs.map((npc) => ({
            npcId: npc.npcId,
            npcName: npc.npcName,
            maps: {
              create: npc.maps.map((mapName) => ({ mapName })),
            },
          })),
        },
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
      orderBy: {
        createdAt: 'desc',
      },
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

    const { heroNpcs, startsAt, endsAt, ...updateData } = data;

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
          ...(heroNpcs && {
            heroNpcs: {
              create: heroNpcs.map((npc) => ({
                npcId: npc.npcId,
                npcName: npc.npcName,
                maps: {
                  create: npc.maps.map((mapName) => ({ mapName })),
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

  async getTemplates(guildId: string) {
    return this.prisma.eventMapTemplate.findMany({
      where: { guildId },
      orderBy: { name: 'asc' },
    });
  }

  async createTemplate(
    guildId: string,
    data: { name: string; heroNpcs: any[] },
  ) {
    return this.prisma.eventMapTemplate.create({
      data: {
        guildId,
        name: data.name,
        heroNpcs: data.heroNpcs as unknown as any,
      },
    });
  }

  async deleteTemplate(guildId: string, templateId: string) {
    const template = await this.prisma.eventMapTemplate.findFirst({
      where: { id: templateId, guildId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.prisma.eventMapTemplate.delete({
      where: { id: templateId },
    });

    return { success: true };
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
          create: (data.maps || []).map((mapName) => ({ mapName })),
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
        mapName: data.mapName,
      },
    });

    if (existingMap) {
      throw new BadRequestException('Map already exists for this hero');
    }

    return this.prisma.eventMap.create({
      data: {
        heroNpcId: heroId,
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
}
