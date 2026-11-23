import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { HeaderSlotPortal } from "@/components/layout/header-slot-portal";
import { TopBarItemGroup } from "@/components/layout/top-bar-item-group";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { ScheduleBar } from "./schedule/schedule-bar";
import { useCompactScheduleLayout } from "./schedule/use-compact-schedule-layout";
import {
  DAYS,
  HEADER_HEIGHT,
  HOURS,
  LABEL_COLUMN_WIDTH,
  MIN_ROW_HEIGHT,
} from "./schedule/constants";

export const ReservationDetailSkeleton = () => {
  const { t } = useTranslation();
  const { containerRef, isCompact } = useCompactScheduleLayout();
  const isMobile = useIsMobile();
  const iconButton = isCompact ? "size-10" : "size-8";
  const dayCount = isCompact ? 1 : DAYS.length;

  const actionToolbar = isCompact ? (
    <HeaderSlotPortal slot="actions">
      <div className="flex items-center gap-2">
        <TopBarItemGroup>
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="size-9 rounded-full" />
        </TopBarItemGroup>
        <Skeleton
          className={cn("rounded-full", isMobile ? "size-10" : "size-9")}
        />
      </div>
    </HeaderSlotPortal>
  ) : (
    <div className="ml-auto flex items-center gap-1">
      <Skeleton className="h-8 w-24 rounded-lg" />
      <Skeleton className="size-8 rounded-lg" />
      <Skeleton className="size-8 rounded-lg" />
      <Skeleton className="h-8 w-8 rounded-lg sm:w-36" />
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

      {isCompact && actionToolbar}

      <div
        role="status"
        aria-label={t("common.loading")}
        className="grid min-h-0 w-full flex-1 overflow-hidden"
        style={{
          gridTemplateRows: `${HEADER_HEIGHT}px repeat(${HOURS.length}, ${MIN_ROW_HEIGHT}px)`,
          gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px repeat(${dayCount}, minmax(0, 1fr))`,
        }}
      >
        <div className="border-r border-b" />
        {Array.from({ length: dayCount }, (_, dayIndex) => (
          <div
            key={dayIndex}
            className="flex flex-col items-center justify-center gap-1.5 border-r border-b"
          >
            <SkeletonLine className="h-3 w-6" />
            <Skeleton className="size-7 rounded-full" />
          </div>
        ))}
        {HOURS.flatMap((hour) => [
          <div
            key={hour}
            className="flex justify-end border-r border-b pt-1 pr-2"
          >
            <SkeletonLine className="h-2.5 w-7" />
          </div>,
          ...Array.from({ length: dayCount }, (_, dayIndex) => (
            <div key={`${hour}-${dayIndex}`} className="border-r border-b" />
          )),
        ])}
      </div>
    </div>
  );
};
