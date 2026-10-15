import { LoadingSlot } from "@/components/common/loading-slot";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { ScheduleActionDock } from "./schedule/schedule-action-dock";
import { ScheduleBar } from "./schedule/schedule-bar";
import { useCompactScheduleLayout } from "./schedule/use-compact-schedule-layout";

/**
 * Route-level stand-in for `ReservationsSchedule`: its bar and dock with the
 * same control sizes, above the schedule's own loading state.
 */
export const ReservationDetailSkeleton = () => {
  const { t } = useTranslation();
  const { containerRef, isCompact } = useCompactScheduleLayout();
  const iconButton = isCompact ? "size-10" : "size-8";

  const actionToolbar = (
    <div
      className={cn(
        "flex items-center gap-1",
        isCompact ? "rounded-xl border bg-background p-1 shadow-lg" : "ml-auto",
      )}
    >
      <Skeleton
        className={cn("rounded-lg", isCompact ? "size-10" : "h-8 w-24")}
      />
      <Skeleton className={cn("rounded-lg", iconButton)} />
      <Skeleton className={cn("rounded-lg", iconButton)} />
      <Skeleton
        className={cn("rounded-lg", isCompact ? "size-10" : "h-8 w-8 sm:w-36")}
      />
    </div>
  );

  return (
    <div
      ref={containerRef}
      aria-busy="true"
      className="relative flex h-full min-h-0 flex-col overflow-hidden max-md:overflow-clip"
    >
      <ScheduleBar isCompact={isCompact}>
        <div
          className={cn(
            "items-center gap-1",
            isCompact
              ? "grid w-full min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem]"
              : "flex",
          )}
        >
          <Skeleton className={cn("rounded-lg", iconButton)} />
          <div
            className={cn(
              "flex min-w-0 justify-center text-sm",
              !isCompact && "min-w-52",
            )}
          >
            <SkeletonLine className="h-3.5 w-40 max-w-full" />
          </div>
          <Skeleton className={cn("rounded-lg", iconButton)} />
        </div>

        {!isCompact && actionToolbar}
      </ScheduleBar>

      {isCompact && <ScheduleActionDock>{actionToolbar}</ScheduleActionDock>}

      <div className="flex justify-center py-16" role="status">
        <LoadingSlot size="small" />
        <span className="sr-only">{t("common.loading")}</span>
      </div>
    </div>
  );
};
