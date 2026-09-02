// @vitest-environment happy-dom

import { cleanup, fireEvent, render } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReservationSettings } from "@lootlog/domain/reservations";
import { HEADER_HEIGHT, LABEL_COLUMN_WIDTH, MIN_ROW_HEIGHT } from "./constants";
import { DesktopWeekSchedule } from "./desktop-week-schedule";
import type { ReservationSegment } from "./types";

vi.mock("@lootlog/ui/components/scroll-area", () => ({
  ScrollArea: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const settings = {
  reservationMaxDurationMinutes: 180,
  reservationMinDurationMinutes: 30,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 3,
} satisfies ReservationSettings;

const createSegment = (dayIdx = 3): ReservationSegment => {
  const startsAt = new Date(2026, 0, 8, 10, 0);
  const endsAt = new Date(2026, 0, 8, 11, 0);
  return {
    id: `reservation-${dayIdx}`,
    dayIdx,
    startHour: 10,
    durationHours: 1,
    segmentStart: startsAt,
    segmentEnd: endsAt,
    isReservationStart: true,
    lane: 0,
    laneCount: 1,
    reservation: {
      id: 1,
      spotId: "driady",
      spotName: "Driady",
      startsAt,
      endsAt,
      createdAt: startsAt,
      comment: null,
      author: { displayName: "Alderaan", avatarUrl: null },
      sourceOrganization: {
        name: "Zgarbieni",
        iconUrl: null,
        isCurrent: true,
        calendarPath: "/zgarbieni/reservations/driady",
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
    },
  };
};

const renderEmptySchedule = () => {
  const onRangeSelect = vi.fn();
  const { container } = render(
    <DesktopWeekSchedule
      weekStart={new Date(2026, 0, 5)}
      segments={[]}
      settings={settings}
      onRangeSelect={onRangeSelect}
      onReservationSelect={vi.fn()}
    />,
  );
  const grid = container.querySelector(".grid");
  expect(grid).toBeInstanceOf(HTMLDivElement);
  if (!(grid instanceof HTMLDivElement)) {
    throw new TypeError("Expected the desktop schedule grid to render");
  }
  vi.spyOn(grid, "getBoundingClientRect").mockReturnValue(
    new DOMRect(
      0,
      0,
      LABEL_COLUMN_WIDTH + 700,
      HEADER_HEIGHT + 24 * MIN_ROW_HEIGHT,
    ),
  );
  return { container, grid, onRangeSelect };
};

const moveSelection = (
  grid: HTMLDivElement,
  start: { day: number; minutes: number },
  end: { day: number; minutes: number },
) => {
  const toPointerCoordinates = (point: { day: number; minutes: number }) => ({
    clientX: LABEL_COLUMN_WIDTH + point.day * 100 + 10,
    clientY: HEADER_HEIGHT + (point.minutes / 60) * MIN_ROW_HEIGHT + 1,
  });
  fireEvent.pointerDown(grid, {
    button: 0,
    ...toPointerCoordinates(start),
    pointerId: 1,
    pointerType: "mouse",
  });
  fireEvent.pointerMove(grid, {
    ...toPointerCoordinates(end),
    pointerId: 1,
    pointerType: "mouse",
  });
};

describe("DesktopWeekSchedule", () => {
  it("renders only segments from the visible week", () => {
    const { container } = render(
      <DesktopWeekSchedule
        weekStart={new Date(2026, 0, 5)}
        segments={[createSegment(-1), createSegment(3), createSegment(7)]}
        settings={settings}
        onRangeSelect={vi.fn()}
        onReservationSelect={vi.fn()}
      />,
    );

    expect(container.querySelectorAll(".reservation-card")).toHaveLength(1);
  });

  it("uses a blocked cursor over past slots and a crosshair over future slots", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 7, 12, 0));

    const { container } = render(
      <DesktopWeekSchedule
        weekStart={new Date(2026, 0, 5)}
        segments={[]}
        settings={settings}
        onRangeSelect={vi.fn()}
        onReservationSelect={vi.fn()}
      />,
    );
    const grid = container.querySelector(".grid");
    expect(grid).toBeInstanceOf(HTMLDivElement);
    if (!(grid instanceof HTMLDivElement)) return;

    vi.spyOn(grid, "getBoundingClientRect").mockReturnValue(
      new DOMRect(
        0,
        0,
        LABEL_COLUMN_WIDTH + 700,
        HEADER_HEIGHT + 24 * MIN_ROW_HEIGHT,
      ),
    );

    fireEvent.pointerMove(grid, {
      clientX: LABEL_COLUMN_WIDTH + 10,
      clientY: HEADER_HEIGHT + 10,
    });
    expect(grid.classList.contains("cursor-not-allowed")).toBe(true);

    fireEvent.pointerMove(grid, {
      clientX: LABEL_COLUMN_WIDTH + 310,
      clientY: HEADER_HEIGHT + 10,
    });
    expect(grid.classList.contains("cursor-crosshair")).toBe(true);
  });

  it("uses the first outside click only to dismiss an open context menu", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 7, 12, 0));
    const onRangeSelect = vi.fn();
    const { container } = render(
      <DesktopWeekSchedule
        weekStart={new Date(2026, 0, 5)}
        segments={[createSegment()]}
        settings={settings}
        onRangeSelect={onRangeSelect}
        onReservationSelect={vi.fn()}
      />,
    );
    const grid = container.querySelector(".grid");
    const reservationBlock = container.querySelector(".reservation-card");
    expect(grid).toBeInstanceOf(HTMLDivElement);
    expect(reservationBlock).toBeInstanceOf(HTMLButtonElement);
    if (
      !(grid instanceof HTMLDivElement) ||
      !(reservationBlock instanceof HTMLButtonElement)
    ) {
      return;
    }
    vi.spyOn(grid, "getBoundingClientRect").mockReturnValue(
      new DOMRect(
        0,
        0,
        LABEL_COLUMN_WIDTH + 700,
        HEADER_HEIGHT + 24 * MIN_ROW_HEIGHT,
      ),
    );

    fireEvent.contextMenu(reservationBlock);
    expect(
      document.querySelector('[data-slot="context-menu-content"]'),
    ).not.toBeNull();

    fireEvent.pointerDown(grid, {
      button: 0,
      clientX: LABEL_COLUMN_WIDTH + 410,
      clientY: HEADER_HEIGHT + 14 * MIN_ROW_HEIGHT + 1,
      pointerId: 2,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(grid, {
      button: 0,
      clientX: LABEL_COLUMN_WIDTH + 410,
      clientY: HEADER_HEIGHT + 14 * MIN_ROW_HEIGHT + 1,
      pointerId: 2,
      pointerType: "mouse",
    });

    expect(onRangeSelect).not.toHaveBeenCalled();
  });

  it("selects the maximum allowed range across midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 4, 12, 0));
    const { container, grid, onRangeSelect } = renderEmptySchedule();
    moveSelection(
      grid,
      { day: 0, minutes: 23 * 60 },
      { day: 1, minutes: 23 * 60 },
    );

    expect(
      container.querySelectorAll(
        ".pointer-events-none.absolute.z-20.rounded-md",
      ),
    ).toHaveLength(2);

    fireEvent.pointerUp(grid, { pointerId: 1, pointerType: "mouse" });

    expect(onRangeSelect).toHaveBeenCalledWith({
      startsAt: new Date(2026, 0, 5, 23, 0),
      endsAt: new Date(2026, 0, 6, 2, 0),
    });
  });

  it("selects a range across midnight when dragging backwards", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 4, 12, 0));
    const { container, grid, onRangeSelect } = renderEmptySchedule();
    moveSelection(grid, { day: 1, minutes: 60 }, { day: 0, minutes: 23 * 60 });

    expect(
      container.querySelectorAll(
        ".pointer-events-none.absolute.z-20.rounded-md",
      ),
    ).toHaveLength(2);

    fireEvent.pointerUp(grid, { pointerId: 1, pointerType: "mouse" });

    expect(onRangeSelect).toHaveBeenCalledWith({
      startsAt: new Date(2026, 0, 5, 23, 0),
      endsAt: new Date(2026, 0, 6, 1, 15),
    });
  });

  it("keeps same-day range selection unchanged", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 4, 12, 0));
    const { container, grid, onRangeSelect } = renderEmptySchedule();
    moveSelection(
      grid,
      { day: 0, minutes: 10 * 60 },
      { day: 0, minutes: 10 * 60 + 45 },
    );

    expect(
      container.querySelectorAll(
        ".pointer-events-none.absolute.z-20.rounded-md",
      ),
    ).toHaveLength(1);

    fireEvent.pointerUp(grid, { pointerId: 1, pointerType: "mouse" });

    expect(onRangeSelect).toHaveBeenCalledWith({
      startsAt: new Date(2026, 0, 5, 10, 0),
      endsAt: new Date(2026, 0, 5, 11, 0),
    });
  });
});
