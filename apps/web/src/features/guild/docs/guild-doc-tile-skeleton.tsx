import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { Skeleton } from "@lootlog/ui/components/skeleton";

/** Mirrors `GuildDocTile`: icon, title, meta line and the trash action. */
export const GuildDocTileSkeleton = ({
  hasActions,
}: {
  hasActions: boolean;
}) => (
  <div data-list-tile className={LIST_TILE_RULE_CLASS}>
    <div className="flex h-full items-center">
      <div className={getListTileLinkClassName(hasActions)}>
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex h-5 items-center">
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex h-4 items-center">
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </div>
      {hasActions && (
        <div className={LIST_TILE_ACTIONS_CLASS}>
          <Skeleton className="size-8 rounded-md" />
        </div>
      )}
    </div>
  </div>
);
