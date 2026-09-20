import type { ReactNode } from "react";
import type { Item } from "@/lib/loots/loot-types";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { LOOT_CARD_INSET_CLASS } from "@/features/guild/loots-list/loots-list-layout";
import { cn } from "cn";
import {
  buildLootData,
  type LootPresentationData,
} from "./build-loot-presentation";
import { LootNpcs } from "./loot-npcs";
import { LootContent } from "./loot-content";
import { LootFooter } from "./loot-footer";

const EMPTY_NAMES: string[] = [];

export const LootPresentation = ({
  loot,
  headerActions,
  onShowPlayerLoots,
  selectedPlayerNames = EMPTY_NAMES,
  selectedItemNames = EMPTY_NAMES,
  renderItem,
}: {
  loot: LootPresentationData;
  headerActions: ReactNode;
  onShowPlayerLoots?: (name: string) => void;
  selectedPlayerNames?: string[];
  selectedItemNames?: string[];
  renderItem?: (item: Item) => ReactNode;
}) => {
  const { itemsByPlayer, unassignedItems, sortedPlayers } = buildLootData(loot);

  return (
    <>
      <div
        className={cn(
          "flex min-h-11 items-center justify-between gap-3 py-1.5",
          LOOT_CARD_INSET_CLASS,
        )}
      >
        <div className="min-w-0 flex-1">
          <LootNpcs npcs={loot.npcs} />
        </div>
        {headerActions}
      </div>
      <LootContent
        sortedPlayers={sortedPlayers}
        itemsByPlayer={itemsByPlayer}
        unassignedItems={unassignedItems}
        watchContext={{ world: loot.world }}
        onShowPlayerLoots={onShowPlayerLoots}
        selectedPlayerNames={selectedPlayerNames}
        selectedItemNames={selectedItemNames}
        renderItem={renderItem}
      />
      <LootFooter
        location={loot.location}
        date={timestampToDate(loot.createdAt)}
        playersCount={loot.players.length}
        itemsCount={loot.items.length}
      />
    </>
  );
};
