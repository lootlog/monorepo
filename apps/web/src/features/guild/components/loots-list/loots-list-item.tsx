import { useState } from "react";
import { ItemRarity, type Loot, type Item } from "@/hooks/api/loots/use-loots";
import { ItemTile } from "@/features/guild/components/loots-list/item-tile";
import { PlayerTile } from "@/features/guild/components/loots-list/player-tile";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { LOOT_SHARE_COLOR_PALETTE } from "@/features/guild/constants/loot-share-color-palette";
import { Sheet } from "@lootlog/ui/components/sheet";
import { LootDetailsSheetContent } from "@/features/guild/components/loots-list/loot-details-sheet-content";
import { LootNpcs } from "@/features/guild/components/loots-list/loot-npcs";
import { Calendar, MapPin, MessageSquare, Users, Package } from "lucide-react";

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

  const itemsByPlayer = loot.players.reduce<Record<string, Item[]>>(
    (acc, player) => {
      acc[player.id] = [];
      return acc;
    },
    {},
  );

  const unassignedItems: Item[] = [];

  const singlePlayerId =
    loot.players.length === 1 ? loot.players[0]?.id : undefined;

  loot.items.forEach((item) => {
    const ownerId = itemOwnerMap[item.hid];
    if (ownerId && itemsByPlayer[ownerId]) {
      itemsByPlayer[ownerId].push(item);
    } else if (singlePlayerId && itemsByPlayer[singlePlayerId]) {
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
      <article
        onClick={() => setIsOpen(true)}
        className={`group relative rounded-xl border bg-background/30 backdrop-blur-md p-4 transition-all duration-300 cursor-pointer h-full flex flex-col ${
          hasLegendaryItem
            ? "border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.3),_0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4),_0_0_15px_rgba(239,68,68,0.3)] hover:bg-card/50"
            : "border-border hover:bg-card/50 hover:border-primary/50"
        }`}
        style={
          hasLegendaryItem
            ? {
                background:
                  "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(0,0,0,0) 50%, rgba(239,68,68,0.05) 100%)",
              }
            : undefined
        }
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

        <div className="flex flex-row justify-between gap-4 pt-3 pb-2 border-t border-border/30 flex-1">
          <div className="flex flex-row items-start gap-2 flex-wrap">
            {[...loot.players]
              .sort((a, b) => {
                const aItems = itemsByPlayer[a.id]?.length || 0;
                const bItems = itemsByPlayer[b.id]?.length || 0;
                // Players with items first
                if (aItems > 0 && bItems === 0) return -1;
                if (aItems === 0 && bItems > 0) return 1;
                return 0;
              })
              .map((player) => {
                const playerItems = itemsByPlayer[player.id] || [];
                return (
                  <div
                    key={player.id}
                    className="flex flex-col items-center gap-3"
                  >
                    <PlayerTile player={player} />
                    {playerItems.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {playerItems.map((item, itemIdx) => (
                          <ItemTile
                            key={`${item.hid}-${itemIdx}`}
                            item={item}
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

        <div className="flex items-center justify-between gap-3 mt-auto pt-3 border-t border-border/30 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {loot.location}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {date}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {loot.players.length}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="h-3 w-3" />
              {loot.items.length}
            </span>
          </div>
        </div>
      </article>
      <LootDetailsSheetContent
        loot={loot}
        ownerMap={itemOwnerMap}
        playerColorMap={playerColorMap}
        canManageLoots={canManageLoots}
      />
    </Sheet>
  );
};
