import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { LIST_TILE_INSET_CLASS, LIST_TILE_RULE_CLASS } from "./list-tile";

type ListTileEmptyProps = {
  /** The icon the group's tiles lead with, so the row lines up with them. */
  icon: LucideIcon;
  children: ReactNode;
};

/**
 * Stands in for the tiles of an empty group inside a tiled section, such as
 * a section with no partners yet. A whole empty list uses `EmptyState`.
 */
export const ListTileEmpty = ({ icon: Icon, children }: ListTileEmptyProps) => (
  <p
    data-list-tile
    className={cn(
      "flex min-h-14 items-center gap-3 py-2 text-sm text-muted-foreground",
      LIST_TILE_RULE_CLASS,
      LIST_TILE_INSET_CLASS,
    )}
  >
    <Icon aria-hidden className="size-4 shrink-0" />
    <span className="min-w-0">{children}</span>
  </p>
);
