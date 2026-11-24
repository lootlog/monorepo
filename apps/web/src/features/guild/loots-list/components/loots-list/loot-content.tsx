import { LootPlayerWithItems } from "./loot-player-with-items";
import { LootUnassignedItems } from "./loot-unassigned-items";
import type { ItemsByPlayer } from "./build-loot-presentation";
import type { Loot, Item } from "@/lib/loots/loot-types";
import type { WatchedItemScope } from "@/lib/user-notifications/watched-item-scope";
import type { DecorateLootItem } from "./item-stack";
import { cn } from "cn";
import { LIST_TILE_INSET_CLASS } from "@lootlog/ui/lib/list-tile";
import { LOOT_PLAYERS_ROW_CLASS } from "./loot-players-row";

export const LootContent = ({
  sortedPlayers,
  itemsByPlayer,
  unassignedItems,
  watchContext,
  onShowPlayerLoots,
  selectedPlayerNames,
  selectedItemNames,
  decorateItem,
}: {
  sortedPlayers: Loot["players"];
  itemsByPlayer: ItemsByPlayer;
  unassignedItems: Item[];
  watchContext: WatchedItemScope;
  onShowPlayerLoots?: (playerName: string) => void;
  selectedPlayerNames: string[];
  selectedItemNames: string[];
  decorateItem?: DecorateLootItem;
}) => {
  const selectedNames = new Set(selectedPlayerNames);

  return (
    <div
      className={cn(
        "@container flex flex-1 flex-wrap gap-x-4 gap-y-2.5 py-2.5",
        LIST_TILE_INSET_CLASS,
      )}
    >
      <div className={LOOT_PLAYERS_ROW_CLASS}>
        {sortedPlayers.map((player) => (
          <LootPlayerWithItems
            key={player.id}
            player={player}
            items={itemsByPlayer[player.id] || []}
            watchContext={watchContext}
            onShowLoots={
              onShowPlayerLoots
                ? () => onShowPlayerLoots(player.name)
                : undefined
            }
            hasPlayerFilter={selectedPlayerNames.length > 0}
            isPlayerSelected={selectedNames.has(player.name)}
            selectedItemNames={selectedItemNames}
            decorateItem={decorateItem}
          />
        ))}
      </div>
      <LootUnassignedItems
        items={unassignedItems}
        watchContext={watchContext}
        selectedItemNames={selectedItemNames}
        decorateItem={decorateItem}
      />
    </div>
  );
};
