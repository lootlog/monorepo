import { SectionCard } from "@/components/common/section-card/section-card";

import { Skeleton } from "@lootlog/ui/components/skeleton";

/** Mirrors the history list: one card of `NotificationHistoryRow` rows. */
export const NotificationHistoryRowsSkeleton = () => (
  <SectionCard aria-hidden="true" className="overflow-hidden">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="flex flex-col gap-2 border-b border-border/70 px-3 py-3 last:border-b-0"
      >
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-3 w-28" />
      </div>
    ))}
  </SectionCard>
);
