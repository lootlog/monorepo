import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { addDays, format } from "date-fns";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import { HOURS, LABEL_COLUMN_WIDTH, MIN_ROW_HEIGHT } from "./constants";
import {
  getDaySwipeDirection,
  type DaySwipeDirection,
} from "./get-day-swipe-direction";
import { isEventInsideElement } from "./is-event-inside-element";
import { MobileDayPreview } from "./mobile-day-preview";
import { ReservationBlock } from "./reservation-block";
import { isReservationStartSelectable } from "./reservation-settings";
import { useMobileDaySwipe } from "./use-mobile-day-swipe";
import type { ReservationRange, ReservationSegment } from "./types";

type MobileDayScheduleProps = {
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

type DaySelection = {
  anchorMinutes: number;
  currentMinutes: number;
  dragged: boolean;
  input: "mouse" | "touch";
};

type TouchSession = {
  activated: boolean;
  canceled: boolean;
  identifier: number;
  latestClientX: number;
  latestClientY: number;
  startedAt: number;
  startClientX: number;
  startClientY: number;
  swiping: boolean;
};

const LONG_PRESS_DURATION_MS = 350;
const TOUCH_MOVE_TOLERANCE_PX = 8;
const SWIPE_DRAG_THRESHOLD_PX = 10;
const SWIPE_COMMIT_TRANSITION = {
  duration: 0.18,
  ease: [0.16, 1, 0.3, 1],
} as const;
const SWIPE_RETURN_TRANSITION = {
  duration: 0.16,
  ease: [0.16, 1, 0.3, 1],
} as const;

const getMinutesFromClientY = (
  grid: HTMLDivElement,
  clientY: number,
  minuteStep: number,
): number | null => {
  const y = clientY - grid.getBoundingClientRect().top;
  if (y < 0 || y > HOURS.length * MIN_ROW_HEIGHT) return null;
  const rawMinutes = (y / MIN_ROW_HEIGHT) * 60;
  return Math.min(
    24 * 60 - minuteStep,
    Math.floor(rawMinutes / minuteStep) * minuteStep,
  );
};

const getDateAtMinutes = (date: Date, minutes: number): Date => {
  const result = new Date(date);
  result.setHours(0, minutes, 0, 0);
  return result;
};

const getSelectedRange = (
  date: Date,
  selection: DaySelection,
  defaultDurationMinutes: number,
  minuteStep: number,
): ReservationRange => {
  const startMinutes = Math.min(
    selection.anchorMinutes,
    selection.currentMinutes,
  );
  const endMinutes = selection.dragged
    ? Math.max(selection.anchorMinutes, selection.currentMinutes) + minuteStep
    : startMinutes + defaultDurationMinutes;
  return {
    startsAt: getDateAtMinutes(date, startMinutes),
    endsAt: getDateAtMinutes(date, endMinutes),
  };
};

const isReservationTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(".reservation-card") !== null;

export function MobileDaySchedule({
  date,
  dayIndex,
  segments,
  defaultDurationMinutes,
  minuteStep,
  onDaySwipe,
  onRangeSelect,
  onReservationSelect,
  onReservationCancel,
  cancellingReservationId,
}: MobileDayScheduleProps) {
  const { t } = useTranslation();
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

  const resetSwipePosition = () => {
    swipeX.stop();
    swipeX.set(0);
  };

  const finishDaySwipe = async ({
    offsetX,
    velocityX,
  }: {
    offsetX: number;
    velocityX: number;
  }) => {
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
  };

  useEffect(() => {
    const nowIndicator = nowRef.current;
    if (!isToday || !nowIndicator) return;
    const scrollViewport = nowIndicator.closest(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!(scrollViewport instanceof HTMLElement)) return;

    scrollViewport.scrollTop = Math.max(
      0,
      nowIndicator.offsetTop - scrollViewport.clientHeight / 2,
    );
    scrollViewport.scrollLeft = 0;
  }, [isToday]);

  useEffect(
    () => () => {
      swipeX.stop();
    },
    [swipeX],
  );

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
        resetSwipePosition();
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
        resetSwipePosition();
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
        resetSwipePosition();
        suppressClickRef.current = false;
      }
    };

    grid.addEventListener("touchstart", handleTouchStart);
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

  return (
    <div
      ref={swipeSurfaceRef}
      data-slot="mobile-day-swipe-surface"
      className={cn(
        "flex min-h-0 flex-1 overflow-hidden",
        isDaySwipeEnabled && "touch-pan-y",
      )}
    >
      <ScrollArea
        orientation="vertical"
        className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]]:!overflow-x-hidden"
        onScroll={(event) => {
          if (event.currentTarget.scrollLeft !== 0) {
            event.currentTarget.scrollLeft = 0;
          }
        }}
      >
        <div
          data-slot="compact-schedule-scroll-content"
          className="pb-[calc(5rem+env(safe-area-inset-bottom))]"
        >
          <motion.div
            data-slot="mobile-day-swipe-track"
            className={cn(
              "relative flex",
              isDaySwipeEnabled ? "-left-full w-[300%]" : "w-full",
            )}
            style={isDaySwipeEnabled ? { x: swipeX } : undefined}
          >
            {isDaySwipeEnabled && (
              <div
                data-slot="mobile-day-preview-previous"
                className="pointer-events-none w-1/3 shrink-0"
                aria-hidden="true"
                inert
              >
                <MobileDayPreview
                  date={addDays(date, -1)}
                  dayIndex={dayIndex - 1}
                  segments={segments}
                />
              </div>
            )}
            <div
              data-slot="mobile-day-current"
              className={cn("shrink-0", isDaySwipeEnabled ? "w-1/3" : "w-full")}
            >
              <div
                ref={gridRef}
                className="relative select-none bg-background"
                style={{ height: HOURS.length * MIN_ROW_HEIGHT }}
                onPointerDown={(event) => {
                  if (contextMenuOpenRef.current) {
                    suppressClickRef.current = true;
                    updateSelection(null);
                    return;
                  }
                  if (
                    suppressClickRef.current ||
                    event.pointerType === "touch" ||
                    event.button !== 0 ||
                    isReservationTarget(event.target)
                  ) {
                    return;
                  }
                  const minutes = getMinutesFromClientY(
                    event.currentTarget,
                    event.clientY,
                    minuteStep,
                  );
                  if (
                    minutes === null ||
                    !isReservationStartSelectable(
                      getDateAtMinutes(date, minutes),
                    )
                  ) {
                    return;
                  }
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  suppressClickRef.current = true;
                  updateSelection({
                    anchorMinutes: minutes,
                    currentMinutes: minutes,
                    dragged: false,
                    input: "mouse",
                  });
                }}
                onPointerMove={(event) => {
                  if (event.pointerType === "touch") return;
                  const activeSelection = selectionRef.current;
                  if (activeSelection?.input !== "mouse") return;
                  const minutes = getMinutesFromClientY(
                    event.currentTarget,
                    event.clientY,
                    minuteStep,
                  );
                  if (minutes === null) return;
                  updateSelection({
                    ...activeSelection,
                    currentMinutes: minutes,
                    dragged: minutes !== activeSelection.anchorMinutes,
                  });
                }}
                onPointerUp={(event) => {
                  if (event.pointerType === "touch") return;
                  finishSelection();
                  setTimeout(() => {
                    suppressClickRef.current = false;
                  }, 0);
                }}
                onPointerCancel={(event) => {
                  if (event.pointerType !== "touch") {
                    suppressClickRef.current = false;
                    updateSelection(null);
                  }
                }}
                onContextMenu={(event) => {
                  if (
                    selectionRef.current?.input === "touch" &&
                    !isReservationTarget(event.target)
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                {HOURS.map((hour, hourIndex) => {
                  const startsAt = new Date(date);
                  startsAt.setHours(hourIndex, 0, 0, 0);
                  const isSelectable = isReservationStartSelectable(startsAt);
                  return (
                    <div
                      key={hour}
                      className="absolute inset-x-0 flex border-b"
                      style={{
                        top: hourIndex * MIN_ROW_HEIGHT,
                        height: MIN_ROW_HEIGHT,
                      }}
                    >
                      <div
                        className="shrink-0 border-r px-2 pt-1 text-[10px] text-muted-foreground"
                        style={{ width: LABEL_COLUMN_WIDTH }}
                      >
                        {hour}
                      </div>
                      <button
                        type="button"
                        className="min-w-0 flex-1 cursor-crosshair bg-background text-left outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted/20"
                        disabled={!isSelectable}
                        aria-label={t("reservations.schedule.mobile.addAt", {
                          time: format(startsAt, "HH:mm"),
                        })}
                        onClick={() => {
                          if (suppressClickRef.current) {
                            suppressClickRef.current = false;
                            return;
                          }
                          onRangeSelect({
                            startsAt,
                            endsAt: new Date(
                              startsAt.getTime() +
                                defaultDurationMinutes * 60_000,
                            ),
                          });
                        }}
                      />
                    </div>
                  );
                })}

                {isToday && (
                  <div
                    ref={nowRef}
                    className="pointer-events-none absolute z-20 h-px bg-destructive"
                    style={{
                      left: LABEL_COLUMN_WIDTH,
                      right: 0,
                      top:
                        ((new Date().getHours() * 60 +
                          new Date().getMinutes()) /
                          60) *
                        MIN_ROW_HEIGHT,
                    }}
                  />
                )}

                {selectionStyle && (
                  <div
                    className="pointer-events-none absolute z-20 rounded-md border border-primary bg-primary/20"
                    style={selectionStyle}
                  />
                )}

                {daySegments.map((segment) => {
                  const laneFraction = segment.lane / segment.laneCount;
                  return (
                    <ReservationBlock
                      key={segment.id}
                      segment={segment}
                      onSelect={() => {
                        if (suppressClickRef.current) {
                          suppressClickRef.current = false;
                          return;
                        }
                        onReservationSelect(segment.reservation.id);
                      }}
                      onCancel={
                        segment.reservation.canCancel && onReservationCancel
                          ? () => onReservationCancel(segment.reservation.id)
                          : undefined
                      }
                      isCancelPending={
                        cancellingReservationId === segment.reservation.id
                      }
                      onContextMenuOpenChange={(open) => {
                        contextMenuOpenRef.current = open;
                        if (open) resetSwipePosition();
                      }}
                      onContextMenuOutsidePress={(event) => {
                        const grid = gridRef.current;
                        if (!grid || !isEventInsideElement(event, grid)) return;
                        suppressClickRef.current = true;
                        touchSessionRef.current = null;
                        updateSelection(null);
                        resetSwipePosition();
                      }}
                      className={cn(
                        "absolute z-10",
                        segment.laneCount > 1 && "px-1",
                      )}
                      style={{
                        left: `calc(${laneFraction * 100}% + ${LABEL_COLUMN_WIDTH * (1 - laneFraction)}px + 1px)`,
                        width: `calc(${100 / segment.laneCount}% - ${LABEL_COLUMN_WIDTH / segment.laneCount + 2}px)`,
                        top: segment.startHour * MIN_ROW_HEIGHT + 1,
                        height: Math.max(
                          24,
                          segment.durationHours * MIN_ROW_HEIGHT - 2,
                        ),
                      }}
                    />
                  );
                })}
              </div>
            </div>
            {isDaySwipeEnabled && (
              <div
                data-slot="mobile-day-preview-next"
                className="pointer-events-none w-1/3 shrink-0"
                aria-hidden="true"
                inert
              >
                <MobileDayPreview
                  date={addDays(date, 1)}
                  dayIndex={dayIndex + 1}
                  segments={segments}
                />
              </div>
            )}
          </motion.div>
        </div>
      </ScrollArea>
    </div>
  );
}
