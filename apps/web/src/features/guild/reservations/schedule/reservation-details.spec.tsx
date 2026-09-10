import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getUsersControllerGetCurrentUserGuildsQueryKey } from "@lootlog/client/main";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { ReservationDetails } from "./reservation-details";
import type { NormalizedReservation } from "./normalize-reservation";

await initializeTestTranslations();

const RouterWrapper = await createOrganizationTestWrapper();

const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, retry: false, gcTime: Infinity },
  },
});

client.setQueryData(getUsersControllerGetCurrentUserGuildsQueryKey(), []);

const wrapper = ({ children }: React.PropsWithChildren) => (
  <RouterWrapper>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  </RouterWrapper>
);

beforeEach(() => vi.stubGlobal("innerWidth", 390));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const reservation: NormalizedReservation = {
  id: 1,
  spotId: "driady",
  spotName: "Driady",
  startsAt: new Date("2026-08-26T10:00:00.000Z"),
  endsAt: new Date("2026-08-26T11:00:00.000Z"),
  createdAt: new Date("2026-08-25T10:00:00.000Z"),
  comment: null,
  author: { displayName: "Wild", avatarUrl: null },
  sourceOrganization: {
    name: "ZGARBIENI - EVENTOWY",
    iconUrl: null,
    isCurrent: true,
    calendarPath: "/zgarbienieventowy/reservations/driady",
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

describe("ReservationDetails", () => {
  it("opens reservation details after starting closed and can reopen them", async () => {
    const props = {
      guildId: "guild-id",
      spotId: "driady",
      onOpenChange: vi.fn(),
    };

    const { rerender } = render(
      <ReservationDetails {...props} reservation={null} />,
      { wrapper },
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<ReservationDetails {...props} reservation={reservation} />);
    expect(await screen.findByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    rerender(<ReservationDetails {...props} reservation={null} />);
    rerender(<ReservationDetails {...props} reservation={reservation} />);
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: "common.cancel" })).toBeTruthy();
  });

  it("always renders a bordered footer with a dismiss action", () => {
    const onOpenChange = vi.fn();
    render(
      <ReservationDetails
        guildId="guild-id"
        spotId="driady"
        reservation={{ ...reservation, canCancel: false }}
        onOpenChange={onOpenChange}
      />,
      { wrapper },
    );

    const dismissButton = screen.getByRole("button", {
      name: "common.cancel",
    });

    const footer = dismissButton.closest("footer");
    expect(footer?.classList.contains("border-t")).toBe(true);
    expect(
      screen.queryByRole("button", {
        name: "reservations.details.cancel",
      }),
    ).toBeNull();

    fireEvent.click(dismissButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
