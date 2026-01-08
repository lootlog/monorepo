import { PlayerTile } from "@/features/guild/components/loots-list/player-tile";
import { ItemTile } from "@/components/tiles";
import type { Loot, Item } from "@/hooks/api/loots/use-loots";

interface PlayerWithItemsProps {
  player: Loot["players"][number];
  items: Item[];
}

export const PlayerWithItems = ({ player, items }: PlayerWithItemsProps) => (
  <div className="flex flex-col items-center gap-0.5">
    <PlayerTile player={player} />
    {items.length > 0 && (
      <div className="flex flex-col gap-1">
        {items.slice(0, 3).map((item, itemIdx) => (
          <ItemTile key={`${item.hid}-${itemIdx}`} item={item} />
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
