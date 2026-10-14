import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";

/** Mirrors `NotificationRuleRow` and `NotificationChannelRow`: three lines and a menu. */
export const NotificationRuleRowSkeleton = () => (
  <div data-list-tile className={LIST_TILE_RULE_CLASS}>
    <div className="flex items-center">
      <div className={getListTileLinkClassName(true)}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex h-5 items-center">
            <Skeleton className="h-4 w-40 max-w-2/3" />
          </div>
          <div className="flex h-5 items-center">
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
          <div className="flex h-4 items-center gap-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>
      <div className={LIST_TILE_ACTIONS_CLASS}>
        <Skeleton className="size-8 rounded-md" />
      </div>
    </div>
  </div>
);
