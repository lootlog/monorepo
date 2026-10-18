import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useState, type ReactNode } from "react";
import {
  DAYS,
  HEADER_HEIGHT,
  HOURS,
  LABEL_COLUMN_WIDTH,
  MIN_ROW_HEIGHT,
  SCHEDULE_BAR_HEIGHT,
  SCHEDULE_HALF_HOUR_RULE_CLASS,
  SCHEDULE_HOUR_LABEL_CLASS,
  SCHEDULE_PAST_CLASS,
} from "./constants";
import { isEventInsideElement } from "./is-event-inside-element";
import { ReservationBlock } from "./reservation-block";
import { ScheduleNowLine } from "./schedule-now-line";
import {
  clampReservationEndDate,
  isReservationStartSelectable,
} from "./reservation-settings";
import {
  useDesktopWeekSelection,
  type DesktopWeekScheduleProps,
} from "./use-desktop-week-selection";

/**
 * A day column's horizontal position, for overlays laid over the grid. They
 * are absolute, not grid items, which would take cells from the auto-placed
 * hour slots and shift every row after them.
 */
const getDayColumnStyle = (day: number) => ({
  left: `calc(${(day / DAYS.length) * 100}% + ${LABEL_COLUMN_WIDTH * (1 - day / DAYS.length)}px)`,
  width: `calc(${100 / DAYS.length}% - ${LABEL_COLUMN_WIDTH / DAYS.length}px)`,
});

// The day headings pin under the schedule bar, which pins under the app bar.
const dayHeadingTop = `calc(var(--page-sticky-top) + ${SCHEDULE_BAR_HEIGHT})`;

