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
import { ScheduleIconButton } from "./schedule-icon-button";

type ScheduleHeaderProps = {
  spotName: string;
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
  spotName,
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

  // Icon buttons match the height of the labelled desktop buttons.
  const iconButtonClassName = compactValue(isCompact, "size-11", "size-9");

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
        size={compactValue(isCompact, "icon", "sm")}
        className={compactValue(isCompact, "size-11", undefined)}
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
        className={iconButtonClassName}
        loading={isFindingNearestFreeSlot}
        onClick={onFindNearestFreeSlot}
      >
        <WandSparkles />
      </ScheduleIconButton>
      <ScheduleIconButton
        label={t("reservations.schedule.header.info")}
        className={iconButtonClassName}
        onClick={() => setInfoOpen(true)}
      >
        <Info />
      </ScheduleIconButton>
      {canManageReservationSettings && (
        <ScheduleIconButton
          label={t("reservations.schedule.header.settings")}
          className={iconButtonClassName}
          disabled={!settingsHref}
          onClick={() => settingsHref && navigate({ to: settingsHref })}
        >
          <Settings />
        </ScheduleIconButton>
      )}
      <Button
        type="button"
        size={compactValue(isCompact, "icon", "sm")}
        className={compactValue(isCompact, "size-11", undefined)}
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
      <header
        className={cn(
          // Below `md` the document scrolls the schedule, so the day navigation
          // pins under the app bar.
          "shrink-0 border-b bg-background max-md:sticky max-md:top-14 max-md:z-30",
          compactValue(
            isCompact,
            "flex items-center gap-1 px-2 py-1",
            "flex items-center gap-2 px-3 py-2",
          ),
        )}
      >
        <div
          data-slot="schedule-date-navigation"
          className={cn(
            "items-center gap-1",
            compactValue(
              isCompact,
              "grid w-full min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem]",
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
            className={iconButtonClassName}
            onClick={onPrevious}
          >
            <ChevronLeft />
          </ScheduleIconButton>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-sm font-semibold" title={spotName}>
              {spotName}
            </h1>
            <p
              aria-live="polite"
              className={cn(
                "min-w-0 truncate text-sm font-semibold capitalize",
                compactValue(
                  isCompact,
                  "text-center",
                  "sm:min-w-52 sm:text-center",
                ),
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
          </div>
          <ScheduleIconButton
            label={compactValue(
              isCompact,
              t("reservations.schedule.header.nextDay"),
              t("reservations.schedule.header.nextWeek"),
            )}
            className={iconButtonClassName}
            onClick={onNext}
          >
            <ChevronRight />
          </ScheduleIconButton>
        </div>

        {!isCompact && actionToolbar}
      </header>

      {/* Below `md` the document scrolls the schedule, so the dock pins to the screen. */}
      {isCompact && (
        <div
          data-slot="schedule-action-dock"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:fixed"
        >
          {actionToolbar}
        </div>
      )}

      <ReservationSettingsInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        settings={settings}
      />
    </>
  );
}
