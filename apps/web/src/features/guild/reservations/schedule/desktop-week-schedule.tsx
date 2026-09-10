import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "cn";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
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
import {
  useDesktopWeekSelection,
  type DesktopWeekScheduleProps,
} from "./use-desktop-week-selection";

export function DesktopWeekSchedule({
  weekStart,
  segments,
  settings,
  onRangeSelect,
  onReservationSelect,
  onReservationCancel,
  cancellingReservationId,
}: DesktopWeekScheduleProps) {
  const {
    gridRef,
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
    now,
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
