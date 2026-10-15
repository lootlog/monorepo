import { cn } from "cn";
import type { ReactNode } from "react";
import { InlineSearchFieldSkeleton } from "./inline-search-field-skeleton";
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
    <InlineSearchFieldSkeleton />
    {children}
  </div>
);
