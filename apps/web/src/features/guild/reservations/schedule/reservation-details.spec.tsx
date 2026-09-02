// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReservationDetails } from "./reservation-details";
import type { NormalizedReservation } from "./normalize-reservation";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  getListReservationSpotsQueryKey: () => [],
  getListSpotReservationsQueryKey: () => [],
  useDeleteReservation: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock("@lootlog/ui/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("@lootlog/ui/components/drawer", () => ({
  Drawer: ({ children, open }: PropsWithChildren<{ open: boolean }>) => (
    <div data-testid="drawer-root" data-open={String(open)}>
      {children}
    </div>
  ),
  DrawerContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DrawerDescription: ({ children }: PropsWithChildren) => <p>{children}</p>,
  DrawerHeader: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DrawerTitle: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@/components/reservation-organization-badge", () => ({
  ReservationOrganizationBadge: ({ name }: { name: string }) => (
    <span>{name}</span>
  ),
}));

vi.mock(
  "@/features/user/reservations/use-reservation-organization-icon",
  () => ({
    useReservationOrganizationIcon: () => null,
  }),
);

afterEach(cleanup);

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
  it("keeps the mobile drawer mounted while its open state changes", () => {
    const props = {
      guildId: "guild-id",
      spotId: "driady",
      onOpenChange: vi.fn(),
    };
    const { rerender } = render(
      <ReservationDetails {...props} reservation={null} />,
    );

    const closedDrawer = screen.getByTestId("drawer-root");
    expect(closedDrawer.getAttribute("data-open")).toBe("false");

    rerender(<ReservationDetails {...props} reservation={reservation} />);

    expect(screen.getByTestId("drawer-root")).toBe(closedDrawer);
    expect(closedDrawer.getAttribute("data-open")).toBe("true");
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
