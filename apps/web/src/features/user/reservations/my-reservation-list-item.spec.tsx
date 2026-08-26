// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MyReservationsResponseDtoItemsItem } from "@lootlog/api-client/models/main/my-reservations-response-dto-items-item";
import { MyReservationListItem } from "./my-reservation-list-item";

const guildIconUrl =
  "https://cdn.discordapp.com/icons/guild-1/current-guild-icon.webp";

vi.mock("@lootlog/api-client/react-query/main/users", () => ({
  useUsersControllerGetCurrentUserGuilds: () => ({
    data: [
      {
        id: "guild-1",
        name: "ZGARBIENI",
        icon: guildIconUrl,
        vanityUrl: "zgarbieni",
        ownerId: "owner-1",
        publicStatsCardEnabled: true,
        hasLootlogAccess: true,
        isAccessDataStale: false,
      },
    ],
  }),
}));

vi.mock("@lootlog/ui/components/avatar", () => ({
  Avatar: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: ComponentProps<"a"> & { to: string }) => (
    <a {...props} href={to}>
      {children}
    </a>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: { spot?: string }) => {
      if (key === "reservations.my.open") {
        return `Otwórz rezerwację na ${values?.spot}`;
      }
      if (key === "reservations.my.cancel") {
        return `Anuluj rezerwację na ${values?.spot}`;
      }
      if (key === "reservations.my.edit") {
        return `Edytuj rezerwację na ${values?.spot}`;
      }
      if (key === "reservations.details.cancel") {
        return "Anuluj rezerwację";
      }
      return key;
    },
  }),
}));

const reservation: MyReservationsResponseDtoItemsItem = {
  id: 1,
  spotId: "potepione-zamczysko",
  spotName: "potepione-zamczysko",
  startsAt: "2026-08-15T16:30:00.000Z",
  endsAt: "2026-08-15T19:00:00.000Z",
  comment: null,
  createdAt: "2026-08-01T12:00:00.000Z",
  author: { displayName: "Wild", avatarUrl: null },
  sourceOrganization: {
    name: "ZGARBIENI",
    iconUrl: null,
    isCurrent: false,
    calendarPath: "/zgarbieni/reservations/potepione-zamczysko",
  },
  isMine: true,
  canEdit: true,
  canCancel: true,
  editingConstraints: {
    reservationMaxDurationMinutes: 180,
    reservationMinDurationMinutes: 30,
    reservationTimeGranularityMinutes: 15,
    reservationMaxAdvanceDays: 7,
  },
  reminderMinutesBefore: null,
};

describe("MyReservationListItem", () => {
  afterEach(cleanup);

  it("uses the current Discord guild avatar when the reservation snapshot has none", () => {
    const { container } = render(
      <MyReservationListItem reservation={reservation} />,
    );

    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      guildIconUrl,
    );
  });

  it("makes the reservation row a link to its calendar", () => {
    render(<MyReservationListItem reservation={reservation} />);

    const link = screen.getByRole("link", {
      name: "Otwórz rezerwację na potepione-zamczysko",
    });

    expect(link.getAttribute("href")).toBe(
      reservation.sourceOrganization.calendarPath,
    );
  });

  it("shows the cancel action for a cancellable upcoming reservation", () => {
    const onCancel = vi.fn();
    render(
      <MyReservationListItem
        reservation={reservation}
        showCancel
        onCancel={onCancel}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Anuluj rezerwację na potepione-zamczysko",
      }),
    );

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("exposes compact icon actions for editing and cancellation", () => {
    const onEdit = vi.fn();
    const onCancel = vi.fn();
    render(
      <MyReservationListItem
        reservation={reservation}
        showEdit
        showCancel
        onEdit={onEdit}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Edytuj rezerwację na potepione-zamczysko",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Anuluj rezerwację na potepione-zamczysko",
      }),
    );

    expect(onEdit).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.queryByText("Anuluj rezerwację")).toBeNull();
  });
});
