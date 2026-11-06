import { useEffect, useEffectEvent, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { LABEL_COLUMN_WIDTH, MIN_ROW_HEIGHT } from "./constants";
import {
  getDaySwipeDirection,
  type DaySwipeDirection,
} from "./get-day-swipe-direction";
import {
  LONG_PRESS_DURATION_MS,
  SWIPE_COMMIT_TIMING,
  SWIPE_DRAG_THRESHOLD_PX,
  SWIPE_RETURN_TIMING,
  TOUCH_MOVE_TOLERANCE_PX,
  addSwipeSample,
  getDateAtMinutes,
  type DaySelection,
  type TouchSession,
  getMinutesFromClientY,
  getSelectedRange,
  getSwipeVelocity,
  isReservationTarget,
} from "./mobile-day-interactions";
import { isReservationStartSelectable } from "./reservation-settings";
import { useScrollToNowIndicator } from "./use-scroll-to-now-indicator";
import type { ReservationRange, ReservationSegment } from "./types";
import { useMobileDaySwipe } from "./use-mobile-day-swipe";

export type MobileDayScheduleProps = {
  date: Date;
  dayIndex: number;
  segments: ReservationSegment[];
  defaultDurationMinutes: number;
  minuteStep: number;
  onDaySwipe: (direction: DaySwipeDirection) => void;
  onRangeSelect: (range: ReservationRange) => void;
  onReservationSelect: (reservationId: number) => void;
  onReservationCancel?: (reservationId: number) => void;
  cancellingReservationId?: number | null;
};

export function useMobileDaySchedule({
  date,
  dayIndex,
  segments,
  defaultDurationMinutes,
  minuteStep,
  onDaySwipe,
  onRangeSelect,
}: MobileDayScheduleProps) {
  const shouldReduceMotion = usePrefersReducedMotion();
  const isDaySwipeEnabled = useMobileDaySwipe();
  const gridRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  const swipeSurfaceRef = useRef<HTMLDivElement>(null);
  const swipeTrackRef = useRef<HTMLDivElement>(null);
  const swipeAnimationRef = useRef<Animation | null>(null);
  const swipeOffsetRef = useRef(0);
  const selectionRef = useRef<DaySelection | null>(null);
  const touchSessionRef = useRef<TouchSession | null>(null);
  const contextMenuOpenRef = useRef(false);
  const swipeTransitioningRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [selection, setSelection] = useState<DaySelection | null>(null);
  const daySegments = segments.filter((segment) => segment.dayIdx === dayIndex);
  const now = new Date(useMinuteTimestamp());
  const isToday = date.toDateString() === now.toDateString();

  const nowTop =
    ((now.getHours() * 60 + now.getMinutes()) / 60) * MIN_ROW_HEIGHT;

  const updateSelection = (nextSelection: DaySelection | null) => {
    selectionRef.current = nextSelection;
    setSelection(nextSelection);
  };

  const finishSelection = () => {
    const finishedSelection = selectionRef.current;
    updateSelection(null);

    if (!finishedSelection) return;

    const range = getSelectedRange(
      date,
      finishedSelection,
      defaultDurationMinutes,
      minuteStep,
    );

    if (!isReservationStartSelectable(range.startsAt)) return;
    onRangeSelect(range);
  };

  const clearSuppressedClickAfterCurrentEvent = () => {
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  /**
   * The track follows the finger by writing its transform directly: it is a
   * compositor layer, so a move neither re-renders React nor repaints.
   */
  const setSwipeOffset = (offset: number) => {
    swipeOffsetRef.current = offset;
    const track = swipeTrackRef.current;

    if (!track) return;
    track.style.transform = offset === 0 ? "none" : `translateX(${offset}px)`;
  };

  const resetSwipe = () => {
    swipeAnimationRef.current?.cancel();
    swipeAnimationRef.current = null;
    setSwipeOffset(0);
  };

  /**
   * Web Animations run on the compositor, so rendering the next day cannot
   * stall the motion. The final frame holds until the caller resets it.
   */
  const animateSwipeTo = async (
    offset: number,
    timing: KeyframeAnimationOptions,
  ) => {
    const track = swipeTrackRef.current;
    const from = swipeOffsetRef.current;

    swipeAnimationRef.current?.cancel();
    setSwipeOffset(offset);

    if (!track) return;

    const animation = track.animate(
      [
        { transform: `translateX(${from}px)` },
        { transform: `translateX(${offset}px)` },
      ],
      { ...timing, fill: "forwards" },
    );

    swipeAnimationRef.current = animation;
    await animation.finished;
  };

  const finishDaySwipe = useEffectEvent(
    async ({ offsetX, velocityX }: { offsetX: number; velocityX: number }) => {
      const surface = swipeSurfaceRef.current;
      const width = surface?.getBoundingClientRect().width ?? 0;

      const direction = getDaySwipeDirection({
        offsetX,
        velocityX,
        width,
      });

      if (swipeTransitioningRef.current) {
        return;
      }

      if (direction === null) {
        if (shouldReduceMotion) {
          resetSwipe();
          clearSuppressedClickAfterCurrentEvent();

          return;
        }

        swipeTransitioningRef.current = true;

        try {
          await animateSwipeTo(0, SWIPE_RETURN_TIMING);
        } catch {
          // Cancelled by an unmount or a reset, which leaves the track settled.
        } finally {
          resetSwipe();
          swipeTransitioningRef.current = false;
          suppressClickRef.current = false;
        }

        return;
      }

      if (shouldReduceMotion) {
        resetSwipe();
        onDaySwipe(direction);
        clearSuppressedClickAfterCurrentEvent();

        return;
      }

      swipeTransitioningRef.current = true;
      const exitOffset = direction === 1 ? -width : width;

      try {
        await animateSwipeTo(exitOffset, SWIPE_COMMIT_TIMING);
        // The neighbouring day is on screen; render it as the current one
        // before the track moves back, so both land in the same frame.
        flushSync(() => {
          onDaySwipe(direction);
        });
      } catch {
        // Cancelled by an unmount or a reset; the day stays as it was.
      } finally {
        resetSwipe();
        swipeTransitioningRef.current = false;
        suppressClickRef.current = false;
      }
    },
  );

  useScrollToNowIndicator(nowRef, isToday);

  useEffect(
    () => () => {
      swipeAnimationRef.current?.cancel();
    },
    [],
  );

  // eslint-disable-next-line react-doctor/effect-needs-cleanup -- clearLongPress cancels the callback-owned timer; cleanup removes all four touch listeners.
  useEffect(() => {
    const grid = gridRef.current;

    if (!grid || !isDaySwipeEnabled) return;
    let longPressTimeout: ReturnType<typeof setTimeout> | null = null;

    const clearLongPress = () => {
      if (longPressTimeout === null) return;
      clearTimeout(longPressTimeout);
      longPressTimeout = null;
    };

    const getTrackedTouch = (touches: TouchList, identifier: number) => {
      for (let index = 0; index < touches.length; index += 1) {
        const touch = touches[index];

        if (touch?.identifier === identifier) return touch;
      }

      return null;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (contextMenuOpenRef.current) {
        suppressClickRef.current = true;

        return;
      }

      if (
        suppressClickRef.current ||
        swipeTransitioningRef.current ||
        event.touches.length !== 1
      ) {
        return;
      }

      const touch = event.touches[0];

      if (!touch) return;
      touchSessionRef.current = {
        activated: false,
        canceled: false,
        identifier: touch.identifier,
        latestClientX: touch.clientX,
        latestClientY: touch.clientY,
        samples: [{ clientX: touch.clientX, time: Date.now() }],
        startClientX: touch.clientX,
        startClientY: touch.clientY,
        swiping: false,
      };

      if (isReservationTarget(event.target)) return;
      longPressTimeout = setTimeout(() => {
        const session = touchSessionRef.current;

        if (!session || session.canceled) return;

        const minutes = getMinutesFromClientY(
          grid,
          session.latestClientY,
          minuteStep,
        );

        if (
          minutes === null ||
          !isReservationStartSelectable(getDateAtMinutes(date, minutes))
        ) {
          session.canceled = true;

          return;
        }

        session.activated = true;
        resetSwipe();
        suppressClickRef.current = true;

        const nextSelection: DaySelection = {
          anchorMinutes: minutes,
          currentMinutes: minutes,
          dragged: false,
          input: "touch",
        };

        selectionRef.current = nextSelection;
        setSelection(nextSelection);
      }, LONG_PRESS_DURATION_MS);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const session = touchSessionRef.current;

      if (!session) return;
      const touch = getTrackedTouch(event.touches, session.identifier);

      if (!touch) return;
      session.latestClientX = touch.clientX;
      session.latestClientY = touch.clientY;

      if (!session.activated) {
        const offsetX = touch.clientX - session.startClientX;
        const offsetY = touch.clientY - session.startClientY;
        const absoluteOffsetX = Math.abs(offsetX);
        const absoluteOffsetY = Math.abs(offsetY);

        if (
          session.swiping ||
          (absoluteOffsetX >= SWIPE_DRAG_THRESHOLD_PX &&
            absoluteOffsetX > absoluteOffsetY)
        ) {
          if (!session.swiping) {
            session.swiping = true;
            session.canceled = true;
            clearLongPress();
            suppressClickRef.current = true;
          }

          event.preventDefault();
          addSwipeSample(session, touch.clientX, Date.now());
          setSwipeOffset(offsetX);

          return;
        }

        const movedDistance = Math.hypot(offsetX, offsetY);

        if (movedDistance > TOUCH_MOVE_TOLERANCE_PX) {
          session.canceled = true;
          clearLongPress();
        }

        return;
      }

      event.preventDefault();
      const minutes = getMinutesFromClientY(grid, touch.clientY, minuteStep);
      const activeSelection = selectionRef.current;

      if (minutes === null || activeSelection?.input !== "touch") return;

      const nextSelection: DaySelection = {
        ...activeSelection,
        currentMinutes: minutes,
        dragged: minutes !== activeSelection.anchorMinutes,
      };

      selectionRef.current = nextSelection;
      setSelection(nextSelection);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const session = touchSessionRef.current;

      if (!session) return;
      clearLongPress();

      if (session.swiping) {
        event.preventDefault();
        const touch = getTrackedTouch(event.changedTouches, session.identifier);
        const endClientX = touch?.clientX ?? session.latestClientX;
        touchSessionRef.current = null;
        void finishDaySwipe({
          offsetX: endClientX - session.startClientX,
          velocityX: getSwipeVelocity(session, endClientX, Date.now()),
        });

        return;
      }

      if (session.activated) {
        resetSwipe();
        event.preventDefault();
        const finishedSelection = selectionRef.current;
        selectionRef.current = null;
        setSelection(null);

        if (finishedSelection) {
          const range = getSelectedRange(
            date,
            finishedSelection,
            defaultDurationMinutes,
            minuteStep,
          );

          if (isReservationStartSelectable(range.startsAt)) {
            onRangeSelect(range);
          }
        }

        clearSuppressedClickAfterCurrentEvent();
      }

      touchSessionRef.current = null;
    };

    const handleTouchCancel = () => {
      clearLongPress();
      touchSessionRef.current = null;
      selectionRef.current = null;
      setSelection(null);

      if (!swipeTransitioningRef.current) {
        resetSwipe();
        suppressClickRef.current = false;
      }
    };

    grid.addEventListener("touchstart", handleTouchStart, { passive: true });
    grid.addEventListener("touchmove", handleTouchMove, { passive: false });
    grid.addEventListener("touchend", handleTouchEnd, { passive: false });
    grid.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      clearLongPress();
      grid.removeEventListener("touchstart", handleTouchStart);
      grid.removeEventListener("touchmove", handleTouchMove);
      grid.removeEventListener("touchend", handleTouchEnd);
      grid.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [
    date,
    defaultDurationMinutes,
    isDaySwipeEnabled,
    minuteStep,
    onRangeSelect,
  ]);

  const selectionStyle = (() => {
    if (!selection) return null;

    const range = getSelectedRange(
      date,
      selection,
      defaultDurationMinutes,
      minuteStep,
    );

    const startMinutes =
      range.startsAt.getHours() * 60 + range.startsAt.getMinutes();

    const durationMinutes =
      (range.endsAt.getTime() - range.startsAt.getTime()) / 60_000;

    return {
      left: LABEL_COLUMN_WIDTH + 1,
      right: 1,
      top: (startMinutes / 60) * MIN_ROW_HEIGHT + 1,
      height: Math.max(24, (durationMinutes / 60) * MIN_ROW_HEIGHT - 2),
    };
  })();

  const selectHour = (startsAt: Date) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;

      return;
    }

    onRangeSelect({
      startsAt,
      endsAt: new Date(startsAt.getTime() + defaultDurationMinutes * 60_000),
    });
  };

  return {
    swipeSurfaceRef,
    swipeTrackRef,
    isDaySwipeEnabled,
    resetSwipe,
    gridRef,
    contextMenuOpenRef,
    suppressClickRef,
    updateSelection,
    selectionRef,
    finishSelection,
    selectHour,
    isToday,
    nowRef,
    nowTop,
    selectionStyle,
    daySegments,
    touchSessionRef,
  };
}
