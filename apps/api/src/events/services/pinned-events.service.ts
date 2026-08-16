import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import {
  attachComputedEventActive,
  buildActiveEventWhere,
} from "../utils/event-activity.util";

const pinnedEventSelect = {
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
} as const;

@Injectable()
export class PinnedEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPinnedEvents(userId: string, guildId: string) {
    const referenceTime = new Date();

    await this.prisma.userPinnedEvent.deleteMany({
      where: {
        userId,
        event: {
          guildId,
          OR: [
            { startsAt: { gt: referenceTime } },
            { endsAt: { lte: referenceTime } },
          ],
        },
      },
    });

    const pinnedEvents = await this.prisma.userPinnedEvent.findMany({
      where: {
        userId,
        event: {
          guildId,
          ...buildActiveEventWhere(referenceTime),
        },
      },
      select: {
        pinnedAt: true,
        event: {
          select: pinnedEventSelect,
        },
      },
      orderBy: { pinnedAt: "desc" },
    });

    return pinnedEvents.map(({ event, pinnedAt }) => ({
      pinnedAt,
      event: attachComputedEventActive(event, referenceTime),
    }));
  }

  async pinEvent(userId: string, guildId: string, eventId: string) {
    const referenceTime = new Date();
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId },
      select: pinnedEventSelect,
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const activeEvent = attachComputedEventActive(event, referenceTime);
    if (!activeEvent.active) {
      await this.prisma.userPinnedEvent.deleteMany({
        where: { userId, eventId },
      });
      throw new ConflictException("Only active events can be pinned");
    }

    const pinnedEvent = await this.prisma.userPinnedEvent.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId },
      update: {},
      select: { pinnedAt: true },
    });

    return {
      pinnedAt: pinnedEvent.pinnedAt,
      event: activeEvent,
    };
  }

  async unpinEvent(userId: string, guildId: string, eventId: string) {
    await this.prisma.userPinnedEvent.deleteMany({
      where: {
        userId,
        eventId,
        event: { guildId },
      },
    });
  }
}
