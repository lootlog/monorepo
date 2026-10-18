import { RouterProvider } from "@tanstack/react-router";
import { createOrganizationTestRouter } from "@/lib/testing/router";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RESERVATION_SETTINGS } from "@lootlog/domain/reservations";
import { ScheduleHeader } from "./schedule-header";

await initializeTestTranslations({
  "reservations.schedule.header.actions": "Akcje kalendarza rezerwacji",
  "reservations.schedule.header.addReservation": "Dodaj rezerwację",
  "reservations.schedule.header.findNearestSlot":
    "Znajdź najbliższy wolny termin",
  "reservations.schedule.header.findingNearestSlot": "Szukanie wolnego terminu",
  "reservations.schedule.header.info": "Zasady rezerwacji",
  "reservations.schedule.header.settings": "Ustawienia rezerwacji",
  "reservations.schedule.header.today": "Dzisiaj",
});

afterEach(() => {
  cleanup();
});

const renderHeader = async ({
  canManageReservationSettings = true,
  date = new Date(2026, 7, 26),
  isCompact,
  isFindingNearestFreeSlot = false,
}: {
  canManageReservationSettings?: boolean;
  date?: Date;
  isCompact: boolean;
  isFindingNearestFreeSlot?: boolean;
}) => {
  const onAddReservation = vi.fn<() => void>();
  const onFindNearestFreeSlot = vi.fn<() => void>();
  const onToday = vi.fn<() => void>();

  const router = createOrganizationTestRouter(
    <ScheduleHeader
      date={date}
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

  await router.load();
  const result = render(<RouterProvider router={router} />);

  return {
    ...result,
    router,
    onAddReservation,
    onFindNearestFreeSlot,
    onToday,
  };
};

describe("ScheduleHeader", () => {
  it("moves every compact action into the floating dock", async () => {
    const {
      container,
      router,
      onAddReservation,
      onFindNearestFreeSlot,
      onToday,
    } = await renderHeader({ isCompact: true });

    const header = container.querySelector("header");

    const toolbar = screen.getByRole("toolbar", {
      name: "Akcje kalendarza rezerwacji",
    });

    expect(header?.contains(toolbar)).toBe(false);
    expect(
      toolbar.closest('[data-slot="schedule-action-dock"]'),
    ).not.toBeNull();

    const actions = within(toolbar).getAllByRole("button");
    expect(actions.map((action) => action.getAttribute("aria-label"))).toEqual([
      "Dzisiaj",
      "Zasady rezerwacji",
      "Ustawienia rezerwacji",
      "Znajdź najbliższy wolny termin",
      "Dodaj rezerwację",
    ]);

    const [todayAction, , settingsAction, nearestSlotAction, addAction] =
      actions;

    if (!todayAction || !nearestSlotAction || !settingsAction || !addAction) {
      throw new Error("Expected every compact schedule action");
    }

    fireEvent.click(todayAction);
    fireEvent.click(nearestSlotAction);
    fireEvent.click(settingsAction);
    fireEvent.click(addAction);
    expect(onToday).toHaveBeenCalledOnce();
    expect(onFindNearestFreeSlot).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        "/guild/settings/reservations",
      ),
    );
    expect(onAddReservation).toHaveBeenCalledOnce();
  });

  it("keeps the actions in the header for the wide layout, with today beside the week arrows", async () => {
    const { container } = await renderHeader({ isCompact: false });
    const header = container.querySelector("header");

    const toolbar = screen.getByRole("toolbar", {
      name: "Akcje kalendarza rezerwacji",
    });

    expect(header?.contains(toolbar)).toBe(true);
    expect(
      within(
        container.querySelector('[data-slot="schedule-date-navigation"]')!,
      ).getByRole("button", { name: "Dzisiaj" }),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="schedule-action-dock"]'),
    ).toBeNull();
  });

  it("disables today while the visible week already holds it", async () => {
    await renderHeader({ date: new Date(), isCompact: false });

    expect(
      screen.getByRole("button", { name: "Dzisiaj" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("announces date changes without changing the navigation controls", async () => {
    const { container } = await renderHeader({ isCompact: true });
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

  it("centers compact date navigation across the full header width", async () => {
    const { container } = await renderHeader({ isCompact: true });

    const dateNavigation = container.querySelector(
      '[data-slot="schedule-date-navigation"]',
    );

    expect(dateNavigation?.className).toContain("w-full");
    expect(dateNavigation?.className).toContain("grid");
    expect(dateNavigation?.className).toContain(
      "grid-cols-[2.5rem_minmax(0,1fr)_2.5rem]",
    );
    expect(dateNavigation?.className).not.toContain("w-48");
  });

  it("omits settings from the compact dock without management access", async () => {
    await renderHeader({
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

  it("disables the nearest-slot action while searching", async () => {
    await renderHeader({ isCompact: true, isFindingNearestFreeSlot: true });

    const action = screen.getByRole("button", {
      name: "Znajdź najbliższy wolny termin",
    });

    expect(action.hasAttribute("disabled")).toBe(true);
    expect(action.getAttribute("aria-busy")).toBe("true");
  });
});