export function DesktopWeekSchedule({
  header,
  weekStart,
  segments,
  settings,
  onRangeSelect,
  onReservationSelect,
  onReservationCancel,
  cancellingReservationId,
}: DesktopWeekScheduleProps & {
  /** The schedule bar, which scrolls with the hours in the page scroller. */
  header?: ReactNode;
}) {
  const {
    gridRef,
    nowRef,
    isNowVisible,
    isPointerOverUnavailableSlot,
    contextMenuOpenRef,
    suppressSelectionRef,
    setSelection,
    pointFromPointer,
    dateFromPoint,
    setIsPointerOverUnavailableSlot,
    selection,
    pointFromDate,
    finishSelection,
    nowDay,
    nowTop,
    selectionStyles,
  } = useDesktopWeekSelection({
    weekStart,
    segments,
    settings,
    onRangeSelect,
    onReservationSelect,
    onReservationCancel,
    cancellingReservationId,
  });

  // The slot under the mouse: a line marks where a reservation would start
  // across the week, and the day's column is lit, so both axes read at once.
  const [hoverPoint, setHoverPoint] = useState<{
    day: number;
    minutes: number;
  } | null>(null);

  const hoverTop = hoverPoint
    ? HEADER_HEIGHT + (hoverPoint.minutes / 60) * MIN_ROW_HEIGHT
    : 0;

  const hoverTime = hoverPoint
    ? `${String(Math.floor(hoverPoint.minutes / 60)).padStart(2, "0")}:${String(hoverPoint.minutes % 60).padStart(2, "0")}`
    : "";

  return (
    <ScrollArea data-under-top-bar className="min-h-0 flex-1 select-none">
      {header}
      {/* Isolated, so reservations scrolling past stay under the bar. */}
      <div
        ref={gridRef}
        className={cn(
          "relative isolate grid w-full",
          isPointerOverUnavailableSlot
            ? "cursor-not-allowed"
            : "cursor-crosshair",
        )}
        style={{
          gridTemplateRows: `${HEADER_HEIGHT}px repeat(${HOURS.length}, ${MIN_ROW_HEIGHT}px)`,
          gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px repeat(${DAYS.length}, minmax(0, 1fr))`,
        }}
        onPointerDown={(event) => {
          if (contextMenuOpenRef.current || suppressSelectionRef.current) {
            suppressSelectionRef.current = true;
            setSelection(null);

            return;
          }

          if (event.button !== 0) return;
          const point = pointFromPointer(event);

          if (!point) return;

          if (!isReservationStartSelectable(dateFromPoint(point))) {
            setIsPointerOverUnavailableSlot(true);

            return;
          }

          event.currentTarget.setPointerCapture(event.pointerId);
          setSelection({ anchor: point, current: point });
        }}
        onPointerMove={(event) => {
          const point = pointFromPointer(event);

          const isOverReservation =
            event.target instanceof Element &&
            event.target.closest(".reservation-card") !== null;

          const isUnavailable =
            point !== null &&
            !isReservationStartSelectable(dateFromPoint(point));

          setIsPointerOverUnavailableSlot(!isOverReservation && isUnavailable);

          const nextHover =
            event.pointerType === "mouse" &&
            point &&
            !isOverReservation &&
            !isUnavailable
              ? point
              : null;

          if (
            nextHover?.day !== hoverPoint?.day ||
            nextHover?.minutes !== hoverPoint?.minutes
          ) {
            setHoverPoint(nextHover);
          }

          if (!selection || !point) return;
          const anchorDate = dateFromPoint(selection.anchor);

          const targetDate = clampReservationEndDate({
            anchorDate,
            targetDate: dateFromPoint(point),
            settings,
          });

          setSelection({
            anchor: selection.anchor,
            current: pointFromDate(targetDate),
          });
        }}
        onPointerUp={() => {
          if (suppressSelectionRef.current) {
            suppressSelectionRef.current = false;

            return;
          }

          finishSelection();
        }}
        onPointerLeave={() => {
          setIsPointerOverUnavailableSlot(false);
          setHoverPoint(null);
        }}
        onPointerCancel={() => {
          setSelection(null);
          suppressSelectionRef.current = false;
          setIsPointerOverUnavailableSlot(false);
        }}
      >
        <div
          className="sticky left-0 z-40 border-b border-r bg-background"
          style={{ top: dayHeadingTop }}
        />
        {DAYS.map((_, index) => {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + index);
          const isToday = index === nowDay;

          return (
            <div
              key={date.toISOString()}
              className="sticky z-30 flex flex-col items-center justify-center gap-0.5 border-b border-r bg-background"
              style={{ top: dayHeadingTop }}
            >
              <span
                className={cn(
                  "text-xs text-muted-foreground first-letter:uppercase",
                  isToday && "font-medium text-primary",
                  hoverPoint?.day === index && !isToday && "text-foreground",
                )}
              >
                {format(date, "EEE", { locale: pl })}
              </span>
              <span
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {format(date, "d")}
              </span>
            </div>
          );
        })}

        {HOURS.flatMap((hour) => [
          <div
            key={`label-${hour}`}
            className={cn(
              "sticky left-0 z-10 border-b border-r bg-background",
              SCHEDULE_HOUR_LABEL_CLASS,
            )}
          >
            {hour}
          </div>,
          ...DAYS.map((_, dayIndex) => (
            <div
              key={`${hour}-${dayIndex}`}
              className={cn(
                "relative border-b border-r",
                SCHEDULE_HALF_HOUR_RULE_CLASS,
              )}
            />
          )),
        ])}

        {/* Days and hours that have passed, where no reservation can start. */}
        {DAYS.map((_, dayIndex) =>
          dayIndex > nowDay ? null : (
            <div
              key={`past-${dayIndex}`}
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute",
                SCHEDULE_PAST_CLASS,
              )}
              style={{
                ...getDayColumnStyle(dayIndex),
                top: HEADER_HEIGHT,
                height:
                  dayIndex === nowDay
                    ? nowTop - HEADER_HEIGHT
                    : HOURS.length * MIN_ROW_HEIGHT,
              }}
            />
          ),
        )}

        {hoverPoint && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bg-foreground/[0.035]"
              style={{
                ...getDayColumnStyle(hoverPoint.day),
                top: HEADER_HEIGHT,
                height: HOURS.length * MIN_ROW_HEIGHT,
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-0 z-20 border-t border-dashed border-primary/60"
              style={{ top: hoverTop, left: LABEL_COLUMN_WIDTH }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 z-20 flex -translate-y-1/2 justify-end pr-1"
              style={{ top: hoverTop, width: LABEL_COLUMN_WIDTH }}
            >
              <span className="rounded-sm bg-primary px-1 text-[11px] leading-4 font-medium tabular-nums text-primary-foreground">
                {hoverTime}
              </span>
            </div>
          </>
        )}

        {isNowVisible && (
          <ScheduleNowLine
            ref={nowRef}
            style={{
              top: nowTop,
              ...getDayColumnStyle(nowDay),
            }}
          />
        )}

        {selectionStyles.map(({ day, ...style }) => (
          <div
            key={day}
            className="pointer-events-none absolute z-20 rounded-md border border-primary bg-primary/20"
            style={style}
          />
        ))}

        {segments.map((segment) => {
          if (segment.dayIdx < 0 || segment.dayIdx >= DAYS.length) return null;

          const startFraction =
            (segment.dayIdx + segment.lane / segment.laneCount) / DAYS.length;

          const lanePercentage = 100 / (DAYS.length * segment.laneCount);

          const laneLabelOffset =
            LABEL_COLUMN_WIDTH / (DAYS.length * segment.laneCount);

          return (
            <ReservationBlock
              key={segment.id}
              segment={segment}
              onSelect={() => onReservationSelect(segment.reservation.id)}
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
              }}
              onContextMenuOutsidePress={(event) => {
                const grid = gridRef.current;

                if (!grid || !isEventInsideElement(event, grid)) return;
                suppressSelectionRef.current = true;
                setSelection(null);
              }}
              className="absolute z-10"
              style={{
                left: `calc(${startFraction * 100}% + ${LABEL_COLUMN_WIDTH * (1 - startFraction)}px + 1px)`,
                width: `calc(${lanePercentage}% - ${laneLabelOffset + 2}px)`,
                top: HEADER_HEIGHT + segment.startHour * MIN_ROW_HEIGHT + 1,
                height: Math.max(
                  24,
                  segment.durationHours * MIN_ROW_HEIGHT - 2,
                ),
              }}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}
