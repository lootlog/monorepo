import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import type { ReactNode } from "react";
import { LIST_TILE_INSET_CLASS, LIST_TILE_RULE_CLASS } from "./list-tile";

/** Stands in for `ListToolbar`: the filter, then the list's own controls. */
export const ListToolbarSkeleton = ({ children }: { children?: ReactNode }) => (
  <div
    data-list-tile
    className={cn(
      "flex min-h-12 flex-wrap items-center gap-x-4 gap-y-2 py-2",
      LIST_TILE_RULE_CLASS,
      LIST_TILE_INSET_CLASS,
    )}
  >
    {/* As tall as the filter input, so the bar keeps its loaded height. */}
    <div className="flex h-8 min-w-48 flex-1 items-center gap-2">
      <Skeleton className="size-4 shrink-0 rounded" />
      <Skeleton className="h-4 w-48" />
    </div>
    {children}
  </div>
);
