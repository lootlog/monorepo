import { LoadingSlot } from "@/components/common/loading-slot";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { useCompactScheduleLayout } from "./schedule/use-compact-schedule-layout";

/**
 * Route-level stand-in for `ReservationsSchedule`: its header and dock with
 * the same control sizes, above the schedule's own loading state.
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
      <header
        className={cn(
          "shrink-0 border-b bg-background max-md:sticky max-md:top-(--page-sticky-top) max-md:z-30",
          isCompact
            ? "flex items-center gap-1 px-2 py-1"
            : "flex items-center gap-2 px-3 py-2",
        )}
      >
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
              "flex min-w-0 flex-col items-center text-sm",
              !isCompact && "sm:min-w-52",
            )}
          >
            <SkeletonLine className="h-3.5 w-32 max-w-full" />
            <SkeletonLine className="h-3.5 w-40 max-w-full" />
          </div>
          <Skeleton className={cn("rounded-lg", iconButton)} />
        </div>

        {!isCompact && actionToolbar}
      </header>

      {isCompact && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:fixed">
          {actionToolbar}
        </div>
      )}

      <div className="flex flex-1 items-center justify-center" role="status">
        <LoadingSlot size="small" />
        <span className="sr-only">{t("common.loading")}</span>
      </div>
    </div>
  );
};
