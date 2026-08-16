import type { PinnedEventResponseDto } from "@lootlog/api-client/models/main/pinned-event-response-dto";

export const addPinnedEvent = (
  pinnedEvents: PinnedEventResponseDto[],
  pinnedEvent: PinnedEventResponseDto,
) => [
  pinnedEvent,
  ...pinnedEvents.filter(({ event }) => event.id !== pinnedEvent.event.id),
];

export const removePinnedEvent = (
  pinnedEvents: PinnedEventResponseDto[],
  eventId: string,
) => {
  const removedIndex = pinnedEvents.findIndex(
    ({ event }) => event.id === eventId,
  );

  return {
    pinnedEvents: pinnedEvents.filter(({ event }) => event.id !== eventId),
    removedIndex,
    removedPinnedEvent: pinnedEvents[removedIndex],
  };
};

export const restorePinnedEvent = (
  pinnedEvents: PinnedEventResponseDto[],
  pinnedEvent: PinnedEventResponseDto,
  index: number,
) => {
  if (pinnedEvents.some(({ event }) => event.id === pinnedEvent.event.id)) {
    return pinnedEvents;
  }

  const restoredPinnedEvents = [...pinnedEvents];
  restoredPinnedEvents.splice(
    Math.min(Math.max(index, 0), restoredPinnedEvents.length),
    0,
    pinnedEvent,
  );
  return restoredPinnedEvents;
};
