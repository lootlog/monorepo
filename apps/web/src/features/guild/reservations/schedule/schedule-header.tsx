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
import { Button } from "@lootlog/ui/components/button";
import { cn } from "@lootlog/ui/lib/utils";
import { ReservationSettingsInfoDialog } from "./reservation-settings-info-dialog";
import type { ReservationSettings } from "./reservation-settings";

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
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const label = isCompact
    ? format(date, "EEE, d MMM", { locale: pl })
    : `${format(weekStart, "d MMM", { locale: pl })} – ${format(weekEnd, "d MMM yyyy", { locale: pl })}`;
  const shortCompactLabel = format(date, "d MMM", { locale: pl });
  const nearestFreeSlotLabel = isFindingNearestFreeSlot
    ? t("reservations.schedule.header.findingNearestSlot")
    : t("reservations.schedule.header.findNearestSlot");
  const actionToolbar = (
    <div
      role="toolbar"
      aria-label={t("reservations.schedule.header.actions")}
      className={cn(
        "flex items-center gap-1",
        isCompact
          ? "pointer-events-auto rounded-xl border bg-background p-1 shadow-lg"
          : "ml-auto",
      )}
    >
      <Button
        type="button"
        variant={isCompact ? "ghost" : "outline"}
        size={isCompact ? "icon" : "sm"}
        className={cn(isCompact && "size-11")}
        onClick={onToday}
        aria-label={t("reservations.schedule.header.today")}
        title={isCompact ? t("reservations.schedule.header.today") : undefined}
      >
        <CalendarDays />
        <span className={cn(isCompact && "sr-only")}>
          {t("reservations.schedule.header.today")}
        </span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(isCompact ? "size-11" : "size-8")}
        disabled={isFindingNearestFreeSlot}
        onClick={onFindNearestFreeSlot}
        aria-busy={isFindingNearestFreeSlot || undefined}
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
        className={cn(isCompact ? "size-11" : "size-8")}
        onClick={() => setInfoOpen(true)}
        aria-label={t("reservations.schedule.header.info")}
        title={isCompact ? t("reservations.schedule.header.info") : undefined}
      >
        <Info />
      </Button>
      {canManageReservationSettings && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(isCompact ? "size-11" : "size-8")}
          disabled={!settingsHref}
          onClick={() => settingsHref && navigate({ to: settingsHref })}
          aria-label={t("reservations.schedule.header.settings")}
          title={
            isCompact ? t("reservations.schedule.header.settings") : undefined
          }
        >
          <Settings />
        </Button>
      )}
      <Button
        type="button"
        size={isCompact ? "icon" : "sm"}
        className={cn(isCompact && "size-11")}
        onClick={onAddReservation}
        aria-label={t("reservations.schedule.header.addReservation")}
        title={
          isCompact
            ? t("reservations.schedule.header.addReservation")
            : undefined
        }
      >
        <Plus />
        <span className={cn(isCompact ? "sr-only" : "hidden sm:inline")}>
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
          isCompact
            ? "flex items-center gap-1 px-2 py-1"
            : "flex items-center gap-2 px-3 py-2",
        )}
      >
        <div
          data-slot="schedule-date-navigation"
          className={cn(
            "items-center gap-1",
            isCompact
              ? "grid w-full min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem]"
              : "flex",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(isCompact ? "size-11" : "size-8")}
            onClick={onPrevious}
            title={
              isCompact
                ? t("reservations.schedule.header.previousDay")
                : undefined
            }
            aria-label={
              isCompact
                ? t("reservations.schedule.header.previousDay")
                : t("reservations.schedule.header.previousWeek")
            }
          >
            <ChevronLeft />
          </Button>
          <p
            aria-live="polite"
            className={cn(
              "min-w-0 truncate text-sm font-semibold capitalize",
              isCompact ? "text-center" : "sm:min-w-52 sm:text-center",
            )}
            title={
              isCompact
                ? format(date, "EEEE, d MMMM yyyy", { locale: pl })
                : undefined
            }
          >
            <span className={cn(isCompact && "max-[400px]:hidden")}>
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
            className={cn(isCompact ? "size-11" : "size-8")}
            onClick={onNext}
            title={
              isCompact ? t("reservations.schedule.header.nextDay") : undefined
            }
            aria-label={
              isCompact
                ? t("reservations.schedule.header.nextDay")
                : t("reservations.schedule.header.nextWeek")
            }
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
