import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  DAYS,
  HOURS,
  LABEL_COLUMN_WIDTH,
  MIN_ROW_HEIGHT,
  HEADER_HEIGHT,
} from "./constants";
import type { ReservationSegment } from "./types";
import { ReservationSegmentCard } from "./reservation-segment-card";
import { NowIndicator } from "./now-indicator";
import { ReservationQuickAddPopover } from "./reservation-quick-add-popover";
import type { MemberReferenceResponseDtoOutput as GuildMember } from "@/lib/api/generated/main/model";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { cn } from "@lootlog/ui/lib/utils";

type ScheduleGridProps = {
  weekStart: Date;
  segments: ReservationSegment[];
  membersByUserId: Map<string, GuildMember>;
  currentUserId?: string;
  canModerateReservations: boolean;
  isDeleting: boolean;
  onDeleteReservation: (
    reservationRecordId: number,
    action: "cancel" | "remove",
  ) => void;
  reservationKey: string;
};

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  weekStart,
  segments,
  membersByUserId,
  currentUserId,
  canModerateReservations,
  isDeleting,
  onDeleteReservation,
  reservationKey,
}) => {
  const [nowIndicatorRef, setNowIndicatorRef] = useState<HTMLDivElement | null>(
    null,
  );

  useEffect(() => {
    if (nowIndicatorRef) {
      nowIndicatorRef.scrollIntoView({
        block: "center",
        inline: "center",
      });
    }
  }, [nowIndicatorRef]);

  const [selection, setSelection] = useState<{
    start: { dayIdx: number; minutes: number };
    end: { dayIdx: number; minutes: number };
  } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionStartRef = useRef<{ dayIdx: number; minutes: number } | null>(
    null,
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest(".reservation-card")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top - HEADER_HEIGHT;

    if (x < LABEL_COLUMN_WIDTH) return;
    if (y < 0) return;

    const dayWidth = (rect.width - LABEL_COLUMN_WIDTH) / DAYS.length;
    const dayIdx = Math.floor((x - LABEL_COLUMN_WIDTH) / dayWidth);

    const totalMinutes = Math.floor((y / MIN_ROW_HEIGHT) * 60);
    const snappedMinutes = Math.floor(totalMinutes / 15) * 15;

    if (dayIdx >= 0 && dayIdx < DAYS.length) {
      const startPoint = { dayIdx, minutes: snappedMinutes };

      const startDate = new Date(weekStart);
      startDate.setDate(startDate.getDate() + dayIdx);
      startDate.setHours(
        Math.floor(snappedMinutes / 60),
        snappedMinutes % 60,
        0,
        0,
      );

      if (startDate.getTime() < Date.now()) {
        return;
      }

      const isOccupied = segments.some((segment) => {
        const resStart = segment.reservation.fromDate.getTime();
        const resEnd = segment.reservation.toDate.getTime();
        const slotStart = startDate.getTime();
        const slotEnd = slotStart + 15 * 60 * 1000;
        return slotStart < resEnd && slotEnd > resStart;
      });

      if (isOccupied) return;

      selectionStartRef.current = startPoint;
      setSelection({ start: startPoint, end: startPoint });
      setIsSelecting(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top - HEADER_HEIGHT;
      if (x >= LABEL_COLUMN_WIDTH && y >= 0) {
        const dayWidth = (rect.width - LABEL_COLUMN_WIDTH) / DAYS.length;
        const dayIdx = Math.floor((x - LABEL_COLUMN_WIDTH) / dayWidth);
        const totalMinutes = Math.floor((y / MIN_ROW_HEIGHT) * 60);
        const snappedMinutes = Math.floor(totalMinutes / 15) * 15;

        if (dayIdx >= 0 && dayIdx < DAYS.length) {
          const currentDate = new Date(weekStart);
          currentDate.setDate(currentDate.getDate() + dayIdx);
          currentDate.setHours(
            Math.floor(snappedMinutes / 60),
            snappedMinutes % 60,
            0,
            0,
          );
          if (currentDate.getTime() < Date.now()) {
            e.currentTarget.style.cursor = "not-allowed";
          } else {
            const isOccupied = segments.some((segment) => {
              const resStart = segment.reservation.fromDate.getTime();
              const resEnd = segment.reservation.toDate.getTime();
              const slotStart = currentDate.getTime();
              const slotEnd = slotStart + 15 * 60 * 1000;
              return slotStart < resEnd && slotEnd > resStart;
            });

            if (isOccupied) {
              e.currentTarget.style.cursor = "not-allowed";
            } else {
              e.currentTarget.style.cursor = "crosshair";
            }
          }
        }
      }
    }

    if (!isSelecting || !selectionStartRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top - HEADER_HEIGHT;

    if (x < LABEL_COLUMN_WIDTH) return;
    if (y < 0) return;

    const dayWidth = (rect.width - LABEL_COLUMN_WIDTH) / DAYS.length;
    const dayIdx = Math.floor((x - LABEL_COLUMN_WIDTH) / dayWidth);

    if (dayIdx >= 0 && dayIdx < DAYS.length) {
      const totalMinutes = Math.floor((y / MIN_ROW_HEIGHT) * 60);
      const snappedMinutes = Math.floor(totalMinutes / 15) * 15;

      const currentPointDate = new Date(weekStart);
      currentPointDate.setDate(currentPointDate.getDate() + dayIdx);
      currentPointDate.setHours(
        Math.floor(snappedMinutes / 60),
        snappedMinutes % 60,
        0,
        0,
      );

      if (currentPointDate.getTime() < Date.now()) {
        return;
      }

      const selStartDayIdx = selectionStartRef.current.dayIdx;
      const selStartMins = selectionStartRef.current.minutes;
      const anchorDate = new Date(weekStart);
      anchorDate.setDate(anchorDate.getDate() + selStartDayIdx);
      anchorDate.setHours(
        Math.floor(selStartMins / 60),
        selStartMins % 60,
        0,
        0,
      );
      const anchorTime = anchorDate.getTime();

      const targetTime = currentPointDate.getTime();

      if (targetTime > anchorTime) {
        let limitTime = Number.MAX_SAFE_INTEGER;
        segments.forEach((seg) => {
          const resStart = seg.reservation.fromDate.getTime();
          if (resStart >= anchorTime && resStart < limitTime) {
            limitTime = resStart;
          }
        });

        if (targetTime >= limitTime) {
          const clampedDate = new Date(limitTime - 15 * 60 * 1000);
          const diff = clampedDate.getTime() - weekStart.getTime();
          const dIdx = Math.floor(diff / (24 * 60 * 60 * 1000));
          const mins = Math.round((diff % (24 * 60 * 60 * 1000)) / (60 * 1000));

          setSelection((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              end: { dayIdx: dIdx, minutes: mins },
            };
          });
          return;
        }
      } else if (targetTime < anchorTime) {
        let limitTime = 0;
        segments.forEach((seg) => {
          const resEnd = seg.reservation.toDate.getTime();
          if (resEnd <= anchorTime && resEnd > limitTime) {
            limitTime = resEnd;
          }
        });

        if (targetTime < limitTime) {
          const clampedDate = new Date(limitTime);
          const diff = clampedDate.getTime() - weekStart.getTime();
          const dIdx = Math.floor(diff / (24 * 60 * 60 * 1000));
          const mins = Math.round((diff % (24 * 60 * 60 * 1000)) / (60 * 1000));

          setSelection((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              end: { dayIdx: dIdx, minutes: mins },
            };
          });
          return;
        }
      }

      setSelection((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          end: { dayIdx, minutes: snappedMinutes },
        };
      });
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    selectionStartRef.current = null;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.cursor = "";
    if (isSelecting) {
      handleMouseUp();
    }
  };

  const handleClosePopover = () => {
    setSelection(null);
  };

  const getSelectionDateRange = () => {
    if (!selection) return null;

    const p1 = new Date(weekStart);
    p1.setDate(p1.getDate() + selection.start.dayIdx);
    p1.setHours(
      Math.floor(selection.start.minutes / 60),
      selection.start.minutes % 60,
      0,
      0,
    );

    const p2 = new Date(weekStart);
    p2.setDate(p2.getDate() + selection.end.dayIdx);
    p2.setHours(
      Math.floor(selection.end.minutes / 60),
      selection.end.minutes % 60,
      0,
      0,
    );

    const start = p1.getTime() <= p2.getTime() ? p1 : p2;
    let end = p1.getTime() <= p2.getTime() ? p2 : p1;

    end = new Date(end.getTime() + 15 * 60 * 1000);

    return { start, end };
  };

  const getSelectionSegments = () => {
    const range = getSelectionDateRange();
    if (!range) return [];

    const segments: React.CSSProperties[] = [];
    const { start, end } = range;

    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);

    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    const current = new Date(startDay);
    while (current <= endDay) {
      const currentEnd = new Date(current);
      currentEnd.setHours(23, 59, 59, 999);

      const segStart = current.getTime() < start.getTime() ? start : current;
      const segEnd =
        currentEnd.getTime() > end.getTime()
          ? end
          : new Date(currentEnd.getTime() + 1);

      if (segStart < segEnd) {
        const dayDiff =
          (current.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000);
        const dayIdx = Math.round(dayDiff);

        if (dayIdx >= 0 && dayIdx < DAYS.length) {
          const startMins = segStart.getHours() * 60 + segStart.getMinutes();
          const segEndMins =
            (segEnd.getTime() - current.getTime()) / (1000 * 60);

          const top = HEADER_HEIGHT + (startMins / 60) * MIN_ROW_HEIGHT;
          const height = ((segEndMins - startMins) / 60) * MIN_ROW_HEIGHT;

          const dayWidthExpr = `(100% - ${LABEL_COLUMN_WIDTH}px) / ${DAYS.length}`;
          const left = `calc(${LABEL_COLUMN_WIDTH}px + (${dayIdx} * ${dayWidthExpr}))`;
          const width = `calc(${dayWidthExpr})`;

          segments.push({
            top,
            height,
            left,
            width,
          });
        }
      }
      current.setDate(current.getDate() + 1);
    }
    return segments;
  };

  const selectionRange = !isSelecting ? getSelectionDateRange() : null;

  return (
    <ScrollArea className="flex-1 min-h-0 max-h-full select-none">
      <div
        className="relative grid w-full cursor-default min-w-[800px] md:min-w-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          gridTemplateRows: `${HEADER_HEIGHT}px repeat(${HOURS.length}, minmax(${MIN_ROW_HEIGHT}px, 1fr))`,
          gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px repeat(${DAYS.length}, minmax(0, 1fr))`,
        }}
      >
        <div
          className="sticky top-[-1px] left-0 z-50 bg-background border-b border-border border-r"
          style={{ width: LABEL_COLUMN_WIDTH, height: HEADER_HEIGHT }}
        />
        {DAYS.map((day, idx) => {
          const date = new Date(weekStart);
          date.setDate(weekStart.getDate() + idx);
          const dayNumber = date.getDate();
          const isToday = new Date().toDateString() === date.toDateString();

          return (
            <div
              key={`header-${day}`}
              className={cn(
                "sticky top-[-1px] z-40 flex flex-col items-center justify-center py-2 border-b border-r border-border bg-background",
              )}
            >
              {isToday && (
                <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
              )}
              <span className="text-xs text-muted-foreground relative z-10">
                {day}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold mt-1 relative z-10",
                  isToday ? "text-primary" : "text-foreground",
                )}
              >
                {dayNumber}
              </span>
            </div>
          );
        })}

        {HOURS.map((hour, idx) => {
          const isCurrentHour = new Date().getHours() === idx;

          return [
            <div
              key={`label-${hour}`}
              className={cn(
                "sticky left-0 z-40 text-xs font-medium text-center px-2 border-b border-r border-border flex items-center justify-center bg-background",
                isCurrentHour ? "text-primary" : "text-muted-foreground",
              )}
              style={{ width: LABEL_COLUMN_WIDTH, height: MIN_ROW_HEIGHT }}
            >
              {isCurrentHour && (
                <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
              )}
              <span className="relative z-10">{hour}</span>
            </div>,
            ...DAYS.map((day, dayIdx) => {
              const backgroundClass =
                dayIdx % 2 === 0 ? "bg-background/50" : "bg-muted/50";

              return (
                <div
                  key={`${hour}-${day}`}
                  className={`relative border-b border-r border-border ${backgroundClass}`}
                  style={{
                    minWidth: 0,
                    minHeight: MIN_ROW_HEIGHT,
                    overflow: "hidden",
                  }}
                />
              );
            }),
          ];
        })}

        <NowIndicator ref={setNowIndicatorRef} weekStart={weekStart} />

        {selection &&
          getSelectionSegments().map((style, i) => (
            <div
              key={i}
              className="absolute bg-primary/20 border border-primary z-10 pointer-events-none"
              style={style}
            />
          ))}

        <AnimatePresence>
          {selectionRange &&
            !isSelecting &&
            selectionRange.end.getTime() - selectionRange.start.getTime() >=
              30 * 60 * 1000 && (
              <div
                className="absolute z-50 pointer-events-auto"
                style={{
                  ...getSelectionSegments().slice(-1)[0],
                  overflow: "visible",
                }}
              >
                <div
                  className={`absolute ${
                    Math.max(
                      selection?.start.minutes ?? 0,
                      selection?.end.minutes ?? 0,
                    ) >=
                    18 * 60
                      ? "top-0 -translate-y-[calc(100%+8px)]"
                      : "top-full mt-2"
                  } ${
                    Math.max(
                      selection?.start.dayIdx ?? 0,
                      selection?.end.dayIdx ?? 0,
                    ) >= 5
                      ? "-ml-[280px]"
                      : "ml-8"
                  }`}
                >
                  <ReservationQuickAddPopover
                    start={selectionRange.start}
                    end={selectionRange.end}
                    reservationKey={reservationKey}
                    currentUserId={currentUserId}
                    onClose={handleClosePopover}
                    onSuccess={handleClosePopover}
                  />
                </div>
              </div>
            )}
        </AnimatePresence>

        {segments.map((segment) => (
          <div
            key={`${segment.id}-${segment.dayIdx}-${segment.segmentStart.getTime()}`}
            className="contents reservation-card"
          >
            <ReservationSegmentCard
              segment={segment}
              membersByUserId={membersByUserId}
              currentUserId={currentUserId}
              canModerateReservations={canModerateReservations}
              isDeleting={isDeleting}
              onDeleteReservation={onDeleteReservation}
            />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
