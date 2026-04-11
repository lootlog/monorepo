import { Button } from "@lootlog/ui/components/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

type ScheduleHeaderProps = {
  currentWeek: number;
  currentYear: number;
  monthName: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onAddReservation: () => void;
};

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  currentWeek,
  currentYear,
  monthName,
  onPrevWeek,
  onNextWeek,
  onAddReservation,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex bg-background items-center justify-center md:justify-between px-4 py-3 border-b border-border flex-shrink-0 relative">
        <Button
          variant="default"
          size="sm"
          onClick={onAddReservation}
          className="hidden md:flex text-xs font-semibold"
        >
          {t("reservations.schedule.header.addReservation")}
        </Button>
        <div className="flex items-center gap-2">
          <button
            className="p-1 hover:bg-muted rounded-lg transition-colors"
            onClick={onPrevWeek}
            aria-label={t("reservations.schedule.header.previousWeek")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium min-w-28 text-center">
            {t("reservations.schedule.header.weekLabel", {
              week: currentWeek,
              year: currentYear,
              month: monthName,
            })}
          </span>
          <button
            className="p-1 hover:bg-muted rounded-lg transition-colors"
            onClick={onNextWeek}
            aria-label={t("reservations.schedule.header.nextWeek")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Button
        className="md:hidden fixed bottom-6 right-6 z-50 rounded-full h-14 w-14 shadow-lg p-0"
        onClick={onAddReservation}
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">
          {t("reservations.schedule.header.addReservation")}
        </span>
      </Button>
    </>
  );
};
