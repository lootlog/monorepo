import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@lootlog/ui/lib/list-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";

type NotificationTileSkeletonProps = {
  withIcon?: boolean;
  actions?: number;
};

export const NotificationTileSkeleton = ({
  withIcon = false,
  actions = 0,
}: NotificationTileSkeletonProps) => (
  <div data-list-tile className={LIST_TILE_RULE_CLASS}>
    <div className="flex items-center">
      <div className={getListTileLinkClassName(actions > 0)}>
        {withIcon && <Skeleton className="size-9 shrink-0 rounded-lg" />}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex h-5 items-center">
            <Skeleton className="h-4 w-40 max-w-2/3" />
          </div>
          <div className="flex h-4 items-center gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
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
