import { useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { pl } from "date-fns/locale";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  LoaderCircle,
  Plus,
  Settings,
  WandSparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReservationSettings } from "@lootlog/reservations";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "@lootlog/ui/lib/utils";
import { ReservationSettingsInfoDialog } from "./reservation-settings-info-dialog";

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

const trueOrUndefined = (value: boolean) => (value ? true : undefined);

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
  const nearestFreeSlotLabel = compactValue(
    isFindingNearestFreeSlot,
    t("reservations.schedule.header.findingNearestSlot"),
    t("reservations.schedule.header.findNearestSlot"),
  );
  const iconButtonClassName = compactValue(isCompact, "size-11", "size-8");
  const compactTitleFor = (key: string) =>
    compactValue(isCompact, t(key), undefined);
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
        title={compactTitleFor("reservations.schedule.header.today")}
      >
        <CalendarDays />
        <span className={compactValue(isCompact, "sr-only", undefined)}>
          {t("reservations.schedule.header.today")}
        </span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={iconButtonClassName}
        disabled={isFindingNearestFreeSlot}
        onClick={onFindNearestFreeSlot}
        aria-busy={trueOrUndefined(isFindingNearestFreeSlot)}
        aria-label={nearestFreeSlotLabel}
        title={nearestFreeSlotLabel}
      >
        {isFindingNearestFreeSlot ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <WandSparkles />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={iconButtonClassName}
        onClick={() => setInfoOpen(true)}
        aria-label={t("reservations.schedule.header.info")}
        title={compactTitleFor("reservations.schedule.header.info")}
      >
        <Info />
      </Button>
      {canManageReservationSettings && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconButtonClassName}
          disabled={!settingsHref}
          onClick={() => settingsHref && navigate({ to: settingsHref })}
          aria-label={t("reservations.schedule.header.settings")}
          title={compactTitleFor("reservations.schedule.header.settings")}
        >
          <Settings />
        </Button>
      )}
      <Button
        type="button"
        size={compactValue(isCompact, "icon", "sm")}
        className={compactValue(isCompact, "size-11", undefined)}
        onClick={onAddReservation}
        aria-label={t("reservations.schedule.header.addReservation")}
        title={compactTitleFor("reservations.schedule.header.addReservation")}
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
          "shrink-0 border-b bg-background",
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={iconButtonClassName}
            onClick={onPrevious}
            title={compactTitleFor("reservations.schedule.header.previousDay")}
            aria-label={compactValue(
              isCompact,
              t("reservations.schedule.header.previousDay"),
              t("reservations.schedule.header.previousWeek"),
            )}
          >
            <ChevronLeft />
          </Button>
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={iconButtonClassName}
            onClick={onNext}
            title={compactTitleFor("reservations.schedule.header.nextDay")}
            aria-label={compactValue(
              isCompact,
              t("reservations.schedule.header.nextDay"),
              t("reservations.schedule.header.nextWeek"),
            )}
          >
            <ChevronRight />
          </Button>
        </div>

        {!isCompact && actionToolbar}
      </header>

      {isCompact && (
        <div
          data-slot="schedule-action-dock"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
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
