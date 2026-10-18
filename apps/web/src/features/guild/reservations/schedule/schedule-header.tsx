import { useState } from "react";
import {
  addDays,
  format,
  isSameDay,
  isSameMonth,
  isSameWeek,
  isSameYear,
  startOfWeek,
} from "date-fns";
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
import { upperFirst } from "es-toolkit";
import { useTranslation } from "react-i18next";
import type { ReservationSettings } from "@lootlog/domain/reservations";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
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

const formatDate = (date: Date, pattern: string) =>
  format(date, pattern, { locale: pl });

/** "12–18 października 2026", or both months and years where they differ. */
const formatWeekRange = (weekStart: Date, weekEnd: Date) => {
  if (isSameMonth(weekStart, weekEnd)) {
    return `${formatDate(weekStart, "d")}–${formatDate(weekEnd, "d MMMM yyyy")}`;
  }

  const startPattern = isSameYear(weekStart, weekEnd)
    ? "d MMMM"
    : "d MMMM yyyy";

  return `${formatDate(weekStart, startPattern)} – ${formatDate(weekEnd, "d MMMM yyyy")}`;
};

const getScheduleDateLabels = (date: Date, isCompact: boolean) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  return {
    label: compactValue(
      isCompact,
      upperFirst(formatDate(date, "EEEE, d MMMM")),
      formatWeekRange(weekStart, weekEnd),
    ),
    shortCompactLabel: formatDate(date, "d MMM"),
    compactTitle: compactValue(
      isCompact,
      upperFirst(formatDate(date, "EEEE, d MMMM yyyy")),
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

  const now = new Date(useMinuteTimestamp());

  const showsToday = isCompact
    ? isSameDay(date, now)
    : isSameWeek(date, now, { weekStartsOn: 1 });

  const todayButton = (
    <Button
      type="button"
      variant={compactValue(isCompact, "ghost", "outline")}
      size={compactValue(isCompact, "icon-lg", "sm")}
      disabled={showsToday}
      onClick={onToday}
      aria-label={t("reservations.schedule.header.today")}
    >
      <CalendarDays />
      <span className={compactValue(isCompact, "sr-only", undefined)}>
        {t("reservations.schedule.header.today")}
      </span>
    </Button>
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
      {isCompact && todayButton}
      {isCompact ? (
        <ScheduleIconButton
          label={t("reservations.schedule.header.info")}
          size={iconButtonSize}
          onClick={() => setInfoOpen(true)}
        >
          <Info />
        </ScheduleIconButton>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon=<Info />
          aria-label={t("reservations.schedule.header.info")}
          onClick={() => setInfoOpen(true)}
        >
          {t("reservations.schedule.header.rules")}
        </Button>
      )}
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
      {!isCompact && (
        <div aria-hidden="true" className="mx-1.5 h-5 w-px bg-border" />
      )}
      {isCompact ? (
        <ScheduleIconButton
          label={t("reservations.schedule.header.findNearestSlot")}
          size={iconButtonSize}
          loading={isFindingNearestFreeSlot}
          onClick={onFindNearestFreeSlot}
        >
          <WandSparkles />
        </ScheduleIconButton>
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={isFindingNearestFreeSlot}
                icon=<WandSparkles />
                aria-label={t("reservations.schedule.header.findNearestSlot")}
                onClick={onFindNearestFreeSlot}
              />
            }
          >
            <span className="max-xl:sr-only">
              {t("reservations.schedule.header.findNearestSlot")}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="xl:hidden">
            {t("reservations.schedule.header.findNearestSlot")}
          </TooltipContent>
        </Tooltip>
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

  const dateLabel = (
    <p
      aria-live="polite"
      className={cn(
        "text-sm font-semibold",
        compactValue(
          isCompact,
          "min-w-0 truncate text-center",
          "ml-2 shrink-0 whitespace-nowrap text-base",
        ),
      )}
      title={compactTitle}
    >
      <span
        className={compactValue(isCompact, "max-[400px]:hidden", undefined)}
      >
        {label}
      </span>
      {isCompact && (
        <span className="hidden max-[400px]:inline">{shortCompactLabel}</span>
      )}
    </p>
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
              "flex min-w-0",
            ),
          )}
        >
          {!isCompact && <div className="mr-1">{todayButton}</div>}
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
          {isCompact ? dateLabel : null}
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
          {isCompact ? null : dateLabel}
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
