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

/** Mirrors `ReservationCard`, so the loaded tiles replace it without shifting. */
export const ReservationCardSkeleton: FC<ReservationCardSkeletonProps> = ({
  viewMode = "grid",
}) => (
  <div data-list-tile className={getReservationCellClassName(viewMode)}>
    <div
      className={cn(
        "flex h-full flex-col gap-3 py-3",
        LIST_TILE_INSET_CLASS,
        viewMode === "list" && RESERVATION_LIST_ROW_CLASS,
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex h-5 items-center">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="mt-0.5 flex h-4 items-center">
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-4 rounded-sm" />
        </div>
      </div>

      {viewMode === "grid" && (
        <div className="flex min-h-10 items-center gap-2 overflow-hidden">
          <Skeleton className="h-10 w-8 rounded-lg" />
          <Skeleton className="h-10 w-8 rounded-lg" />
          <Skeleton className="h-10 w-8 rounded-lg" />
        </div>
      )}

      <div className="mt-auto flex min-w-0 items-center gap-2.5">
        <Skeleton className="size-4 shrink-0 rounded-sm" />
        <div className="flex min-h-8 min-w-0 flex-1 flex-col justify-center gap-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-32 max-w-full" />
        </div>
      </div>
    </div>
  </div>
);
