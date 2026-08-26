import { HOURS, LABEL_COLUMN_WIDTH, MIN_ROW_HEIGHT } from "./constants";
import { ReservationBlock } from "./reservation-block";
import { isReservationStartSelectable } from "./reservation-settings";
import type { ReservationSegment } from "./types";

type MobileDayPreviewProps = {
  date: Date;
  dayIndex: number;
  segments: ReservationSegment[];
};

export function MobileDayPreview({
  date,
  dayIndex,
  segments,
}: MobileDayPreviewProps) {
  const daySegments = segments.filter((segment) => segment.dayIdx === dayIndex);
  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <div
      className="relative select-none bg-background"
      style={{ height: HOURS.length * MIN_ROW_HEIGHT }}
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
            <div
              className={
                isSelectable
                  ? "min-w-0 flex-1 bg-background"
                  : "min-w-0 flex-1 bg-muted/20"
              }
            />
          </div>
        );
      })}

      {isToday && (
        <div
          className="pointer-events-none absolute z-20 h-px bg-destructive"
          style={{
            left: LABEL_COLUMN_WIDTH,
            right: 0,
            top:
              ((new Date().getHours() * 60 + new Date().getMinutes()) / 60) *
              MIN_ROW_HEIGHT,
          }}
        />
      )}

      {daySegments.map((segment) => {
        const laneFraction = segment.lane / segment.laneCount;
        return (
          <ReservationBlock
            key={segment.id}
            segment={segment}
            onSelect={() => undefined}
            className="pointer-events-none absolute z-10"
            style={{
              left: `calc(${laneFraction * 100}% + ${LABEL_COLUMN_WIDTH * (1 - laneFraction)}px + 1px)`,
              width: `calc(${100 / segment.laneCount}% - ${LABEL_COLUMN_WIDTH / segment.laneCount + 2}px)`,
              top: segment.startHour * MIN_ROW_HEIGHT + 1,
              height: Math.max(24, segment.durationHours * MIN_ROW_HEIGHT - 2),
            }}
          />
        );
      })}
    </div>
  );
}
