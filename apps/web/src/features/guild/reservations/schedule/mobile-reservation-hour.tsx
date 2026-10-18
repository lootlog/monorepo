import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import {
  LABEL_COLUMN_WIDTH,
  MIN_ROW_HEIGHT,
  SCHEDULE_HALF_HOUR_RULE_CLASS,
  SCHEDULE_HOUR_LABEL_CLASS,
  SCHEDULE_PAST_CLASS,
} from "./constants";
import { isReservationStartSelectable } from "./reservation-settings";

export function MobileReservationHour({
  date,
  hour,
  hourIndex,
  onSelect,
}: {
  date: Date;
  hour: string;
  hourIndex: number;
  onSelect: (startsAt: Date) => void;
}) {
  const { t } = useTranslation();
  const startsAt = new Date(date);
  startsAt.setHours(hourIndex, 0, 0, 0);
  const isSelectable = isReservationStartSelectable(startsAt);

  return (
    <div
      className="absolute inset-x-0 flex border-b"
      style={{ top: hourIndex * MIN_ROW_HEIGHT, height: MIN_ROW_HEIGHT }}
    >
      <div
        className={cn("shrink-0 border-r", SCHEDULE_HOUR_LABEL_CLASS)}
        style={{ width: LABEL_COLUMN_WIDTH }}
      >
        {hour}
      </div>
      <button
        type="button"
        className={cn(
          "relative min-w-0 flex-1 cursor-crosshair bg-background text-left outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed",
          SCHEDULE_HALF_HOUR_RULE_CLASS,
          !isSelectable && SCHEDULE_PAST_CLASS,
        )}
        disabled={!isSelectable}
        aria-label={t("reservations.schedule.mobile.addAt", {
          time: format(startsAt, "HH:mm"),
        })}
        onClick={() => onSelect(startsAt)}
      />
    </div>
  );
}
