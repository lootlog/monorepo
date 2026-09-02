import { useRef, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { pl } from "date-fns/locale";
import type { ReservationSettings } from "@lootlog/domain/reservations";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "@lootlog/ui/lib/utils";
import {
  DAYS,
  HEADER_HEIGHT,
  HOURS,
  LABEL_COLUMN_WIDTH,
  MIN_ROW_HEIGHT,
} from "./constants";
import { isEventInsideElement } from "./is-event-inside-element";
import { ReservationBlock } from "./reservation-block";
import {
  clampReservationEndDate,
  isReservationStartSelectable,
} from "./reservation-settings";
import type { ReservationRange, ReservationSegment } from "./types";

type DesktopWeekScheduleProps = {
  weekStart: Date;
  segments: ReservationSegment[];
  settings: ReservationSettings;
  onRangeSelect: (range: ReservationRange) => void;
  onReservationSelect: (reservationId: number) => void;
  onReservationCancel?: (reservationId: number) => void;
  cancellingReservationId?: number | null;
};

type SelectionPoint = { day: number; minutes: number };

export function DesktopWeekSchedule({
  weekStart,
  segments,
  settings,
  onRangeSelect,
  onReservationSelect,
  onReservationCancel,
  cancellingReservationId,
}: DesktopWeekScheduleProps) {
  const minuteStep = settings.reservationTimeGranularityMinutes;
  const gridRef = useRef<HTMLDivElement>(null);
  const contextMenuOpenRef = useRef(false);
  const suppressSelectionRef = useRef(false);
  const [selection, setSelection] = useState<{
    anchor: SelectionPoint;
    current: SelectionPoint;
  } | null>(null);
  const [isPointerOverUnavailableSlot, setIsPointerOverUnavailableSlot] =
    useState(false);

  const pointFromPointer = (
    event: React.PointerEvent<HTMLDivElement>,
  ): SelectionPoint | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const x = event.clientX - rect.left - LABEL_COLUMN_WIDTH;
    const y = event.clientY - rect.top - HEADER_HEIGHT;
    if (x < 0 || y < 0) return null;
    const dayWidth = (rect.width - LABEL_COLUMN_WIDTH) / DAYS.length;
    const day = Math.min(
      DAYS.length - 1,
      Math.max(0, Math.floor(x / dayWidth)),
    );
    const rawMinutes = (y / MIN_ROW_HEIGHT) * 60;
    const minutes = Math.min(
      24 * 60 - minuteStep,
      Math.max(0, Math.floor(rawMinutes / minuteStep) * minuteStep),
    );
    return { day, minutes };
  };

  const dateFromPoint = (point: SelectionPoint) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + point.day);
    date.setHours(0, point.minutes, 0, 0);
    return date;
  };

  const pointFromDate = (date: Date): SelectionPoint => ({
    day: differenceInCalendarDays(date, weekStart),
    minutes: date.getHours() * 60 + date.getMinutes(),
  });

  const getSelectionRange = (): ReservationRange | null => {
    if (!selection) return null;
    const first = dateFromPoint(selection.anchor);
    const second = dateFromPoint(selection.current);
    const startsAt = first < second ? first : second;
    const lastStart = first < second ? second : first;
    const endsAt = new Date(lastStart.getTime() + minuteStep * 60_000);
    return { startsAt, endsAt };
  };

  const selectionStyles = (() => {
    const range = getSelectionRange();
    if (!range) return [];
    const styles: Array<React.CSSProperties & { day: number }> = [];
    let dayStart = new Date(range.startsAt);
    dayStart.setHours(0, 0, 0, 0);

    while (dayStart < range.endsAt) {
      const nextDayStart = new Date(dayStart);
      nextDayStart.setDate(nextDayStart.getDate() + 1);
      const segmentStart =
        range.startsAt > dayStart ? range.startsAt : dayStart;
      const segmentEnd =
        range.endsAt < nextDayStart ? range.endsAt : nextDayStart;
      const day = differenceInCalendarDays(dayStart, weekStart);

      if (day >= 0 && day < DAYS.length && segmentStart < segmentEnd) {
        const startMinutes =
          segmentStart.getHours() * 60 + segmentStart.getMinutes();
        const endMinutes =
          segmentEnd >= nextDayStart
            ? 24 * 60
            : segmentEnd.getHours() * 60 + segmentEnd.getMinutes();
        const dayFraction = day / DAYS.length;
        styles.push({
          day,
          left: `calc(${dayFraction * 100}% + ${LABEL_COLUMN_WIDTH * (1 - dayFraction)}px)`,
          width: `calc(${100 / DAYS.length}% - ${LABEL_COLUMN_WIDTH / DAYS.length}px)`,
          top: HEADER_HEIGHT + (startMinutes / 60) * MIN_ROW_HEIGHT,
          height: ((endMinutes - startMinutes) / 60) * MIN_ROW_HEIGHT,
        });
      }

      dayStart = nextDayStart;
    }

    return styles;
  })();

  const finishSelection = () => {
    const range = getSelectionRange();
    if (!range) return;
    setSelection(null);
    if (!isReservationStartSelectable(range.startsAt)) return;
    onRangeSelect(range);
  };

  const now = new Date();
  const nowDay = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate(),
      ).getTime()) /
      86_400_000,
  );
  const nowTop =
    HEADER_HEIGHT +
    ((now.getHours() * 60 + now.getMinutes()) / 60) * MIN_ROW_HEIGHT;

  return (
    <ScrollArea className="min-h-0 flex-1 select-none">
      <div
        ref={gridRef}
        className={cn(
          "relative grid w-full",
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
          setIsPointerOverUnavailableSlot(
            !isOverReservation &&
              point !== null &&
              !isReservationStartSelectable(dateFromPoint(point)),
          );
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
        onPointerLeave={() => setIsPointerOverUnavailableSlot(false)}
        onPointerCancel={() => {
          setSelection(null);
          suppressSelectionRef.current = false;
          setIsPointerOverUnavailableSlot(false);
        }}
      >
        <div className="sticky left-0 top-0 z-40 border-b border-r bg-background" />
        {DAYS.map((_, index) => {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + index);
          const isToday = date.toDateString() === now.toDateString();
          return (
            <div
              key={date.toISOString()}
              className={cn(
                "sticky top-0 z-30 flex flex-col items-center justify-center border-b border-r bg-background",
                isToday && "border-b-primary",
              )}
            >
              <span className="text-xs capitalize text-muted-foreground">
                {format(date, "EEE", { locale: pl })}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  isToday && "text-primary",
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
            className="sticky left-0 z-10 flex items-start justify-center border-b border-r bg-background pt-1 text-[10px] text-muted-foreground"
          >
            {hour}
          </div>,
          ...DAYS.map((_, dayIndex) => (
            <div
              key={`${hour}-${dayIndex}`}
              className={cn(
                "border-b border-r",
                dayIndex % 2 === 1 && "bg-muted/20",
              )}
            />
          )),
        ])}

        {nowDay >= 0 && nowDay < DAYS.length && (
          <div
            className="pointer-events-none absolute z-20 h-px bg-destructive"
            style={{
              top: nowTop,
              left: `calc(${(nowDay / DAYS.length) * 100}% + ${LABEL_COLUMN_WIDTH * (1 - nowDay / DAYS.length)}px)`,
              width: `calc(${100 / DAYS.length}% - ${LABEL_COLUMN_WIDTH / DAYS.length}px)`,
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

        {segments
          .filter(
            (segment) => segment.dayIdx >= 0 && segment.dayIdx < DAYS.length,
          )
          .map((segment) => {
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
