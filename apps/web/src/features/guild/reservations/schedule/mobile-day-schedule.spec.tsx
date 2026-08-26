// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { PropsWithChildren, UIEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LABEL_COLUMN_WIDTH, MIN_ROW_HEIGHT } from "./constants";
import { MobileDaySchedule } from "./mobile-day-schedule";
import type { ReservationSegment } from "./types";

const motionMocks = vi.hoisted(() => {
  const motionValue = {
    get: vi.fn(() => 0),
    set: vi.fn(),
    stop: vi.fn(),
  };
  return {
    animate: vi.fn(() => Promise.resolve()),
    motionValue,
    onDragEnd: undefined as
      | ((
          event: PointerEvent,
          info: { offset: { x: number }; velocity: { x: number } },
        ) => Promise<void>)
      | undefined,
    reducedMotion: false,
  };
});

const mobileSwipeMocks = vi.hoisted(() => ({ enabled: true }));

vi.mock("./use-mobile-day-swipe", () => ({
  useMobileDaySwipe: () => mobileSwipeMocks.enabled,
}));

vi.mock("framer-motion", async () => {
  const { createElement, forwardRef } = await import("react");
  type MockMotionDivProps = PropsWithChildren<{
    className?: string;
    "data-slot"?: string;
    onDragEnd?: typeof motionMocks.onDragEnd;
  }>;
  return {
    animate: motionMocks.animate,
    motion: {
      div: forwardRef<HTMLDivElement, MockMotionDivProps>((props, ref) => {
        const { children, className, "data-slot": dataSlot, onDragEnd } = props;
        motionMocks.onDragEnd = onDragEnd;
        return createElement(
          "div",
          {
            className,
            "data-slot": dataSlot,
            ref,
          },
          children,
        );
      }),
    },
    useMotionValue: () => motionMocks.motionValue,
    useReducedMotion: () => motionMocks.reducedMotion,
  };
});

