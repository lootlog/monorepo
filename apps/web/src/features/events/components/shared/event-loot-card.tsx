import { MapPin, Calendar, Users, Package } from "lucide-react";
import { cn } from "@/utils/cn";
import { LootNpcs } from "@/features/guild/components/loots-list/loot-npcs";
import { ItemTile } from "@/components/tiles";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { ItemRarity, type Loot, type Item } from "@/hooks/api/loots/use-loots";
import { PlayerWithItems } from "./player-with-items";

type ItemsByPlayer = Record<string, Item[]>;

const useLootData = (loot: Loot) => {
  const itemOwnerMap: Record<string, string | undefined> = {};
  Object.entries(loot.lootShare ?? {}).forEach(([playerId, itemIds]) => {
    itemIds.forEach((itemId) => {
      itemOwnerMap[itemId] = playerId;
    });
  });

  const itemsByPlayer = loot.players.reduce<ItemsByPlayer>((acc, player) => {
    acc[player.id] = [];
    return acc;
  }, {});

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

  const sortedPlayers = [...loot.players].sort((a, b) => {
    const aItems = itemsByPlayer[a.id]?.length ?? 0;
    const bItems = itemsByPlayer[b.id]?.length ?? 0;
    if (aItems > 0 && bItems === 0) return -1;
    if (aItems === 0 && bItems > 0) return 1;
    return 0;
  });

  return {
    itemsByPlayer,
    unassignedItems,
    hasLegendaryItem,
    sortedPlayers,
  };
};

const LEGENDARY_GRADIENT =
  "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(0,0,0,0) 50%, rgba(239,68,68,0.05) 100%)";

interface EventLootCardProps {
  loot: Loot;
}

export const EventLootCard = ({ loot }: EventLootCardProps) => {
  const date = timestampToDate(loot.createdAt);
  const { itemsByPlayer, unassignedItems, hasLegendaryItem, sortedPlayers } =
    useLootData(loot);

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border bg-card/30",
        hasLegendaryItem &&
          "border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
      )}
      style={hasLegendaryItem ? { background: LEGENDARY_GRADIENT } : undefined}
    >
      <div className="mb-2">
        <LootNpcs npcs={loot.npcs} />
      </div>

      <div className="flex flex-row items-start gap-2 flex-wrap py-2 border-t border-border/30">
        {sortedPlayers.slice(0, 4).map((player) => (
          <PlayerWithItems
            key={player.id}
            player={player}
            items={itemsByPlayer[player.id] ?? []}
          />
        ))}
        {sortedPlayers.length > 4 && (
          <span className="text-xs text-muted-foreground self-center">
            +{sortedPlayers.length - 4}
          </span>
        )}
        {unassignedItems.length > 0 && (
          <div className="flex flex-col gap-1 border-l border-border/30 pl-2">
            <div className="flex flex-row flex-wrap gap-1">
              {unassignedItems.slice(0, 4).map((item, itemIdx) => (
                <ItemTile
                  key={`unassigned-${item.hid}-${itemIdx}`}
                  item={item}
                />
              ))}
              {unassignedItems.length > 4 && (
                <span className="text-xs text-muted-foreground self-center">
                  +{unassignedItems.length - 4}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {loot.location}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {date}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {loot.players.length}
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {loot.items.length}
          </span>
        </div>
      </div>
    </div>
  );
};
