import { PlayerTile } from "@/components/tiles/player-tile";
import { ItemStack, type DecorateLootItem } from "./item-stack";
import { cn } from "cn";
import type { Item, Loot } from "@/lib/loots/loot-types";
import type { WatchedItemScope } from "@/lib/user-notifications/watched-item-scope";

export const LootPlayerWithItems = ({
  player,
  items,
  watchContext,
  onShowLoots,
  hasPlayerFilter,
  isPlayerSelected,
  selectedItemNames,
  decorateItem,
}: {
  player: Loot["players"][number];
  items: Item[];
  watchContext: WatchedItemScope;
  onShowLoots?: () => void;
  hasPlayerFilter: boolean;
  isPlayerSelected: boolean;
  selectedItemNames: string[];
  decorateItem?: DecorateLootItem;
}) => (
  <div className="flex flex-col items-center gap-0.5">
    <PlayerTile
      player={player}
      accountId={player.accountId ?? undefined}
      characterId={player.characterId ?? undefined}
      world={watchContext.world}
      onShowLoots={onShowLoots}
      highlighted={hasPlayerFilter && isPlayerSelected}
      className={cn(
        "rounded-lg transition-[opacity,filter,box-shadow] duration-200",
        hasPlayerFilter &&
          isPlayerSelected &&
          "ring-2 ring-primary ring-offset-2 ring-offset-card",
        hasPlayerFilter && !isPlayerSelected && "opacity-35 grayscale-[0.45]",
      )}
    />
    <ItemStack
      playerId={player.id}
      decorateItem={decorateItem}
      items={items}
      watchContext={watchContext}
      selectedItemNames={selectedItemNames}
    />
  </div>
);
