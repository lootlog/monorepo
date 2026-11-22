import { Clock, Effect } from "effect";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import type { PinnedEventsPersistence } from "#src/events/pins/pinned-events.repository";
import { attachComputedEventActive } from "#src/events/monitoring/event-activity";

export const makeEventsPins = (persistence: PinnedEventsPersistence) => ({
  listPinnedEvents: Effect.fn("EventsPins.listPinnedEvents")(function* (
    userId: string,
    guildData: { id: string },
  ) {
    const referenceTime = new Date(yield* Clock.currentTimeMillis);

    const [, pinnedEvents] = yield* Effect.all(
      [
        persistence.removeInactive(userId, guildData.id, referenceTime),
        persistence.findActive(userId, guildData.id, referenceTime),
      ],
      { concurrency: "unbounded" },
    );

    return pinnedEvents.map(({ event, pinnedAt }) => ({
      pinnedAt,
      event: attachComputedEventActive(event, referenceTime),
    }));
  }),

  pinEvent: Effect.fn("EventsPins.pinEvent")(function* (
    userId: string,
    guildData: { id: string },
    eventId: string,
  ) {
    const referenceTime = new Date(yield* Clock.currentTimeMillis);
    const event = yield* persistence.findEvent(eventId, guildData.id);

    if (!event) {
      return yield* new ResourceNotFoundError("Event not found");
    }

    const activeEvent = attachComputedEventActive(event, referenceTime);

    if (!activeEvent.active) {
      yield* persistence.remove(userId, eventId);

      return yield* new ResourceConflictError(
        "Only active events can be pinned",
      );
    }

    const pinnedEvent = yield* persistence.pin(userId, eventId);

    if (!pinnedEvent) {
      return yield* new ResourceNotFoundError("Event pin not found");
    }

    return { pinnedAt: pinnedEvent.pinnedAt, event: activeEvent };
  }),

  unpinEvent: (userId: string, guildData: { id: string }, eventId: string) =>
    persistence
      .removeFromGuild(userId, guildData.id, eventId)
      .pipe(Effect.withSpan("EventsPins.unpinEvent")),
});

export type EventsPins = ReturnType<typeof makeEventsPins>;
