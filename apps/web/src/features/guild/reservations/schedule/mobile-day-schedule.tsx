import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import { addDays } from "date-fns";
import * as m from "framer-motion/m";
import { HOURS, LABEL_COLUMN_WIDTH, MIN_ROW_HEIGHT } from "./constants";
import { isEventInsideElement } from "./is-event-inside-element";
import {
  getDateAtMinutes,
  getMinutesFromClientY,
  isReservationTarget,
  resetSwipePosition,
} from "./mobile-day-interactions";
import { MobileDayPreview } from "./mobile-day-preview";
import { MobileReservationHour } from "./mobile-reservation-hour";
import { ReservationBlock } from "./reservation-block";
import { isReservationStartSelectable } from "./reservation-settings";
import {
  useMobileDaySchedule,
  type MobileDayScheduleProps,
} from "./use-mobile-day-schedule";

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
  const {
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
  } = useMobileDaySchedule({
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
  });
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
          <m.div
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
                {HOURS.map((hour, hourIndex) => (
                  <MobileReservationHour
                    key={hour}
                    date={date}
                    hour={hour}
                    hourIndex={hourIndex}
                    onSelect={selectHour}
                  />
                ))}

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
                      cancelDisabled={
                        cancellingReservationId !== null &&
                        cancellingReservationId !== undefined
                      }
                      isCancelPending={
                        cancellingReservationId === segment.reservation.id
                      }
                      onContextMenuOpenChange={(open) => {
                        contextMenuOpenRef.current = open;
                        if (open) resetSwipePosition(swipeX);
                      }}
                      onContextMenuOutsidePress={(event) => {
                        const grid = gridRef.current;
                        if (!grid || !isEventInsideElement(event, grid)) return;
                        suppressClickRef.current = true;
                        touchSessionRef.current = null;
                        updateSelection(null);
                        resetSwipePosition(swipeX);
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
          </m.div>
        </div>
      </ScrollArea>
    </div>
  );
}
