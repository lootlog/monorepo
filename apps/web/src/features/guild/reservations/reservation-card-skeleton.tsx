import type { FC } from "react";
import { SectionCard as Card } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

type ReservationCardSkeletonProps = {
  viewMode?: "list" | "grid";
};

/** Mirrors `ReservationCard`, so the loaded cards replace it without shifting. */
export const ReservationCardSkeleton: FC<ReservationCardSkeletonProps> = ({
  viewMode = "grid",
}) => (
  <Card
    className={cn(
      "gap-3 border-border bg-card p-3.5",
      viewMode === "list" &&
        "sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(14rem,1fr)] sm:items-center",
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

    <div className="mt-auto flex min-w-0 items-center gap-2.5 rounded-lg border border-border/80 bg-muted/30 px-2.5 py-2">
      <Skeleton className="size-4 shrink-0 rounded-sm" />
      <div className="flex min-h-8 min-w-0 flex-1 flex-col justify-center gap-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-32 max-w-full" />
      </div>
    </div>
  </Card>
);
