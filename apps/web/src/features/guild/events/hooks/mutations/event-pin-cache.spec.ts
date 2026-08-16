import type { PinnedEventResponseDto } from "@lootlog/api-client/models/main/pinned-event-response-dto";
import { describe, expect, it } from "vitest";
import {
  addPinnedEvent,
  removePinnedEvent,
  restorePinnedEvent,
} from "./event-pin-cache";

describe("event pin cache", () => {
  it("keeps concurrent event additions independent", () => {
    const firstPin = createPinnedEvent("event-1");
    const secondPin = createPinnedEvent("event-2");

    const afterFirstPin = addPinnedEvent([], firstPin);
    const afterSecondPin = addPinnedEvent(afterFirstPin, secondPin);
    const afterFirstPinRollback = removePinnedEvent(
      afterSecondPin,
      firstPin.event.id,
    ).pinnedEvents;

    expect(afterFirstPinRollback).toEqual([secondPin]);
  });

  it("restores a failed unpin at its previous position", () => {
    const firstPin = createPinnedEvent("event-1");
    const secondPin = createPinnedEvent("event-2");
    const removal = removePinnedEvent([firstPin, secondPin], firstPin.event.id);

    expect(
      restorePinnedEvent(
        removal.pinnedEvents,
        removal.removedPinnedEvent!,
        removal.removedIndex,
      ),
    ).toEqual([firstPin, secondPin]);
  });

  it("does not duplicate an idempotent pin or rollback", () => {
    const pinnedEvent = createPinnedEvent("event-1");

    expect(addPinnedEvent([pinnedEvent], pinnedEvent)).toEqual([pinnedEvent]);
    expect(restorePinnedEvent([pinnedEvent], pinnedEvent, 0)).toEqual([
      pinnedEvent,
    ]);
  });
});

const createPinnedEvent = (eventId: string): PinnedEventResponseDto => ({
  pinnedAt: "2026-08-16T12:00:00.000Z",
  event: {
    id: eventId,
    guildId: "guild-1",
    name: eventId,
    world: "tempest",
    active: true,
    startsAt: "2026-08-16T10:00:00.000Z",
    endsAt: null,
    createdAt: "2026-08-16T09:00:00.000Z",
    updatedAt: "2026-08-16T09:00:00.000Z",
    heroNpcs: [],
  },
});
