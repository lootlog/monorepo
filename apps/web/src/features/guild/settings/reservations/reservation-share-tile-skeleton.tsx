import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@lootlog/ui/lib/list-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

export const ReservationShareTileSkeleton = () => (
  <div
    data-list-tile
    className={cn(
      "flex min-h-14 items-center gap-3 py-2",
      LIST_TILE_RULE_CLASS,
      LIST_TILE_INSET_CLASS,
    )}
  >
    <Skeleton className="size-4 shrink-0 rounded" />
    <Skeleton className="h-4 w-40" />
    <Skeleton className="ml-auto size-8 shrink-0 rounded-lg" />
  </div>
);
