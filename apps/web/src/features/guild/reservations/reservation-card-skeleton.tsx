import type { FC } from "react";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import type { ViewMode } from "@/hooks/use-view-mode";
import {
  getReservationCellClassName,
  RESERVATION_LIST_ROW_CLASS,
} from "./reservation-collection-layout";

type ReservationCardSkeletonProps = {
  viewMode?: ViewMode;
};

const title = (
  <div className="flex h-5 items-center gap-1.5">
    <Skeleton className="h-4 w-28" />
    <Skeleton className="h-3 w-10" />
  </div>
);

const status = (
  <div className="flex h-5 items-center gap-2">
    <Skeleton className="size-2 rounded-full" />
    <Skeleton className="h-3.5 w-24" />
  </div>
);

const actions = (
  <div className="flex shrink-0 items-center gap-2">
    <Skeleton className="size-8 rounded-md" />
    <Skeleton className="h-3.5 w-16" />
  </div>
);

/** Mirrors `ReservationCard`, so the loaded tiles replace it without shifting. */
export const ReservationCardSkeleton: FC<ReservationCardSkeletonProps> = ({
  viewMode = "grid",
}) => (
  <div data-list-tile className={getReservationCellClassName(viewMode)}>
    <div
      className={cn(
        "h-full",
        LIST_TILE_INSET_CLASS,
        viewMode === "grid"
          ? "flex flex-col gap-2 pt-1.5 pb-3"
          : RESERVATION_LIST_ROW_CLASS,
      )}
    >
      {viewMode === "grid" ? (
        <>
          <div className="flex min-h-9 items-center justify-between gap-3">
            {title}
            {actions}
          </div>
          <div className="flex min-h-10 items-center gap-2 overflow-hidden">
            <Skeleton className="h-10 w-8 rounded-lg" />
            <Skeleton className="h-10 w-8 rounded-lg" />
            <Skeleton className="h-10 w-8 rounded-lg" />
          </div>
          <div className="mt-auto pt-1">{status}</div>
        </>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-10 w-8 rounded-lg" />
            {title}
          </div>
          {status}
          {actions}
        </>
      )}
    </div>
  </div>
);
