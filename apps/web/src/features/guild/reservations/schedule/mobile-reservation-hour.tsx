import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { LABEL_COLUMN_WIDTH, MIN_ROW_HEIGHT } from "./constants";
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
  return (
    <div
      className="absolute inset-x-0 flex border-b"
      style={{ top: hourIndex * MIN_ROW_HEIGHT, height: MIN_ROW_HEIGHT }}
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
        disabled={!isReservationStartSelectable(startsAt)}
        aria-label={t("reservations.schedule.mobile.addAt", {
          time: format(startsAt, "HH:mm"),
        })}
        onClick={() => onSelect(startsAt)}
      />
    </div>
  );
}
