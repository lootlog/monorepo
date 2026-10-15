import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

/** Mirrors `ThemeRow`: thumbnail, name over description, palette, action. */
export const ThemeRowSkeleton = ({ action = false }: { action?: boolean }) => (
  <li data-list-tile className={cn("flex items-center", LIST_TILE_RULE_CLASS)}>
    <div className={getListTileLinkClassName(action)}>
      <Skeleton className="aspect-[2/1] w-16 shrink-0 sm:w-24 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="text-sm">
          <SkeletonLine className="h-3.5 w-24" />
        </div>
        <div className="text-xs leading-tight">
          <SkeletonLine className="h-3 w-40 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-5 w-17 shrink-0 rounded-md sm:h-6 sm:w-20" />
    </div>
    {action && (
      <div className={LIST_TILE_ACTIONS_CLASS}>
        <Skeleton className="size-8 rounded-md" />
      </div>
    )}
  </li>
);
