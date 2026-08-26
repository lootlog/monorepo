// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RESERVATION_SETTINGS } from "./reservation-settings";
import { ScheduleHeader } from "./schedule-header";

const navigate = vi.fn<(options: { to: string }) => void>();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "reservations.schedule.header.actions": "Akcje kalendarza rezerwacji",
        "reservations.schedule.header.addReservation": "Dodaj rezerwację",
        "reservations.schedule.header.findNearestSlot":
          "Znajdź najbliższy wolny termin",
        "reservations.schedule.header.findingNearestSlot":
          "Szukanie wolnego terminu",
        "reservations.schedule.header.info": "Zasady rezerwacji",
        "reservations.schedule.header.settings": "Ustawienia rezerwacji",
        "reservations.schedule.header.today": "Dzisiaj",
      };

      return translations[key] ?? key;
    },
  }),
}));

afterEach(() => {
  cleanup();
  navigate.mockReset();
});

const renderHeader = ({
  canManageReservationSettings = true,
  isCompact,
  isFindingNearestFreeSlot = false,
}: {
  canManageReservationSettings?: boolean;
  isCompact: boolean;
  isFindingNearestFreeSlot?: boolean;
}) => {
  const onAddReservation = vi.fn<() => void>();
  const onFindNearestFreeSlot = vi.fn<() => void>();
  const onToday = vi.fn<() => void>();

  const result = render(
    <ScheduleHeader
      date={new Date(2026, 7, 26)}
      isCompact={isCompact}
      settings={DEFAULT_RESERVATION_SETTINGS}
      settingsHref="/guild/settings/reservations"
      canManageReservationSettings={canManageReservationSettings}
      isFindingNearestFreeSlot={isFindingNearestFreeSlot}
      onPrevious={vi.fn<() => void>()}
      onNext={vi.fn<() => void>()}
      onToday={onToday}
      onFindNearestFreeSlot={onFindNearestFreeSlot}
      onAddReservation={onAddReservation}
    />,
  );

  return { ...result, onAddReservation, onFindNearestFreeSlot, onToday };
};

describe("ScheduleHeader", () => {
  it("moves every compact action into a rounded floating toolbar", () => {
    const { container, onAddReservation, onFindNearestFreeSlot, onToday } =
      renderHeader({ isCompact: true });
    const header = container.querySelector("header");
    const toolbar = screen.getByRole("toolbar", {
      name: "Akcje kalendarza rezerwacji",
    });
    const dock = toolbar.closest('[data-slot="schedule-action-dock"]');

    expect(header?.contains(toolbar)).toBe(false);
    expect(dock?.className).toContain("pointer-events-none");
    expect(dock?.className).toContain("absolute");
    expect(dock?.className).toContain("inset-x-0");
    expect(dock?.className).toContain("bottom-0");
    expect(toolbar.className).toContain("pointer-events-auto");
    expect(toolbar.className).toContain("rounded-xl");
    expect(toolbar.className).toContain("border");
    expect(toolbar.className).toContain("shadow-lg");

    const actions = within(toolbar).getAllByRole("button");
    expect(actions.map((action) => action.getAttribute("aria-label"))).toEqual([
      "Dzisiaj",
      "Znajdź najbliższy wolny termin",
      "Zasady rezerwacji",
      "Ustawienia rezerwacji",
      "Dodaj rezerwację",
    ]);
    for (const action of actions) expect(action.className).toContain("size-11");

    const [
      todayAction,
      nearestSlotAction,
      _infoAction,
      settingsAction,
      addAction,
    ] = actions;
    if (!todayAction || !nearestSlotAction || !settingsAction || !addAction) {
      throw new Error("Expected every compact schedule action");
    }
    expect(todayAction.className).not.toContain("border border-input");

    fireEvent.click(todayAction);
    fireEvent.click(nearestSlotAction);
    fireEvent.click(settingsAction);
    fireEvent.click(addAction);
    expect(onToday).toHaveBeenCalledOnce();
    expect(onFindNearestFreeSlot).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith({
      to: "/guild/settings/reservations",
    });
    expect(onAddReservation).toHaveBeenCalledOnce();
  });

  it("keeps the toolbar in the header for the wide layout", () => {
    const { container } = renderHeader({ isCompact: false });
    const header = container.querySelector("header");
    const toolbar = screen.getByRole("toolbar", {
      name: "Akcje kalendarza rezerwacji",
    });

    expect(header?.contains(toolbar)).toBe(true);
    expect(
      within(toolbar).getByRole("button", { name: "Dzisiaj" }).className,
    ).toContain("border border-input");
    expect(
      container.querySelector('[data-slot="schedule-action-dock"]'),
    ).toBeNull();
  });

  it("announces date changes without changing the navigation controls", () => {
    const { container } = renderHeader({ isCompact: true });
    const dateLabel = container.querySelector("header p");

    expect(dateLabel?.getAttribute("aria-live")).toBe("polite");
    expect(
      screen.getByRole("button", {
        name: "reservations.schedule.header.previousDay",
      }),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", {
        name: "reservations.schedule.header.nextDay",
      }),
    ).not.toBeNull();
  });

  it("centers compact date navigation across the full header width", () => {
    const { container } = renderHeader({ isCompact: true });
    const dateNavigation = container.querySelector(
      '[data-slot="schedule-date-navigation"]',
    );

    expect(dateNavigation?.className).toContain("w-full");
    expect(dateNavigation?.className).toContain("grid");
    expect(dateNavigation?.className).toContain(
      "grid-cols-[2.75rem_minmax(0,1fr)_2.75rem]",
    );
    expect(dateNavigation?.className).not.toContain("w-48");
  });

  it("omits settings from the compact dock without management access", () => {
    renderHeader({
      canManageReservationSettings: false,
      isCompact: true,
    });
    const toolbar = screen.getByRole("toolbar", {
      name: "Akcje kalendarza rezerwacji",
    });

    expect(
      within(toolbar).queryByRole("button", {
        name: "Ustawienia rezerwacji",
      }),
    ).toBeNull();
    expect(within(toolbar).getAllByRole("button")).toHaveLength(4);
  });

  it("disables the nearest-slot action while searching", () => {
    renderHeader({ isCompact: true, isFindingNearestFreeSlot: true });

    const action = screen.getByRole("button", {
      name: "Szukanie wolnego terminu",
    });
    expect(action.hasAttribute("disabled")).toBe(true);
    expect(action.getAttribute("aria-busy")).toBe("true");
  });
});
