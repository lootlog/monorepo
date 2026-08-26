import { describe, expect, it } from "vitest";
import type { ReservationSpotsResponseDtoItem } from "@lootlog/api-client/models/main/reservation-spots-response-dto-item";
import {
  getVisibleReservationSpots,
  setReservationSpotPinned,
} from "./reservation-spots";

const createSpot = (
  id: string,
  options: Partial<ReservationSpotsResponseDtoItem> = {},
): ReservationSpotsResponseDtoItem =>
  ({
    id,
    name: id,
    level: 100,
    images: [],
    maps: [],
    isPinned: false,
    isAvailableNow: false,
    availableUntil: null,
    activeReservationCount: 0,
    hasPartnerReservations: false,
    currentReservation: null,
    nextReservation: null,
    ...options,
  }) as ReservationSpotsResponseDtoItem;

describe("reservation spot presentation", () => {
  const spots = [
    createSpot("zajete", { level: 300 }),
    createSpot("wolne", { level: 200, isAvailableNow: true }),
    createSpot("przypiete", { level: 50, isPinned: true }),
    createSpot("partner", { level: 400, hasPartnerReservations: true }),
  ];

  it("sorts pinned first, then by level and name regardless of availability", () => {
    expect(
      getVisibleReservationSpots(spots, "", "all").map(({ id }) => id),
    ).toEqual(["przypiete", "partner", "zajete", "wolne"]);
  });

  it.each([
    ["available", ["wolne"]],
    ["pinned", ["przypiete"]],
    ["partners", ["partner"]],
  ] as const)("applies the %s filter", (filter, expectedIds) => {
    expect(
      getVisibleReservationSpots(spots, "", filter).map(({ id }) => id),
    ).toEqual(expectedIds);
  });

  it("matches Polish search text and keeps the previous value for rollback", () => {
    const searchable = [
      createSpot("potepione", { name: "Potępione Zamczysko" }),
      createSpot("grota", { name: "Grota Szeptów" }),
    ];
    const previous = searchable;
    const optimistic = setReservationSpotPinned(searchable, "potepione", true);

    expect(
      getVisibleReservationSpots(searchable, "potępione", "all").map(
        ({ id }) => id,
      ),
    ).toEqual(["potepione"]);
    expect(optimistic?.[0]?.isPinned).toBe(true);
    expect(previous[0]?.isPinned).toBe(false);
  });
});
