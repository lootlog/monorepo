import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { SkeletonLine } from "./skeleton-line";
import type { ReactNode } from "react";
import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "./list-tile";

type ListTileSkeletonProps = {
  /** The tile's leading icon or avatar box; `none` starts with the title. */
  media?: "box" | "none";
  /** Stands in for content beside the text, such as a status badge. */
  trailing?: ReactNode;
  /** How many trailing action buttons to stand in for. */
  actions?: number;
  className?: string;
};

/**
 * Mirrors a linked tile: media, a title over a meta line, then optional
 * trailing content and an action.
 */
export const ListTileSkeleton = ({
  media = "box",
  trailing,
  actions = 0,
  className,
}: ListTileSkeletonProps) => (
  <div data-list-tile className={cn(LIST_TILE_RULE_CLASS, className)}>
    <div className="flex h-full items-center">
      <div className={getListTileLinkClassName(actions > 0)}>
        {media === "box" && <Skeleton className="size-9 shrink-0 rounded-lg" />}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex h-5 items-center">
            <Skeleton className="h-4 w-2/3" />
          </div>
          {/* One line of `MetaItem` text. */}
          <div className="text-xs leading-tight">
            <SkeletonLine className="h-3 w-1/2" />
          </div>
        </div>
        {trailing}
      </div>
      {actions > 0 && (
        <div className={LIST_TILE_ACTIONS_CLASS}>
          {Array.from({ length: actions }, (_, index) => (
            <Skeleton key={index} className="size-8 rounded-md" />
          ))}
        </div>
      )}
    </div>
  </div>
);
