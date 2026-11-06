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
  Ellipsis,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { HeaderSlotPortal } from "@/components/layout/header-slot-portal";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { ReservationSettingsInfoDialog } from "./reservation-settings-info-dialog";
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
      size={compactValue(isCompact, "icon", "sm")}
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

  // Touch layouts carry the actions in the app's top bar, as a toolbar's
  // trailing group: the frequent ones as icons, the rest under "More", and
  // adding a reservation as the one prominent action at the edge.
  const compactActions = (
    <HeaderSlotPortal slot="actions">
      <div
        role="toolbar"
        aria-label={t("reservations.schedule.header.actions")}
        className="flex items-center gap-1"
      >
        {todayButton}
        <ScheduleIconButton
          label={t("reservations.schedule.header.findNearestSlot")}
          size="icon"
          loading={isFindingNearestFreeSlot}
          onClick={onFindNearestFreeSlot}
        >
          <WandSparkles />
        </ScheduleIconButton>
        {canManageReservationSettings ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("reservations.schedule.header.more")}
                >
                  <Ellipsis />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setInfoOpen(true)}>
                <Info className="size-4" />
                {t("reservations.schedule.header.info")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!settingsHref}
                onClick={() => settingsHref && navigate({ to: settingsHref })}
              >
                <Settings className="size-4" />
                {t("reservations.schedule.header.settings")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // A single rarer action needs no menu of its own.
          <ScheduleIconButton
            label={t("reservations.schedule.header.info")}
            size="icon"
            onClick={() => setInfoOpen(true)}
          >
            <Info />
          </ScheduleIconButton>
        )}
        <Button
          type="button"
          size="icon"
          // The bar pulls its trailing controls out so ghost glyphs line up
          // with the page; a filled circle keeps the page's own inset.
          className="rounded-full max-md:mr-2.5"
          onClick={onAddReservation}
          aria-label={t("reservations.schedule.header.addReservation")}
        >
          <Plus />
        </Button>
      </div>
    </HeaderSlotPortal>
  );

  const actionToolbar = (
    <div
      role="toolbar"
      aria-label={t("reservations.schedule.header.actions")}
      className="ml-auto flex items-center gap-1"
    >
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
      {canManageReservationSettings && (
        <ScheduleIconButton
          label={t("reservations.schedule.header.settings")}
          size="icon-sm"
          disabled={!settingsHref}
          onClick={() => settingsHref && navigate({ to: settingsHref })}
        >
          <Settings />
        </ScheduleIconButton>
      )}
      <div aria-hidden="true" className="mx-1.5 h-5 w-px bg-border" />
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
      <Button
        type="button"
        size="sm"
        onClick={onAddReservation}
        aria-label={t("reservations.schedule.header.addReservation")}
      >
        <Plus />
        <span className="hidden sm:inline">
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

      {isCompact && compactActions}

      <ReservationSettingsInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        settings={settings}
      />
    </>
  );
}
