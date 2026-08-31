import { and } from "@prisma/orm-family-sql/orm-client";
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import { temporalToDate } from "#src/db/temporal";
import { attachComputedEventActive } from "../utils/event-activity.util.js";

@Injectable()
export class PinnedEventsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listPinnedEvents(userId: string, guildId: string) {
    const referenceTime = new Date();
    const pins = await this.prisma.db.orm.public.UserPinnedEvent.where((row) =>
      row.userId.eq(userId),
    )
      .orderBy((pin) => pin.pinnedAt.desc())
      .all();
    const eventIds = pins.map((pin) => pin.eventId);
    const events = await this.loadEvents(guildId, eventIds);
    const activeEventsById = new Map(
      events
        .map((event) => attachComputedEventActive(event, referenceTime))
        .filter((event) => event.active)
        .map((event) => [event.id, event] as const),
    );
    const inactiveEventIds = events
      .filter((event) => !activeEventsById.has(event.id))
      .map((event) => event.id);

    if (inactiveEventIds.length > 0) {
      await this.prisma.db.orm.public.UserPinnedEvent.where((row) =>
        row.userId.eq(userId),
      )
        .where((pin) => pin.eventId.in(inactiveEventIds))
        .delete();
    }

    return pins.flatMap((pin) => {
      const event = activeEventsById.get(pin.eventId);
      return event ? [{ pinnedAt: temporalToDate(pin.pinnedAt), event }] : [];
    });
  }

  async pinEvent(userId: string, guildId: string, eventId: string) {
    const referenceTime = new Date();
    const [event] = await this.loadEvents(guildId, [eventId]);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const activeEvent = attachComputedEventActive(event, referenceTime);
    if (!activeEvent.active) {
      await this.deletePin(userId, eventId);
      throw new ConflictException("Only active events can be pinned");
    }

    let pinnedEvent = await this.prisma.db.orm.public.UserPinnedEvent.where(
      (row) => and(row.userId.eq(userId), row.eventId.eq(eventId)),
    ).first();

    if (!pinnedEvent) {
      try {
        pinnedEvent = await this.prisma.db.orm.public.UserPinnedEvent.create({
          userId,
          eventId,
        });
      } catch (error) {
        if (!this.isUniqueViolation(error)) {
          throw error;
        }
        pinnedEvent = await this.prisma.db.orm.public.UserPinnedEvent.where(
          (row) => and(row.userId.eq(userId), row.eventId.eq(eventId)),
        ).first();
        if (!pinnedEvent) {
          throw error;
        }
      }
    }

    return {
      pinnedAt: temporalToDate(pinnedEvent.pinnedAt),
      event: activeEvent,
    };
  }

  async unpinEvent(userId: string, guildId: string, eventId: string) {
    const event = await this.prisma.db.orm.public.Event.where((row) =>
      and(row.id.eq(eventId), row.guildId.eq(guildId)),
    )
      .select("id")
      .first();

    if (event) {
      await this.deletePin(userId, eventId);
    }
  }

  private async loadEvents(guildId: string, eventIds: string[]) {
    if (eventIds.length === 0) {
      return [];
    }

    const events = await this.prisma.db.orm.public.Event.where((row) =>
      row.guildId.eq(guildId),
    )
      .where((event) => event.id.in(eventIds))
      .all();
    const foundEventIds = events.map((event) => event.id);
    const heroes =
      foundEventIds.length === 0
        ? []
        : await this.prisma.db.orm.public.EventHeroNpc.where((hero) =>
            hero.eventId.in(foundEventIds),
          ).all();
    const heroesByEventId = new Map<string, typeof heroes>();
    for (const hero of heroes) {
      const eventHeroes = heroesByEventId.get(hero.eventId) ?? [];
      eventHeroes.push(hero);
      heroesByEventId.set(hero.eventId, eventHeroes);
    }

    return events.map((event) => ({
      ...event,
      startsAt: event.startsAt === null ? null : temporalToDate(event.startsAt),
      endsAt: event.endsAt === null ? null : temporalToDate(event.endsAt),
      createdAt: temporalToDate(event.createdAt),
      updatedAt: temporalToDate(event.updatedAt),
      heroNpcs: (heroesByEventId.get(event.id) ?? []).map((hero) => ({
        ...hero,
        createdAt: temporalToDate(hero.createdAt),
      })),
    }));
  }

  private deletePin(userId: string, eventId: string) {
    return this.prisma.db.orm.public.UserPinnedEvent.where((row) =>
      and(row.userId.eq(userId), row.eventId.eq(eventId)),
    ).delete();
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    );
  }
}
