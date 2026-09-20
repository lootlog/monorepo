import { LootPlayerWithItems } from "./loot-player-with-items";
import { LootUnassignedItems } from "./loot-unassigned-items";
import type { ItemsByPlayer } from "./build-loot-presentation";
import type { Loot, Item } from "@/lib/loots/loot-types";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import type { ReactNode } from "react";
import { cn } from "cn";
import {
  LOOT_CARD_DIVIDER_CLASS,
  LOOT_CARD_INSET_CLASS,
} from "@/features/guild/loots-list/loots-list-layout";

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
}) => {
  const selectedNames = new Set(selectedPlayerNames);

  return (
    // The container query lets the unassigned block sit beside the players
    // when the card is wide and drop under them when it is not.
    <div
      className={cn(
        "@container flex flex-1 flex-wrap gap-x-4 gap-y-2.5 py-2.5",
        LOOT_CARD_DIVIDER_CLASS,
        LOOT_CARD_INSET_CLASS,
      )}
    >
      <div className="flex min-w-0 flex-1 basis-48 flex-wrap content-start gap-x-2 gap-y-2.5">
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
};
