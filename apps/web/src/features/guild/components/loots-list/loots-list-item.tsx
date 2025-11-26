import { useState } from "react";
import { ItemRarity, type Loot, type Item } from "@/hooks/api/loots/use-loots";
import { ItemTile } from "@/features/guild/components/loots-list/item-tile";
import { PlayerTile } from "@/features/guild/components/loots-list/player-tile";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { LOOT_SHARE_COLOR_PALETTE } from "@/features/guild/constants/loot-share-color-palette";
import { Sheet } from "@lootlog/ui/components/sheet";
import { ElectricBorder } from "@lootlog/ui/components/electric-border";
import { LootDetailsSheetContent } from "@/features/guild/components/loots-list/loot-details-sheet-content";
import { LootNpcs } from "@/features/guild/components/loots-list/loot-npcs";
import { Calendar, MapPin, MessageSquare } from "lucide-react";

type Props = {
  loot: Loot;
  canManageLoots: boolean;
};

export const LootsListItem: React.FC<Props> = ({ loot, canManageLoots }) => {
  const [isOpen, setIsOpen] = useState(false);
  const date = timestampToDate(loot.createdAt);

  const playerColorMap = loot.players.reduce<
    Record<string, { color: string; idx: number }>
  >((acc, player, idx) => {
    const color =
      LOOT_SHARE_COLOR_PALETTE[idx % LOOT_SHARE_COLOR_PALETTE.length] ?? "";
    acc[player.id] = { color, idx };

    return acc;
  }, {});

  const itemOwnerMap: Record<string, string | undefined> = {};
  Object.entries(loot.lootShare || {}).forEach(([playerId, itemIds]) => {
    itemIds.forEach((itemId) => {
      itemOwnerMap[itemId] = playerId;
    });
  });

  // Group items by player
  const itemsByPlayer = loot.players.reduce<Record<string, Item[]>>(
    (acc, player) => {
      acc[player.id] = [];
      return acc;
    },
    {},
  );

  // Items without owner (unassigned)
  const unassignedItems: Item[] = [];

  // If there's only one player, assign all items to them
  const singlePlayerId =
    loot.players.length === 1 ? loot.players[0]?.id : undefined;

  loot.items.forEach((item) => {
    const ownerId = itemOwnerMap[item.hid];
    if (ownerId && itemsByPlayer[ownerId]) {
      itemsByPlayer[ownerId].push(item);
    } else if (singlePlayerId && itemsByPlayer[singlePlayerId]) {
      // Assign unassigned items to the single player
      itemsByPlayer[singlePlayerId].push(item);
    } else {
      unassignedItems.push(item);
    }
  });

  const hasLegendaryItem = loot.items.some(
    (item) => item.rarity === ItemRarity.LEGENDARY,
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <ElectricBorder
        enabled={hasLegendaryItem}
        color="#f97316"
        speed={0.5}
        chaos={0.3}
        thickness={2}
        radius="xl"
      >
        <article
          onClick={() => setIsOpen(true)}
          className={`group relative rounded-xl border bg-background/30 backdrop-blur-md p-4 transition-all duration-300 cursor-pointer ${
            hasLegendaryItem
              ? "border-transparent hover:bg-card/50"
              : "border-border/50 hover:bg-card/50 hover:border-primary/50"
          }`}
        >
          <div className="flex flex-row justify-between items-start gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <LootNpcs npcs={loot.npcs} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md border border-border/50">
              <MessageSquare className="h-3 w-3" />
              <span className="font-medium">{loot.commentsCount}</span>
            </div>
          </div>

          <div className="flex flex-row justify-between gap-4 pt-3 pb-2 border-t border-border/30">
            <div className="flex flex-row items-start gap-2 flex-wrap">
              {loot.players.map((player, idx) => {
                const color = playerColorMap[player.id];
                const playerItems = itemsByPlayer[player.id] || [];
                return (
                  <div
                    key={player.id}
                    className="flex flex-col items-center gap-3"
                  >
                    <PlayerTile
                      player={player}
                      idx={idx}
                      color={color?.color}
                    />
                    {playerItems.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {playerItems.map((item, itemIdx) => (
                          <ItemTile
                            key={`${item.hid}-${itemIdx}`}
                            item={item}
                            color={color?.color}
                            shareIndex={color?.idx}
                            shareNickname={loot.players[color?.idx ?? 0]?.name}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {unassignedItems.length > 0 && (
              <div className="flex flex-col gap-1 border-l border-border/30 pl-4">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Przedmioty bez podziału
                </span>
                <div className="flex flex-row flex-wrap gap-1">
                  {unassignedItems.map((item, itemIdx) => (
                    <ItemTile
                      key={`unassigned-${item.hid}-${itemIdx}`}
                      item={item}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {loot.location}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {date}
            </span>
          </div>
        </article>
      </ElectricBorder>
      <LootDetailsSheetContent
        loot={loot}
        ownerMap={itemOwnerMap}
        playerColorMap={playerColorMap}
        canManageLoots={canManageLoots}
      />
    </Sheet>
  );
};
