import { useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { pl } from "date-fns/locale";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  Plus,
  Settings,
  WandSparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReservationSettings } from "@lootlog/domain/reservations";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { ReservationSettingsInfoDialog } from "./reservation-settings-info-dialog";
import { ScheduleActionDock } from "./schedule-action-dock";
import { ScheduleBar } from "./schedule-bar";
import { ScheduleIconButton } from "./schedule-icon-button";

type ScheduleHeaderProps = {
  date: Date;
  isCompact: boolean;
  settings: ReservationSettings;
  settingsHref?: string;
  canManageReservationSettings: boolean;
  isFindingNearestFreeSlot: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onFindNearestFreeSlot: () => void;
  onAddReservation: () => void;
};

const compactValue = <Value,>(
  isCompact: boolean,
  compactValue: Value,
  regularValue: Value,
) => (isCompact ? compactValue : regularValue);

const getScheduleDateLabels = (date: Date, isCompact: boolean) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  return {
    label: compactValue(
      isCompact,
      format(date, "EEE, d MMM", { locale: pl }),
      `${format(weekStart, "d MMM", { locale: pl })} – ${format(weekEnd, "d MMM yyyy", { locale: pl })}`,
    ),
    shortCompactLabel: format(date, "d MMM", { locale: pl }),
    compactTitle: compactValue(
      isCompact,
      format(date, "EEEE, d MMMM yyyy", { locale: pl }),
      undefined,
    ),
  };
};

export function ScheduleHeader({
  date,
  isCompact,
  settings,
  settingsHref,
  canManageReservationSettings,
  isFindingNearestFreeSlot,
  onPrevious,
  onNext,
  onToday,
  onFindNearestFreeSlot,
  onAddReservation,
}: ScheduleHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [infoOpen, setInfoOpen] = useState(false);

  const { label, shortCompactLabel, compactTitle } = getScheduleDateLabels(
    date,
    isCompact,
  );

  // Touch layouts use the largest control step; desktop icon buttons match
  // the 32px labelled buttons.
  const iconButtonSize = compactValue(isCompact, "icon-lg", "icon-sm");

  const actionToolbar = (
    <div
      role="toolbar"
      aria-label={t("reservations.schedule.header.actions")}
      className={cn(
        "flex items-center gap-1",
        compactValue(
          isCompact,
          "pointer-events-auto rounded-xl border bg-background p-1 shadow-lg",
          "ml-auto",
        ),
      )}
    >
      <Button
        type="button"
        variant={compactValue(isCompact, "ghost", "outline")}
        size={compactValue(isCompact, "icon-lg", "sm")}
        onClick={onToday}
        aria-label={t("reservations.schedule.header.today")}
      >
        <CalendarDays />
        <span className={compactValue(isCompact, "sr-only", undefined)}>
          {t("reservations.schedule.header.today")}
        </span>
      </Button>
      <ScheduleIconButton
        label={t("reservations.schedule.header.findNearestSlot")}
        size={iconButtonSize}
        loading={isFindingNearestFreeSlot}
        onClick={onFindNearestFreeSlot}
      >
        <WandSparkles />
      </ScheduleIconButton>
      <ScheduleIconButton
        label={t("reservations.schedule.header.info")}
        size={iconButtonSize}
        onClick={() => setInfoOpen(true)}
      >
        <Info />
      </ScheduleIconButton>
      {canManageReservationSettings && (
        <ScheduleIconButton
          label={t("reservations.schedule.header.settings")}
          size={iconButtonSize}
          disabled={!settingsHref}
          onClick={() => settingsHref && navigate({ to: settingsHref })}
        >
          <Settings />
        </ScheduleIconButton>
      )}
      <Button
        type="button"
        size={compactValue(isCompact, "icon-lg", "sm")}
        onClick={onAddReservation}
        aria-label={t("reservations.schedule.header.addReservation")}
      >
        <Plus />
        <span
          className={compactValue(isCompact, "sr-only", "hidden sm:inline")}
        >
          {t("reservations.schedule.header.addReservation")}
        </span>
      </Button>
    </div>
  );

  return (
    <>
      <ScheduleBar isCompact={isCompact}>
        <div
          data-slot="schedule-date-navigation"
          className={cn(
            "items-center gap-1",
            compactValue(
              isCompact,
              "grid w-full min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem]",
              "flex",
            ),
          )}
        >
          <ScheduleIconButton
            label={compactValue(
              isCompact,
              t("reservations.schedule.header.previousDay"),
              t("reservations.schedule.header.previousWeek"),
            )}
            size={iconButtonSize}
            onClick={onPrevious}
          >
            <ChevronLeft />
          </ScheduleIconButton>
          <p
            aria-live="polite"
            className={cn(
              "min-w-0 truncate text-center text-sm font-semibold capitalize",
              compactValue(isCompact, undefined, "min-w-52"),
            )}
            title={compactTitle}
          >
            <span
              className={compactValue(
                isCompact,
                "max-[400px]:hidden",
                undefined,
              )}
            >
              {label}
            </span>
            {isCompact && (
              <span className="hidden max-[400px]:inline">
                {shortCompactLabel}
              </span>
            )}
          </p>
          <ScheduleIconButton
            label={compactValue(
              isCompact,
              t("reservations.schedule.header.nextDay"),
              t("reservations.schedule.header.nextWeek"),
            )}
            size={iconButtonSize}
            onClick={onNext}
          >
            <ChevronRight />
          </ScheduleIconButton>
        </div>

        {!isCompact && actionToolbar}
      </ScheduleBar>

      {isCompact && <ScheduleActionDock>{actionToolbar}</ScheduleActionDock>}

      <ReservationSettingsInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        settings={settings}
      />
    </>
  );
}