vi.mock("@lootlog/ui/components/scroll-area", () => ({
  ScrollArea: ({
    children,
    className,
    onScroll,
    orientation = "both",
  }: PropsWithChildren<{
    className?: string;
    onScroll?: (event: UIEvent<HTMLDivElement>) => void;
    orientation?: "vertical" | "horizontal" | "both";
  }>) => (
    <div data-slot="scroll-area" className={className}>
      <div data-slot="scroll-area-viewport" onScroll={onScroll}>
        {children}
      </div>
      {orientation !== "horizontal" && (
        <div data-slot="scroll-area-scrollbar" data-orientation="vertical" />
      )}
      {orientation !== "vertical" && (
        <div data-slot="scroll-area-scrollbar" data-orientation="horizontal" />
      )}
    </div>
  ),
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

const renderSchedule = (
  onRangeSelect = vi.fn(),
  segments: ReservationSegment[] = [],
  onDaySwipe = vi.fn(),
) => {
  const date = new Date(2026, 0, 8);
  const onReservationSelect = vi.fn();
  const result = render(
    <MobileDaySchedule
      date={date}
      dayIndex={3}
      segments={segments}
      defaultDurationMinutes={60}
      minuteStep={15}
      onRangeSelect={onRangeSelect}
      onReservationSelect={onReservationSelect}
      onDaySwipe={onDaySwipe}
    />,
  );
  const grid = result.container.querySelector(
    '[data-slot="mobile-day-current"] > .relative',
  );
  expect(grid).toBeInstanceOf(HTMLDivElement);
  if (!(grid instanceof HTMLDivElement)) {
    throw new Error("Reservation day grid was not rendered");
  }
  vi.spyOn(grid, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 600, 24 * MIN_ROW_HEIGHT),
  );
  return {
    ...result,
    date,
    grid,
    onDaySwipe,
    onRangeSelect,
    onReservationSelect,
  };
};

describe("MobileDaySchedule", () => {
  afterEach(() => {
    motionMocks.animate.mockClear();
    motionMocks.motionValue.get.mockClear();
    motionMocks.motionValue.set.mockClear();
    motionMocks.motionValue.stop.mockClear();
    motionMocks.onDragEnd = undefined;
    motionMocks.reducedMotion = false;
    mobileSwipeMocks.enabled = true;
  });

  it("keeps a safe scroll buffer below the final calendar hour", () => {
    const { container } = renderSchedule();
    const scrollContent = container.querySelector(
      '[data-slot="compact-schedule-scroll-content"]',
    );

    expect(scrollContent?.className).toContain(
      "pb-[calc(5rem+env(safe-area-inset-bottom))]",
    );
  });

  it("prevents the day track from becoming a native horizontal scroll area", () => {
    const { container } = renderSchedule();
    const scrollArea = container.querySelector('[data-slot="scroll-area"]');
    const scrollViewport = container.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    expect(scrollViewport).toBeInstanceOf(HTMLDivElement);
    if (!(scrollViewport instanceof HTMLDivElement)) return;

    scrollViewport.scrollLeft = 180;
    fireEvent.scroll(scrollViewport);

    expect(scrollViewport.scrollLeft).toBe(0);
    expect(scrollArea?.className).toContain(
      "[&_[data-slot=scroll-area-viewport]]:!overflow-x-hidden",
    );
    expect(
      container.querySelector(
        '[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]',
      ),
    ).toBeNull();
  });

  it("does not render or activate the swipe track on a narrow desktop", () => {
    mobileSwipeMocks.enabled = false;
    const { container, grid, onDaySwipe } = renderSchedule();
    const swipeTrack = container.querySelector(
      '[data-slot="mobile-day-swipe-track"]',
    );

    expect(swipeTrack?.className).toContain("w-full");
    expect(swipeTrack?.className).not.toContain("w-[300%]");
    expect(
      container.querySelector('[data-slot="mobile-day-preview-previous"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-slot="mobile-day-preview-next"]'),
    ).toBeNull();

    fireEvent.touchStart(grid, {
      touches: [{ clientX: 300, clientY: 400, identifier: 31 }],
    });
    fireEvent.touchMove(grid, {
      touches: [{ clientX: 220, clientY: 402, identifier: 31 }],
    });
    fireEvent.touchEnd(grid, {
      changedTouches: [{ clientX: 220, clientY: 402, identifier: 31 }],
      touches: [],
    });

    expect(motionMocks.motionValue.set).not.toHaveBeenCalledWith(-80);
    expect(onDaySwipe).not.toHaveBeenCalled();
  });

  it("centers today's marker without horizontally scrolling the day track", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 8, 12, 0));
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");

    const { container } = renderSchedule();
    const scrollViewport = container.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(scrollViewport).toBeInstanceOf(HTMLElement);
    expect(scrollViewport?.scrollLeft).toBe(0);
    scrollIntoView.mockRestore();
  });

  it("keeps the previous and next day rendered beside the active day", () => {
    const nextDaySegment = createSegment();
    nextDaySegment.id = "reservation-next-day";
    nextDaySegment.dayIdx = 4;
    nextDaySegment.reservation.id = 2;
    const { container } = renderSchedule(vi.fn(), [nextDaySegment]);

    const swipeSurface = container.querySelector(
      '[data-slot="mobile-day-swipe-surface"]',
    );
    const swipeTrack = container.querySelector(
      '[data-slot="mobile-day-swipe-track"]',
    );
    const previousDay = container.querySelector(
      '[data-slot="mobile-day-preview-previous"]',
    );
    const activeDay = container.querySelector(
      '[data-slot="mobile-day-current"]',
    );
    const nextDay = container.querySelector(
      '[data-slot="mobile-day-preview-next"]',
    );

    expect(swipeSurface?.className).toContain("overflow-hidden");
    expect(swipeTrack?.className).toContain("-left-full");
    expect(swipeTrack?.className).toContain("w-[300%]");
    expect(previousDay).not.toBeNull();
    expect(activeDay).not.toBeNull();
    expect(nextDay?.querySelector(".reservation-card")).not.toBeNull();
  });

  it("settles the committed day and track before another frame can paint", async () => {
    const targetDaySegment = createSegment();
    targetDaySegment.id = "reservation-target-day";
    targetDaySegment.dayIdx = 4;
    targetDaySegment.reservation.id = 2;
    const initialDate = new Date(2026, 0, 8);
    const targetDate = new Date(2026, 0, 9);
    const onDaySwipe = vi.fn<(direction: -1 | 1) => void>();
    const onRangeSelect = vi.fn();
    const onReservationSelect = vi.fn();
    const renderForDay = (scheduleDate: Date, scheduleDayIndex: number) => (
      <MobileDaySchedule
        date={scheduleDate}
        dayIndex={scheduleDayIndex}
        segments={[targetDaySegment]}
        defaultDurationMinutes={60}
        minuteStep={15}
        onDaySwipe={onDaySwipe}
        onRangeSelect={onRangeSelect}
        onReservationSelect={onReservationSelect}
      />
    );
    const result = render(renderForDay(initialDate, 3));
    onDaySwipe.mockImplementation((direction) => {
      expect(direction).toBe(1);
      result.rerender(renderForDay(targetDate, 4));
    });
    const grid = result.container.querySelector(
      '[data-slot="mobile-day-current"] > .relative',
    );
    const swipeSurface = result.container.querySelector(
      '[data-slot="mobile-day-swipe-surface"]',
    );
    expect(grid).toBeInstanceOf(HTMLDivElement);
    expect(swipeSurface).toBeInstanceOf(HTMLDivElement);
    if (
      !(grid instanceof HTMLDivElement) ||
      !(swipeSurface instanceof HTMLDivElement)
    ) {
      return;
    }
    vi.spyOn(swipeSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 390, 800),
    );
    const requestAnimationFrameSpy = vi
      .spyOn(globalThis, "requestAnimationFrame")
      .mockImplementation(() => 1);

    try {
      fireEvent.touchStart(grid, {
        touches: [{ clientX: 300, clientY: 400, identifier: 30 }],
      });
      fireEvent.touchMove(grid, {
        touches: [{ clientX: 252, clientY: 402, identifier: 30 }],
      });
      await act(async () => {
        fireEvent.touchEnd(grid, {
          changedTouches: [{ clientX: 252, clientY: 402, identifier: 30 }],
          touches: [],
        });
        await Promise.resolve();
      });

      expect(onDaySwipe).toHaveBeenCalledWith(1);
      expect(requestAnimationFrameSpy).not.toHaveBeenCalled();
      expect(motionMocks.motionValue.set).toHaveBeenLastCalledWith(0);
      const settledTargetDay = result.container.querySelector(
        '[data-slot="mobile-day-current"]',
      );
      expect(
        settledTargetDay?.querySelector(".reservation-card"),
      ).not.toBeNull();
    } finally {
      requestAnimationFrameSpy.mockRestore();
    }
  });

  it("selects a range with a mouse drag in the compact layout", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 7, 12, 0));
    const { date, grid, onRangeSelect } = renderSchedule();

    fireEvent.pointerDown(grid, {
      button: 0,
      clientX: LABEL_COLUMN_WIDTH + 40,
      clientY: 10 * MIN_ROW_HEIGHT + 1,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(grid, {
      clientX: LABEL_COLUMN_WIDTH + 40,
      clientY: 11 * MIN_ROW_HEIGHT + 1,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(grid, {
      clientX: LABEL_COLUMN_WIDTH + 40,
      clientY: 11 * MIN_ROW_HEIGHT + 1,
      pointerId: 1,
      pointerType: "mouse",
    });

    const expectedStartsAt = new Date(date);
    expectedStartsAt.setHours(10, 0, 0, 0);
    const expectedEndsAt = new Date(date);
    expectedEndsAt.setHours(11, 15, 0, 0);
    expect(onRangeSelect).toHaveBeenCalledWith({
      startsAt: expectedStartsAt,
      endsAt: expectedEndsAt,
    });
  });

  it("starts touch range selection only after a long press", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 7, 12, 0));
    const { date, grid, onRangeSelect } = renderSchedule();

    fireEvent.touchStart(grid, {
      touches: [
        {
          clientX: LABEL_COLUMN_WIDTH + 40,
          clientY: 10 * MIN_ROW_HEIGHT + 1,
          identifier: 1,
        },
      ],
    });
    act(() => vi.advanceTimersByTime(400));
    expect(motionMocks.motionValue.set).toHaveBeenCalledWith(0);
    fireEvent.touchMove(grid, {
      touches: [
        {
          clientX: LABEL_COLUMN_WIDTH + 40,
          clientY: 11 * MIN_ROW_HEIGHT + 1,
          identifier: 1,
        },
      ],
    });
    fireEvent.touchEnd(grid, {
      changedTouches: [
        {
          clientX: LABEL_COLUMN_WIDTH + 40,
          clientY: 11 * MIN_ROW_HEIGHT + 1,
          identifier: 1,
        },
      ],
      touches: [],
    });

    const expectedStartsAt = new Date(date);
    expectedStartsAt.setHours(10, 0, 0, 0);
    const expectedEndsAt = new Date(date);
    expectedEndsAt.setHours(11, 15, 0, 0);
    expect(onRangeSelect).toHaveBeenCalledWith({
      startsAt: expectedStartsAt,
      endsAt: expectedEndsAt,
    });
  });

  it("uses native touch movement as the only swipe input pipeline", () => {
    const { container, grid } = renderSchedule();
    const swipeSurface = container.querySelector(
      '[data-slot="mobile-day-swipe-surface"]',
    );
    expect(swipeSurface).toBeInstanceOf(HTMLDivElement);
    if (!(swipeSurface instanceof HTMLDivElement)) return;

    fireEvent.pointerDown(swipeSurface, {
      button: 0,
      isPrimary: true,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerDown(swipeSurface, {
      button: 0,
      isPrimary: true,
      pointerId: 2,
      pointerType: "touch",
    });
    expect(motionMocks.onDragEnd).toBeUndefined();
    expect(motionMocks.motionValue.set).not.toHaveBeenCalled();

    fireEvent.touchStart(grid, {
      touches: [{ clientX: 300, clientY: 400, identifier: 2 }],
    });
    fireEvent.touchMove(grid, {
      touches: [{ clientX: 280, clientY: 401, identifier: 2 }],
    });
    expect(motionMocks.motionValue.set).toHaveBeenCalledWith(-20);
  });

  it("snaps to the next day after a deliberate partial left swipe", async () => {
    const { container, grid, onDaySwipe } = renderSchedule();
    const swipeSurface = container.querySelector(
      '[data-slot="mobile-day-swipe-surface"]',
    );
    expect(swipeSurface).toBeInstanceOf(HTMLDivElement);
    if (!(swipeSurface instanceof HTMLDivElement)) return;
    vi.spyOn(swipeSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 390, 800),
    );

    fireEvent.touchStart(grid, {
      touches: [{ clientX: 300, clientY: 400, identifier: 3 }],
    });
    fireEvent.touchMove(grid, {
      touches: [{ clientX: 252, clientY: 402, identifier: 3 }],
    });
    await act(async () => {
      fireEvent.touchEnd(grid, {
        changedTouches: [{ clientX: 252, clientY: 402, identifier: 3 }],
        touches: [],
      });
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(onDaySwipe).toHaveBeenCalledWith(1);
    expect(motionMocks.animate).toHaveBeenCalledOnce();
    expect(motionMocks.animate).toHaveBeenCalledWith(
      motionMocks.motionValue,
      -390,
      {
        duration: 0.18,
        ease: [0.16, 1, 0.3, 1],
      },
    );
    expect(motionMocks.motionValue.set).toHaveBeenCalledWith(0);
  });

  it("changes the day from native touch events without relying on pointer drag events", () => {
    motionMocks.reducedMotion = true;
    const { container, grid, onDaySwipe } = renderSchedule();
    const swipeSurface = container.querySelector(
      '[data-slot="mobile-day-swipe-surface"]',
    );
    expect(swipeSurface).toBeInstanceOf(HTMLDivElement);
    if (!(swipeSurface instanceof HTMLDivElement)) return;
    vi.spyOn(swipeSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 360, 800),
    );

    fireEvent.touchStart(grid, {
      touches: [{ clientX: 300, clientY: 400, identifier: 5 }],
    });
    fireEvent.touchMove(grid, {
      touches: [{ clientX: 190, clientY: 402, identifier: 5 }],
    });
    fireEvent.touchEnd(grid, {
      changedTouches: [{ clientX: 160, clientY: 402, identifier: 5 }],
      touches: [],
    });

    expect(motionMocks.motionValue.set).toHaveBeenCalledWith(-110);
    expect(onDaySwipe).toHaveBeenCalledWith(1);
  });

  it("allows another native swipe after an interrupted touch gesture", () => {
    motionMocks.reducedMotion = true;
    const { container, grid, onDaySwipe } = renderSchedule();
    const swipeSurface = container.querySelector(
      '[data-slot="mobile-day-swipe-surface"]',
    );
    expect(swipeSurface).toBeInstanceOf(HTMLDivElement);
    if (!(swipeSurface instanceof HTMLDivElement)) return;
    vi.spyOn(swipeSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 360, 800),
    );

    fireEvent.touchStart(grid, {
      touches: [{ clientX: 300, clientY: 400, identifier: 6 }],
    });
    fireEvent.touchMove(grid, {
      touches: [{ clientX: 240, clientY: 402, identifier: 6 }],
    });
    fireEvent.touchCancel(grid);

    fireEvent.touchStart(grid, {
      touches: [{ clientX: 300, clientY: 400, identifier: 7 }],
    });
    fireEvent.touchMove(grid, {
      touches: [{ clientX: 190, clientY: 402, identifier: 7 }],
    });
    fireEvent.touchEnd(grid, {
      changedTouches: [{ clientX: 160, clientY: 402, identifier: 7 }],
      touches: [],
    });

    expect(onDaySwipe).toHaveBeenCalledWith(1);
  });

  it("handles a native touch swipe from a reservation without opening it", () => {
    motionMocks.reducedMotion = true;
    const { container, onDaySwipe, onReservationSelect } = renderSchedule(
      vi.fn(),
      [createSegment()],
    );
    const swipeSurface = container.querySelector(
      '[data-slot="mobile-day-swipe-surface"]',
    );
    const reservationBlock = container.querySelector(".reservation-card");
    expect(swipeSurface).toBeInstanceOf(HTMLDivElement);
    expect(reservationBlock).toBeInstanceOf(HTMLButtonElement);
    if (
      !(swipeSurface instanceof HTMLDivElement) ||
      !(reservationBlock instanceof HTMLButtonElement)
    ) {
      return;
    }
    vi.spyOn(swipeSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 360, 800),
    );

    fireEvent.touchStart(reservationBlock, {
      touches: [{ clientX: 300, clientY: 400, identifier: 8 }],
    });
    fireEvent.touchMove(reservationBlock, {
      touches: [{ clientX: 190, clientY: 402, identifier: 8 }],
    });
    fireEvent.touchEnd(reservationBlock, {
      changedTouches: [{ clientX: 160, clientY: 402, identifier: 8 }],
      touches: [],
    });
    fireEvent.click(reservationBlock);

    expect(onDaySwipe).toHaveBeenCalledWith(1);
    expect(onReservationSelect).not.toHaveBeenCalled();
  });

  it("changes the day without animation when reduced motion is enabled", async () => {
    motionMocks.reducedMotion = true;
    const { container, grid, onDaySwipe } = renderSchedule();
    const swipeSurface = container.querySelector(
      '[data-slot="mobile-day-swipe-surface"]',
    );
    expect(swipeSurface).toBeInstanceOf(HTMLDivElement);
    if (!(swipeSurface instanceof HTMLDivElement)) return;
    vi.spyOn(swipeSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 360, 800),
    );

    fireEvent.touchStart(grid, {
      touches: [{ clientX: 200, clientY: 400, identifier: 11 }],
    });
    fireEvent.touchMove(grid, {
      touches: [{ clientX: 280, clientY: 402, identifier: 11 }],
    });
    fireEvent.touchEnd(grid, {
      changedTouches: [{ clientX: 280, clientY: 402, identifier: 11 }],
      touches: [],
    });

    expect(onDaySwipe).toHaveBeenCalledWith(-1);
    expect(motionMocks.animate).not.toHaveBeenCalled();
    expect(motionMocks.motionValue.set).toHaveBeenCalledWith(0);
  });

  it("allows a horizontal swipe from a reservation without opening it", async () => {
    const { container, onDaySwipe, onReservationSelect } = renderSchedule(
      vi.fn(),
      [createSegment()],
    );
    const swipeSurface = container.querySelector(
      '[data-slot="mobile-day-swipe-surface"]',
    );
    const reservationBlock = container.querySelector(".reservation-card");
    expect(swipeSurface).toBeInstanceOf(HTMLDivElement);
    expect(reservationBlock).toBeInstanceOf(HTMLButtonElement);
    if (
      !(swipeSurface instanceof HTMLDivElement) ||
      !(reservationBlock instanceof HTMLButtonElement)
    ) {
      return;
    }
    vi.spyOn(swipeSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 360, 800),
    );

    fireEvent.touchStart(reservationBlock, {
      touches: [{ clientX: 300, clientY: 400, identifier: 12 }],
    });
    fireEvent.touchMove(reservationBlock, {
      touches: [{ clientX: 220, clientY: 402, identifier: 12 }],
    });
    await act(async () => {
      fireEvent.touchEnd(reservationBlock, {
        changedTouches: [{ clientX: 220, clientY: 402, identifier: 12 }],
        touches: [],
      });
      fireEvent.click(reservationBlock);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(onReservationSelect).not.toHaveBeenCalled();
    expect(onDaySwipe).toHaveBeenCalledWith(1);
  });

  it("settles one touch swipe only once when native and pointer endings race", async () => {
    let resolveTransition: (() => void) | undefined;
    motionMocks.animate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveTransition = resolve;
        }),
    );
    const { container, grid, onDaySwipe } = renderSchedule();
    const swipeSurface = container.querySelector(
      '[data-slot="mobile-day-swipe-surface"]',
    );
    expect(swipeSurface).toBeInstanceOf(HTMLDivElement);
    if (!(swipeSurface instanceof HTMLDivElement)) return;
    vi.spyOn(swipeSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 390, 800),
    );

    fireEvent.touchStart(grid, {
      touches: [{ clientX: 300, clientY: 400, identifier: 9 }],
    });
    fireEvent.touchMove(grid, {
      touches: [{ clientX: 252, clientY: 402, identifier: 9 }],
    });
    fireEvent.touchEnd(grid, {
      changedTouches: [{ clientX: 252, clientY: 402, identifier: 9 }],
      touches: [],
    });
    const duplicatePointerCompletion = motionMocks.onDragEnd?.(
      new PointerEvent("pointerup"),
      {
        offset: { x: -48 },
        velocity: { x: 0 },
      },
    );

    expect(motionMocks.animate).toHaveBeenCalledOnce();
    resolveTransition?.();
    await act(async () => duplicatePointerCompletion);
    expect(onDaySwipe).toHaveBeenCalledOnce();
  });

  it("does not reset the track when touch cancellation follows a committed swipe", async () => {
    let resolveTransition: (() => void) | undefined;
    motionMocks.animate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveTransition = resolve;
        }),
    );
    const { container, grid, onDaySwipe } = renderSchedule();
    const swipeSurface = container.querySelector(
      '[data-slot="mobile-day-swipe-surface"]',
    );
    expect(swipeSurface).toBeInstanceOf(HTMLDivElement);
    if (!(swipeSurface instanceof HTMLDivElement)) return;
    vi.spyOn(swipeSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 390, 800),
    );

    fireEvent.touchStart(grid, {
      touches: [{ clientX: 300, clientY: 400, identifier: 10 }],
    });
    fireEvent.touchMove(grid, {
      touches: [{ clientX: 252, clientY: 402, identifier: 10 }],
    });
    fireEvent.touchEnd(grid, {
      changedTouches: [{ clientX: 252, clientY: 402, identifier: 10 }],
      touches: [],
    });
    motionMocks.motionValue.set.mockClear();
    fireEvent.touchCancel(grid);

    expect(motionMocks.motionValue.set).not.toHaveBeenCalled();
    resolveTransition?.();
    await act(async () => Promise.resolve());
    expect(onDaySwipe).toHaveBeenCalledOnce();
  });

  it("ignores new touch drags while the day transition is running", async () => {
    let resolveExit: (() => void) | undefined;
    motionMocks.animate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveExit = resolve;
        }),
    );
    const { container, grid, onDaySwipe } = renderSchedule();
    const swipeSurface = container.querySelector(
      '[data-slot="mobile-day-swipe-surface"]',
    );
    expect(swipeSurface).toBeInstanceOf(HTMLDivElement);
    if (!(swipeSurface instanceof HTMLDivElement)) return;
    vi.spyOn(swipeSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 360, 800),
    );

    fireEvent.touchStart(grid, {
      touches: [{ clientX: 300, clientY: 400, identifier: 13 }],
    });
    fireEvent.touchMove(grid, {
      touches: [{ clientX: 220, clientY: 402, identifier: 13 }],
    });
    fireEvent.touchEnd(grid, {
      changedTouches: [{ clientX: 220, clientY: 402, identifier: 13 }],
      touches: [],
    });
    motionMocks.motionValue.set.mockClear();

    fireEvent.touchStart(grid, {
      touches: [{ clientX: 300, clientY: 400, identifier: 14 }],
    });
    fireEvent.touchMove(grid, {
      touches: [{ clientX: 220, clientY: 402, identifier: 14 }],
    });
    expect(motionMocks.motionValue.set).not.toHaveBeenCalled();
    expect(motionMocks.animate).toHaveBeenCalledOnce();

    resolveExit?.();
    await act(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        }),
    );
    expect(onDaySwipe).toHaveBeenCalledOnce();
  });

  it("fully settles an incomplete swipe before accepting another gesture", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 7, 12, 0));
    let resolveReturn: (() => void) | undefined;
    motionMocks.animate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveReturn = resolve;
        }),
    );
    const { container, grid, onDaySwipe } = renderSchedule();
    const swipeSurface = container.querySelector(
      '[data-slot="mobile-day-swipe-surface"]',
    );
    expect(swipeSurface).toBeInstanceOf(HTMLDivElement);
    if (!(swipeSurface instanceof HTMLDivElement)) return;
    vi.spyOn(swipeSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 390, 800),
    );

    fireEvent.touchStart(grid, {
      touches: [{ clientX: 300, clientY: 400, identifier: 15 }],
    });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.touchMove(grid, {
      touches: [{ clientX: 276, clientY: 402, identifier: 15 }],
    });
    fireEvent.touchEnd(grid, {
      changedTouches: [{ clientX: 276, clientY: 402, identifier: 15 }],
      touches: [],
    });

    expect(motionMocks.animate).toHaveBeenCalledWith(
      motionMocks.motionValue,
      0,
      {
        duration: 0.16,
        ease: [0.16, 1, 0.3, 1],
      },
    );
    motionMocks.motionValue.set.mockClear();
    fireEvent.touchStart(grid, {
      touches: [{ clientX: 300, clientY: 400, identifier: 16 }],
    });
    fireEvent.touchMove(grid, {
      touches: [{ clientX: 220, clientY: 402, identifier: 16 }],
    });
    expect(motionMocks.motionValue.set).not.toHaveBeenCalled();

    resolveReturn?.();
    await act(async () => Promise.resolve());
    expect(motionMocks.motionValue.set).toHaveBeenLastCalledWith(0);
    expect(onDaySwipe).not.toHaveBeenCalled();
  });

  it("settles a repeated series of alternating partial swipes", async () => {
    const { container, grid, onDaySwipe } = renderSchedule();
    const swipeSurface = container.querySelector(
      '[data-slot="mobile-day-swipe-surface"]',
    );
    expect(swipeSurface).toBeInstanceOf(HTMLDivElement);
    if (!(swipeSurface instanceof HTMLDivElement)) return;
    vi.spyOn(swipeSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 390, 800),
    );

    const expectedDirections: Array<-1 | 1> = [];
    for (let index = 0; index < 20; index += 1) {
      const direction = index % 2 === 0 ? 1 : -1;
      const startClientX = direction === 1 ? 300 : 200;
      const endClientX = startClientX - direction * 48;
      expectedDirections.push(direction);

      fireEvent.touchStart(grid, {
        touches: [
          { clientX: startClientX, clientY: 400, identifier: 100 + index },
        ],
      });
      fireEvent.touchMove(grid, {
        touches: [
          { clientX: endClientX, clientY: 402, identifier: 100 + index },
        ],
      });
      await act(async () => {
        fireEvent.touchEnd(grid, {
          changedTouches: [
            { clientX: endClientX, clientY: 402, identifier: 100 + index },
          ],
          touches: [],
        });
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      });
    }

    expect(onDaySwipe.mock.calls.map(([direction]) => direction)).toEqual(
      expectedDirections,
    );
    expect(motionMocks.animate).toHaveBeenCalledTimes(20);
    expect(motionMocks.motionValue.set).toHaveBeenLastCalledWith(0);
  });

  it("keeps the native context menu available on reservation blocks", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 7, 12, 0));
    const { grid } = renderSchedule();
    const reservationBlock = document.createElement("button");
    reservationBlock.className = "reservation-card";
    grid.append(reservationBlock);

    fireEvent.touchStart(grid, {
      touches: [
        {
          clientX: LABEL_COLUMN_WIDTH + 40,
          clientY: 10 * MIN_ROW_HEIGHT + 1,
          identifier: 1,
        },
      ],
    });
    act(() => vi.advanceTimersByTime(400));

    expect(fireEvent.contextMenu(reservationBlock)).toBe(true);
    expect(motionMocks.motionValue.set).toHaveBeenCalledWith(0);
  });

  it("keeps a moving short touch available for scrolling", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 7, 12, 0));
    const { grid, onRangeSelect } = renderSchedule();

    fireEvent.touchStart(grid, {
      touches: [
        {
          clientX: LABEL_COLUMN_WIDTH + 40,
          clientY: 10 * MIN_ROW_HEIGHT + 1,
          identifier: 1,
        },
      ],
    });
    fireEvent.touchMove(grid, {
      touches: [
        {
          clientX: LABEL_COLUMN_WIDTH + 40,
          clientY: 10 * MIN_ROW_HEIGHT + 20,
          identifier: 1,
        },
      ],
    });
    act(() => vi.advanceTimersByTime(400));
    fireEvent.touchEnd(grid, {
      changedTouches: [
        {
          clientX: LABEL_COLUMN_WIDTH + 40,
          clientY: 10 * MIN_ROW_HEIGHT + 20,
          identifier: 1,
        },
      ],
      touches: [],
    });

    expect(onRangeSelect).not.toHaveBeenCalled();
  });

  it.each(["mouse", "touch"] as const)(
    "uses the first %s outside press only to dismiss an open context menu",
    (pointerType) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 7, 12, 0));
      const onRangeSelect = vi.fn();
      const { grid } = renderSchedule(onRangeSelect, [createSegment()]);
      const reservationBlock = grid.querySelector(".reservation-card");
      const emptySlot = grid.querySelectorAll(
        "button:not(.reservation-card)",
      )[14];
      expect(reservationBlock).toBeInstanceOf(HTMLButtonElement);
      expect(emptySlot).toBeInstanceOf(HTMLButtonElement);
      if (
        !(reservationBlock instanceof HTMLButtonElement) ||
        !(emptySlot instanceof HTMLButtonElement)
      ) {
        return;
      }

      fireEvent.contextMenu(reservationBlock);
      expect(
        document.querySelector('[data-slot="context-menu-content"]'),
      ).not.toBeNull();

      fireEvent.pointerDown(emptySlot, {
        button: 0,
        clientX: LABEL_COLUMN_WIDTH + 40,
        clientY: 14 * MIN_ROW_HEIGHT + 1,
        pointerId: 2,
        pointerType,
      });
      fireEvent.pointerUp(emptySlot, {
        button: 0,
        clientX: LABEL_COLUMN_WIDTH + 40,
        clientY: 14 * MIN_ROW_HEIGHT + 1,
        pointerId: 2,
        pointerType,
      });
      fireEvent.click(emptySlot);

      expect(onRangeSelect).not.toHaveBeenCalled();
    },
  );
});
