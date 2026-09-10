import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { LABEL_COLUMN_WIDTH, MIN_ROW_HEIGHT } from "./constants";
import {
  getDaySwipeDirection,
  type DaySwipeDirection,
} from "./get-day-swipe-direction";
import {
  LONG_PRESS_DURATION_MS,
  SWIPE_COMMIT_TRANSITION,
  SWIPE_DRAG_THRESHOLD_PX,
  SWIPE_RETURN_TRANSITION,
  TOUCH_MOVE_TOLERANCE_PX,
  getDateAtMinutes,
  type DaySelection,
  type TouchSession,
  getMinutesFromClientY,
  getSelectedRange,
  isReservationTarget,
  resetSwipePosition,
} from "./mobile-day-interactions";
import { isReservationStartSelectable } from "./reservation-settings";
import { scrollViewportToNowIndicator } from "./scroll-viewport-to-now-indicator";
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
  const swipeX = useMotionValue(0);
  const shouldReduceMotion = useReducedMotion();
  const isDaySwipeEnabled = useMobileDaySwipe();
  const gridRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);
  const swipeSurfaceRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<DaySelection | null>(null);
  const touchSessionRef = useRef<TouchSession | null>(null);
  const contextMenuOpenRef = useRef(false);
  const swipeTransitioningRef = useRef(false);
  const suppressClickRef = useRef(false);
  const [selection, setSelection] = useState<DaySelection | null>(null);
  const daySegments = segments.filter((segment) => segment.dayIdx === dayIndex);
  const isToday = date.toDateString() === new Date().toDateString();

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
          swipeX.set(0);
          clearSuppressedClickAfterCurrentEvent();
          return;
        }

        swipeTransitioningRef.current = true;
        try {
          swipeX.stop();
          await animate(swipeX, 0, SWIPE_RETURN_TRANSITION);
        } finally {
          swipeX.set(0);
          swipeTransitioningRef.current = false;
          suppressClickRef.current = false;
        }
        return;
      }

      if (shouldReduceMotion) {
        swipeX.set(0);
        onDaySwipe(direction);
        clearSuppressedClickAfterCurrentEvent();
        return;
      }

      swipeTransitioningRef.current = true;
      const exitOffset = direction === 1 ? -width : width;
      try {
        swipeX.stop();
        await animate(swipeX, exitOffset, SWIPE_COMMIT_TRANSITION);
        flushSync(() => {
          onDaySwipe(direction);
        });
        swipeX.set(0);
      } finally {
        swipeX.set(0);
        swipeTransitioningRef.current = false;
        suppressClickRef.current = false;
      }
    },
  );

  useEffect(() => {
    const nowIndicator = nowRef.current;
    if (!isToday || !nowIndicator) return;
    scrollViewportToNowIndicator(nowIndicator);
  }, [isToday]);

  useEffect(
    () => () => {
      swipeX.stop();
    },
    [swipeX],
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
        startedAt: Date.now(),
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
        resetSwipePosition(swipeX);
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
          swipeX.stop();
          swipeX.set(offsetX);
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
        const elapsedMilliseconds = Math.max(1, Date.now() - session.startedAt);
        touchSessionRef.current = null;
        void finishDaySwipe({
          offsetX: endClientX - session.startClientX,
          velocityX:
            ((endClientX - session.startClientX) / elapsedMilliseconds) * 1000,
        });
        return;
      }
      if (session.activated) {
        resetSwipePosition(swipeX);
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
        resetSwipePosition(swipeX);
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
    swipeX,
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
    isDaySwipeEnabled,
    swipeX,
    gridRef,
    contextMenuOpenRef,
    suppressClickRef,
    updateSelection,
    selectionRef,
    finishSelection,
    selectHour,
    isToday,
    nowRef,
    selectionStyle,
    daySegments,
    touchSessionRef,
  };
}
