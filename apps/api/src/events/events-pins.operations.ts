import { Effect } from "effect";
import {
  ConflictException,
  NotFoundException,
} from "#src/shared/http/http-errors";
import type { PinnedEventsPersistence } from "./services/pinned-events.repository.js";
import { attachComputedEventActive } from "./utils/event-activity.util.js";

export const makeEventsPins = (persistence: PinnedEventsPersistence) => ({
  listPinnedEvents: (userId: string, guildData: { id: string }) =>
    Effect.gen(function* () {
      const referenceTime = new Date();
      yield* persistence.removeInactive(userId, guildData.id, referenceTime);
      const pinnedEvents = yield* persistence.findActive(
        userId,
        guildData.id,
        referenceTime,
      );
      return pinnedEvents.map(({ event, pinnedAt }) => ({
        pinnedAt,
        event: attachComputedEventActive(event, referenceTime),
      }));
    }).pipe(Effect.withSpan("EventsPins.listPinnedEvents")),

  pinEvent: (userId: string, guildData: { id: string }, eventId: string) =>
    Effect.gen(function* () {
      const referenceTime = new Date();
      const event = yield* persistence.findEvent(eventId, guildData.id);
      if (!event) {
        return yield* Effect.fail(new NotFoundException("Event not found"));
      }
      const activeEvent = attachComputedEventActive(event, referenceTime);
      if (!activeEvent.active) {
        yield* persistence.remove(userId, eventId);
        return yield* Effect.fail(
          new ConflictException("Only active events can be pinned"),
        );
      }
      const pinnedEvent = yield* persistence.pin(userId, eventId);
      if (!pinnedEvent) {
        return yield* Effect.fail(new NotFoundException("Event pin not found"));
      }
      return { pinnedAt: pinnedEvent.pinnedAt, event: activeEvent };
    }).pipe(Effect.withSpan("EventsPins.pinEvent")),

  unpinEvent: (userId: string, guildData: { id: string }, eventId: string) =>
    persistence
      .removeFromGuild(userId, guildData.id, eventId)
      .pipe(Effect.withSpan("EventsPins.unpinEvent")),
});

export type EventsPins = ReturnType<typeof makeEventsPins>;
