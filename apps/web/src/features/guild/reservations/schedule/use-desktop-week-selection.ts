import type { ReservationSettings } from "@lootlog/domain/reservations";
import { differenceInCalendarDays } from "date-fns";
import { useEffect, useRef, useState } from "react";
import {
  DAYS,
  HEADER_HEIGHT,
  LABEL_COLUMN_WIDTH,
  MIN_ROW_HEIGHT,
} from "./constants";
import { isReservationStartSelectable } from "./reservation-settings";
import { scrollViewportToNowIndicator } from "./scroll-viewport-to-now-indicator";
import type { ReservationRange, ReservationSegment } from "./types";

export type DesktopWeekScheduleProps = {
  weekStart: Date;
  segments: ReservationSegment[];
  settings: ReservationSettings;
  onRangeSelect: (range: ReservationRange) => void;
  onReservationSelect: (reservationId: number) => void;
  onReservationCancel?: (reservationId: number) => void;
  cancellingReservationId?: number | null;
};

type SelectionPoint = { day: number; minutes: number };

export function useDesktopWeekSelection({
  weekStart,
  settings,
  onRangeSelect,
}: DesktopWeekScheduleProps) {
  const minuteStep = settings.reservationTimeGranularityMinutes;
  const gridRef = useRef<HTMLDivElement>(null);
  const nowRef = useRef<HTMLDivElement>(null);
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
  const isNowVisible = nowDay >= 0 && nowDay < DAYS.length;

  useEffect(() => {
    const nowIndicator = nowRef.current;
    if (!isNowVisible || !nowIndicator) return;
    scrollViewportToNowIndicator(nowIndicator);
  }, [isNowVisible]);

  return {
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
    now,
    nowDay,
    nowTop,
    selectionStyles,
  };
}
