import { LootPlayerWithItems } from "./loot-player-with-items";
import { LootUnassignedItems } from "./loot-unassigned-items";
import type { ItemsByPlayer } from "./build-loot-presentation";
import type { Loot, Item } from "@/lib/loots/loot-types";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import type { ReactNode } from "react";
export const LootContent = ({
  sortedPlayers,
  itemsByPlayer,
  unassignedItems,
  watchContext,
  onShowPlayerLoots,
  selectedPlayerNames,
  selectedItemNames,
  renderItem,
}: {
  sortedPlayers: Loot["players"];
  itemsByPlayer: ItemsByPlayer;
  unassignedItems: Item[];
  watchContext: WatchedItemScope;
  onShowPlayerLoots?: (playerName: string) => void;
  selectedPlayerNames: string[];
  selectedItemNames: string[];
  renderItem?: (item: Item) => ReactNode;
}) => (
  <div className="flex flex-row justify-between gap-4 py-2 border-t border-border/30 -mx-4 px-4 flex-1">
    <div className="flex flex-row items-start gap-2 flex-wrap">
      {sortedPlayers.map((player) => (
        <LootPlayerWithItems
          key={player.id}
          player={player}
          items={itemsByPlayer[player.id] || []}
          watchContext={watchContext}
          onShowLoots={
            onShowPlayerLoots ? () => onShowPlayerLoots(player.name) : undefined
          }
          hasPlayerFilter={selectedPlayerNames.length > 0}
          isPlayerSelected={selectedPlayerNames.includes(player.name)}
          selectedItemNames={selectedItemNames}
          renderItem={renderItem}
        />
      ))}
    </div>
    <LootUnassignedItems
      items={unassignedItems}
      watchContext={watchContext}
      selectedItemNames={selectedItemNames}
      renderItem={renderItem}
    />
  </div>
);
