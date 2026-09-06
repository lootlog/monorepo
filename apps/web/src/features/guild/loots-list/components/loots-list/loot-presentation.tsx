import type { ReactNode } from "react";
import type { Item } from "@/lib/loots/loot-types";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import {
  buildLootData,
  type LootPresentationData,
} from "./build-loot-presentation";
import { LootNpcs } from "./loot-npcs";
import { LootContent } from "./loot-content";
import { LootFooter } from "./loot-footer";
export const LootPresentation = ({
  loot,
  headerActions,
  onShowPlayerLoots,
  selectedPlayerNames = [],
  selectedItemNames = [],
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
      <div className="flex flex-row justify-between items-center gap-2 mb-1">
        <div className="min-w-0">
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
