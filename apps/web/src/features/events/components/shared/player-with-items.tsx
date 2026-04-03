import { PlayerTile } from "@/features/guild/components/loots-list/player-tile";
import { WatchableItemTile } from "@/components/tiles";
import type { WatchedItemScope } from "@/features/user-notifications/types/watched-item-scope";
import type { Loot, Item } from "@/hooks/api/loots/use-loots";

interface PlayerWithItemsProps {
  player: Loot["players"][number];
  items: Item[];
  watchContext: WatchedItemScope;
}

export const PlayerWithItems = ({
  player,
  items,
  watchContext,
}: PlayerWithItemsProps) => (
  <div className="flex flex-col items-center gap-0.5">
    <PlayerTile player={player} />
    {items.length > 0 && (
      <div className="flex flex-col gap-1">
        {items.slice(0, 3).map((item, itemIdx) => (
          <WatchableItemTile
            key={`${item.hid}-${itemIdx}`}
            item={item}
            watchContext={watchContext}
          />
        ))}
        {items.length > 3 && (
          <span className="text-xs text-muted-foreground text-center">
            +{items.length - 3}
          </span>
        )}
      </div>
    )}
  </div>
);
