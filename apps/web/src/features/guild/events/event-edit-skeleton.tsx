import {
  LIST_BAND_HEADING_CLASS,
  LIST_GROUP_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
} from "@/components/common/list-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

const FieldSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-9 w-full" />
  </div>
);

/** Stands in for an event edit tab: a banded section of fields. */
export const EventEditSkeleton = () => (
  <section aria-busy="true">
    <div
      className={cn(
        LIST_GROUP_HEADING_CLASS,
        LIST_BAND_HEADING_CLASS,
        LIST_TILE_INSET_CLASS,
      )}
    >
      <Skeleton className="h-4 w-40" />
    </div>
    <div className={cn("py-5", LIST_TILE_INSET_CLASS)}>
      <div className="flex max-w-3xl flex-col gap-4">
        <FieldSkeleton />
        <div className="grid gap-4 md:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      </div>
    </div>
  </section>
);
