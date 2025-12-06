import { Button } from "@lootlog/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
      <Button
        variant="default"
        size="sm"
        onClick={onAddReservation}
        className="text-xs font-semibold"
      >
        Dodaj rezerwację
      </Button>
      <div className="flex items-center gap-2">
        <button
          className="p-1 hover:bg-muted rounded-lg transition-colors"
          onClick={onPrevWeek}
          aria-label="Poprzedni tydzień"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium min-w-28 text-center">
          Tydzień {currentWeek} ({currentYear}, {monthName})
        </span>
        <button
          className="p-1 hover:bg-muted rounded-lg transition-colors"
          onClick={onNextWeek}
          aria-label="Następny tydzień"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
