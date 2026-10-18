// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReservationSpotsResponseDtoItem } from "@lootlog/client/main";
import { ReservationCard } from "./reservation-card";

await initializeTestTranslations({
  "reservations.card.freeNow": "Wolne teraz",
  "reservations.card.partnerBadge": "Sojusz",
  "reservations.card.pin": "Przypnij expowisko",
  "reservations.card.occupiedUntil": "Zajęte do",
  "reservations.card.next": "Następna rezerwacja",
  "reservations.card.level": "lvl",
  "reservations.card.open": "Terminy expowiska",
});

afterEach(cleanup);

const spot: ReservationSpotsResponseDtoItem = {
  id: "driady",
  name: "Driady",
  level: 284,
  images: [],
  maps: [],
  isPinned: false,
  isAvailableNow: true,
  availableUntil: null,
  activeReservationCount: 0,
  hasPartnerReservations: true,
  currentReservation: null,
  nextReservation: null,
};

describe("ReservationCard", () => {
  it("pins the spot from its pin button", () => {
    const onPinChange = vi.fn();
    const onOpen = vi.fn();

    render(
      <ReservationCard spot={spot} onOpen={onOpen} onPinChange={onPinChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Przypnij expowisko" }));
    expect(onPinChange).toHaveBeenCalledWith(true);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("names who holds an occupied spot and who reserved it next", () => {
    const occupiedSpot: ReservationSpotsResponseDtoItem = {
      ...spot,
      isAvailableNow: false,
      currentReservation: {
        id: 1,
        spotId: "driady",
        spotName: "Driady",
        author: { displayName: "goat", avatarUrl: null },
        startsAt: "2026-08-29T18:00:00.000Z",
        endsAt: "2026-08-29T20:00:00.000Z",
        comment: null,
        createdAt: "2026-08-29T17:00:00.000Z",
        sourceOrganization: {
          name: "ZGARBIENI",
          iconUrl: null,
          isCurrent: true,
          calendarPath: "/zgarbieni/reservations/driady",
        },
        isMine: false,
        canEdit: false,
        canCancel: false,
        editingConstraints: null,
        reminderMinutesBefore: null,
      },
      nextReservation: {
        id: 2,
        spotId: "driady",
        spotName: "Driady",
        author: {
          displayName: "Dominik v2",
          avatarUrl: null,
        },
        startsAt: "2026-08-30T18:00:00.000Z",
        endsAt: "2026-08-30T20:00:00.000Z",
        comment: null,
        createdAt: "2026-08-29T17:00:00.000Z",
        sourceOrganization: {
          name: "ZGARBIENI",
          iconUrl: null,
          isCurrent: true,
          calendarPath: "/zgarbieni/reservations/driady",
        },
        isMine: false,
        canEdit: false,
        canCancel: false,
        editingConstraints: null,
        reminderMinutesBefore: null,
      },
    };

    render(
      <ReservationCard
        spot={occupiedSpot}
        onOpen={vi.fn()}
        onPinChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/goat/)).toBeTruthy();
    expect(screen.getByText(/Dominik v2/)).toBeTruthy();
  });
});
