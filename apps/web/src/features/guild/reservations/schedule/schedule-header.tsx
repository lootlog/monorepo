import { useNavigate } from "@tanstack/react-router";
import { Button } from "@lootlog/ui/components/button";
import { ChevronLeft, ChevronRight, Info, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ReservationSettingsInfoDialog } from "./reservation-settings-info-dialog";
import type { ReservationSettings } from "./reservation-settings";

type ScheduleHeaderProps = {
  currentWeek: number;
  currentYear: number;
  monthName: string;
  settings: ReservationSettings;
  settingsHref?: string;
  canManageReservationSettings: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onAddReservation: () => void;
};

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  currentWeek,
  currentYear,
  monthName,
  settings,
  settingsHref,
  canManageReservationSettings,
  onPrevWeek,
  onNextWeek,
  onAddReservation,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  const handleSettingsClick = () => {
    if (!settingsHref) {
      return;
    }

    void navigate({ to: settingsHref });
  };

  return (
    <>
      <div className="grid grid-cols-[1fr_auto_1fr] bg-background items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
        <div />
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

        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsInfoDialogOpen(true)}
            className="h-8 w-8 p-0"
            aria-label={t("reservations.schedule.header.info")}
          >
            <Info className="h-4 w-4" />
          </Button>
          {canManageReservationSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSettingsClick}
              disabled={!settingsHref}
              className="h-8 w-8 p-0"
              aria-label={t("reservations.schedule.header.settings")}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Button
        className="fixed bottom-6 right-6 z-50 rounded-full h-14 w-14 shadow-lg p-0"
        onClick={onAddReservation}
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">
          {t("reservations.schedule.header.addReservation")}
        </span>
      </Button>

      <ReservationSettingsInfoDialog
        open={isInfoDialogOpen}
        onOpenChange={setIsInfoDialogOpen}
        settings={settings}
      />
    </>
  );
};
