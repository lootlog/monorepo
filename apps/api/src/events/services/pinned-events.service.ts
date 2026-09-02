import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { attachComputedEventActive } from "../utils/event-activity.util.js";
import { PinnedEventsRepository } from "./pinned-events.repository.js";

@Injectable()
export class PinnedEventsService {
  constructor(private readonly repository: PinnedEventsRepository) {}

  async listPinnedEvents(userId: string, guildId: string) {
    const referenceTime = new Date();

    await this.repository.removeInactive(userId, guildId, referenceTime);
    const pinnedEvents = await this.repository.findActive(
      userId,
      guildId,
      referenceTime,
    );

    return pinnedEvents.map(({ event, pinnedAt }) => ({
      pinnedAt,
      event: attachComputedEventActive(event, referenceTime),
    }));
  }

  async pinEvent(userId: string, guildId: string, eventId: string) {
    const referenceTime = new Date();
    const event = await this.repository.findEvent(eventId, guildId);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const activeEvent = attachComputedEventActive(event, referenceTime);
    if (!activeEvent.active) {
      await this.repository.remove(userId, eventId);
      throw new ConflictException("Only active events can be pinned");
    }

    const pinnedEvent = await this.repository.pin(userId, eventId);
    if (!pinnedEvent) throw new NotFoundException("Event pin not found");

    return {
      pinnedAt: pinnedEvent.pinnedAt,
      event: activeEvent,
    };
  }

  async unpinEvent(userId: string, guildId: string, eventId: string) {
    await this.repository.removeFromGuild(userId, guildId, eventId);
  }
}
