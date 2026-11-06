import { Skeleton } from "@lootlog/ui/components/skeleton";

/** Mirrors the collapsed filters rail: open button, sections, quick filters. */
export const LootFiltersRailSkeleton = () => (
  <div aria-hidden="true" className="flex w-14 flex-col">
    <div className="box-content flex h-12 items-center justify-center border-b border-sidebar-border">
      <Skeleton className="size-9 rounded-lg" />
    </div>
    <div className="flex flex-col items-center gap-1 py-2">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={`section-${index}`} className="size-9 rounded-lg" />
      ))}
      <div className="my-1 h-px w-6 bg-sidebar-border" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={`quick-${index}`} className="size-9 rounded-lg" />
      ))}
    </div>
  </div>
);
