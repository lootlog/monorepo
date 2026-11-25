import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { SkeletonLine } from "./skeleton-line";
import type { ReactNode } from "react";
import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@lootlog/ui/lib/list-tile";

type ListTileSkeletonProps = {
  media?: "box" | "none";
  trailing?: ReactNode;
  actions?: number;
  className?: string;
};

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
