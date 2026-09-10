import type { ReactElement } from "react";
import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getUsersControllerGetCurrentUserGuildsQueryKey,
  type MyReservationsResponseDtoItemsItem,
} from "@lootlog/client/main";
import { initializeTestTranslations } from "@/lib/testing/i18n";
// @vitest-environment happy-dom

import { simulateLoadedImages } from "@/lib/testing/images";
import {
  waitFor,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { MyReservationListItem } from "./my-reservation-list-item";

const guildIconUrl =
  "https://cdn.discordapp.com/icons/guild-1/current-guild-icon.webp";

await initializeTestTranslations({
  "reservations.my.open": "Otwórz rezerwację na {{spot}}",
  "reservations.my.cancel": "Anuluj rezerwację na {{spot}}",
  "reservations.my.edit": "Edytuj rezerwację na {{spot}}",
  "reservations.details.cancel": "Anuluj rezerwację",
});

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

const RouterWrapper = await createOrganizationTestWrapper();

const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, retry: false, gcTime: Infinity },
  },
});

client.setQueryData(getUsersControllerGetCurrentUserGuildsQueryKey(), [
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
]);

const renderItem = (ui: ReactElement) =>
  render(ui, {
    wrapper: ({ children }) => (
      <RouterWrapper>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </RouterWrapper>
    ),
  });

beforeEach(simulateLoadedImages);

afterEach(() => vi.restoreAllMocks());

describe("MyReservationListItem", () => {
  afterEach(cleanup);

  it("uses the current Discord guild avatar when the reservation snapshot has none", async () => {
    const { container } = renderItem(
      <MyReservationListItem reservation={reservation} />,
    );

    await waitFor(() =>
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        guildIconUrl,
      ),
    );
  });

  it("keeps the reservation link as the only navigation focus target", () => {
    renderItem(<MyReservationListItem reservation={reservation} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("aria-label")).toContain("ZGARBIENI");
    expect(link.querySelector('[tabindex="0"], a, button')).toBeNull();
    fireEvent.focus(link);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("makes the reservation row a link to its calendar", () => {
    renderItem(<MyReservationListItem reservation={reservation} />);

    const link = screen.getByRole("link", {
      name: "Otwórz rezerwację na potepione-zamczysko — ZGARBIENI",
    });

    expect(link.getAttribute("href")).toBe(
      reservation.sourceOrganization.calendarPath,
    );
  });

  it("shows the cancel action for a cancellable upcoming reservation", () => {
    const onCancel = vi.fn();
    renderItem(
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
    renderItem(
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
