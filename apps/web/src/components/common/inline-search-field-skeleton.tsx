import { Skeleton } from "@lootlog/ui/components/skeleton";

/** Stands in for `InlineSearchField`, as tall as its input. */
export const InlineSearchFieldSkeleton = () => (
  <div
    aria-hidden="true"
    className="flex h-8 min-w-48 flex-1 items-center gap-2"
  >
    <Skeleton className="size-4 shrink-0 rounded" />
    <Skeleton className="h-4 w-48" />
  </div>
);
