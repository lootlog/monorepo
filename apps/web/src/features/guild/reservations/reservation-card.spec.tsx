// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReservationSpotsResponseDtoItem } from "@lootlog/api-client/models/main/reservation-spots-response-dto-item";
import { ReservationCard } from "./reservation-card";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "reservations.card.freeNow": "Wolne teraz",
        "reservations.card.noneDescription": "Kliknij, aby wybrać termin",
        "reservations.card.partnerBadge": "Sojusz",
        "reservations.card.pin": "Przypnij expowisko",
        "reservations.card.occupied": "Zajęte teraz",
        "reservations.card.next": "Najbliższa rezerwacja",
        "reservations.card.level": "Poziom",
        "reservations.card.open": "Otwórz rezerwacje",
      };
      return translations[key] ?? key;
    },
  }),
}));

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
  it("shows a pointer cursor for the clickable card surface", () => {
    render(
      <ReservationCard spot={spot} onOpen={vi.fn()} onPinChange={vi.fn()} />,
    );

    expect(
      screen.getByRole("button", { name: "Otwórz rezerwacje" }).classList,
    ).toContain("cursor-pointer");
  });

  it("places the pin action between the alliance badge and chevron", () => {
    const onPinChange = vi.fn();
    const { container } = render(
      <ReservationCard
        spot={spot}
        onOpen={vi.fn()}
        onPinChange={onPinChange}
      />,
    );
    const actions = container.querySelector(
      '[data-slot="reservation-card-actions"]',
    );

    expect(actions?.children).toHaveLength(3);
    expect(actions?.children[0]?.textContent).toBe("Sojusz");
    expect(actions?.children[1]?.tagName).toBe("BUTTON");
    expect(actions?.children[2]?.getAttribute("data-slot")).toBe(
      "reservation-card-chevron",
    );

    fireEvent.click(screen.getByRole("button", { name: "Przypnij expowisko" }));
    expect(onPinChange).toHaveBeenCalledWith(true);
  });

  it("uses the same star treatment as event pin actions", () => {
    const { container, rerender } = render(
      <ReservationCard spot={spot} onOpen={vi.fn()} onPinChange={vi.fn()} />,
    );
    const unpinnedIcon = container.querySelector(
      '[data-slot="reservation-card-pin-icon"]',
    );

    expect(unpinnedIcon?.classList.contains("text-yellow-500")).toBe(true);
    expect(unpinnedIcon?.classList.contains("fill-yellow-500")).toBe(false);

    rerender(
      <ReservationCard
        spot={{ ...spot, isPinned: true }}
        onOpen={vi.fn()}
        onPinChange={vi.fn()}
      />,
    );
    const pinnedIcon = container.querySelector(
      '[data-slot="reservation-card-pin-icon"]',
    );

    expect(pinnedIcon?.classList.contains("fill-yellow-500")).toBe(true);
    expect(pinnedIcon?.classList.contains("text-yellow-500")).toBe(true);
  });

  it("keeps occupied status with the next reservation to two text rows", () => {
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
    const { container } = render(
      <ReservationCard
        spot={occupiedSpot}
        onOpen={vi.fn()}
        onPinChange={vi.fn()}
      />,
    );
    const statusLines = container.querySelector(
      '[data-slot="reservation-card-status-lines"]',
    );

    expect(statusLines?.children).toHaveLength(2);
    expect(statusLines?.children[0]?.textContent).toContain("goat");
    expect(statusLines?.children[1]?.textContent).toContain("Dominik v2");
  });
});
