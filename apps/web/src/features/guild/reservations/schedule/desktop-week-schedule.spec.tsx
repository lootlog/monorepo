// @vitest-environment happy-dom

import { cleanup, fireEvent, render } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

const createSegment = (): ReservationSegment => {
  const startsAt = new Date(2026, 0, 8, 10, 0);
  const endsAt = new Date(2026, 0, 8, 11, 0);
  return {
    id: "reservation-1",
    dayIdx: 3,
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

describe("DesktopWeekSchedule", () => {
  it("uses a blocked cursor over past slots and a crosshair over future slots", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 7, 12, 0));

    const { container } = render(
      <DesktopWeekSchedule
        weekStart={new Date(2026, 0, 5)}
        segments={[]}
        minuteStep={15}
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
        minuteStep={15}
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
});
