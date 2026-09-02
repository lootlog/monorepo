import { Permission } from "@lootlog/schema/permissions";

import { PinnedEventResponseDto } from "./dto/pinned-event-response.dto.js";
import { PinnedEventsService } from "./services/pinned-events.service.js";

export class EventsPinsController {
  constructor(private readonly pinnedEventsService: PinnedEventsService) {}

  listPinnedEvents(userId: string, guildData: { id: string }) {
    return this.pinnedEventsService.listPinnedEvents(userId, guildData.id);
  }

  pinEvent(userId: string, guildData: { id: string }, eventId: string) {
    return this.pinnedEventsService.pinEvent(userId, guildData.id, eventId);
  }

  async unpinEvent(userId: string, guildData: { id: string }, eventId: string) {
    await this.pinnedEventsService.unpinEvent(userId, guildData.id, eventId);
  }
}
