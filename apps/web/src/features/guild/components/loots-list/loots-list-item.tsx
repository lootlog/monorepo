import { useMemo, useState } from "react";
import { ItemRarity, type Loot, type Item } from "@/hooks/api/loots/use-loots";
import { PlayerTile } from "@/features/guild/components/loots-list/player-tile";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { LOOT_SHARE_COLOR_PALETTE } from "@/features/guild/constants/loot-share-color-palette";
import { Sheet } from "@lootlog/ui/components/sheet";
import { Card } from "@lootlog/ui/components/card";
import { LootDetailsSheetContent } from "@/features/guild/components/loots-list/loot-details-sheet-content";
import { LootNpcs } from "@/features/guild/components/loots-list/loot-npcs";
import {
  Calendar,
  MapPin,
  MessageSquare,
  Users,
  Package,
  Dot,
} from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import { ItemTile } from "@/components/tiles";

type Props = {
  loot: Loot;
  canManageLoots: boolean;
};

type PlayerColorMap = Record<string, { color: string; idx: number }>;
type ItemOwnerMap = Record<string, string | undefined>;
type ItemsByPlayer = Record<string, Item[]>;

const useLootData = (loot: Loot) => {
  return useMemo(() => {
    const playerColorMap = loot.players.reduce<PlayerColorMap>(
      (acc, player, idx) => {
        const color =
          LOOT_SHARE_COLOR_PALETTE[idx % LOOT_SHARE_COLOR_PALETTE.length] ?? "";
        acc[player.id] = { color, idx };
        return acc;
      },
      {},
    );

    const itemOwnerMap: ItemOwnerMap = {};
    Object.entries(loot.lootShare || {}).forEach(([playerId, itemIds]) => {
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
      const aItems = itemsByPlayer[a.id]?.length || 0;
      const bItems = itemsByPlayer[b.id]?.length || 0;
      if (aItems > 0 && bItems === 0) return -1;
      if (aItems === 0 && bItems > 0) return 1;
      return 0;
    });

    return {
      playerColorMap,
      itemOwnerMap,
      itemsByPlayer,
      unassignedItems,
      hasLegendaryItem,
      sortedPlayers,
    };
  }, [loot]);
};

const LootHeader = ({
  npcs,
  commentsCount,
}: {
  npcs: Loot["npcs"];
  commentsCount: number;
}) => (
  <div className="flex flex-row justify-between items-center gap-2 mb-1">
    <div className="min-w-0">
      <LootNpcs npcs={npcs} />
    </div>
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md border border-border/50">
      <MessageSquare className="h-3 w-3" />
      <span className="font-medium">{commentsCount}</span>
    </div>
  </div>
);

const PlayerWithItems = ({
  player,
  items,
}: {
  player: Loot["players"][number];
  items: Item[];
}) => (
  <div className="flex flex-col items-center gap-0.5">
    <PlayerTile player={player} />
    {items.length > 0 && (
      <div className="flex flex-col gap-1">
        {items.map((item, itemIdx) => (
          <ItemTile key={`${item.hid}-${itemIdx}`} item={item} />
        ))}
      </div>
    )}
  </div>
);

const UnassignedItems = ({ items }: { items: Item[] }) => {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 border-l border-border/30 pl-4">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        Przedmioty bez podziału
      </span>
      <div className="flex flex-row flex-wrap gap-1">
        {items.map((item, itemIdx) => (
          <ItemTile key={`unassigned-${item.hid}-${itemIdx}`} item={item} />
        ))}
      </div>
    </div>
  );
};

const LootContent = ({
  sortedPlayers,
  itemsByPlayer,
  unassignedItems,
}: {
  sortedPlayers: Loot["players"];
  itemsByPlayer: ItemsByPlayer;
  unassignedItems: Item[];
}) => (
  <div className="flex flex-row justify-between gap-4 py-2 border-t border-border/30 -mx-4 px-4 flex-1">
    <div className="flex flex-row items-start gap-2 flex-wrap">
      {sortedPlayers.map((player) => (
        <PlayerWithItems
          key={player.id}
          player={player}
          items={itemsByPlayer[player.id] || []}
        />
      ))}
    </div>
    <UnassignedItems items={unassignedItems} />
  </div>
);

const MetaItem = ({
  icon: Icon,
  children,
}: {
  icon: React.FC<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <span className="flex items-center gap-1 text-xs text-muted-foreground">
    <Icon className="h-3 w-3" />
    {children}
  </span>
);

const LootFooter = ({
  location,
  date,
  playersCount,
  itemsCount,
}: {
  location: string;
  date: string;
  playersCount: number;
  itemsCount: number;
}) => (
  <div className="flex items-center justify-between gap-3 mt-auto border-t border-border/30 -mx-4 px-4 py-1">
    <div className="flex items-center gap-0">
      <MetaItem icon={MapPin}>{location}</MetaItem>
      <Dot className="text-muted-foreground" />
      <MetaItem icon={Calendar}>{date}</MetaItem>
    </div>
    <div className="flex items-center gap-3">
      <MetaItem icon={Users}>{playersCount}</MetaItem>
      <MetaItem icon={Package}>{itemsCount}</MetaItem>
    </div>
  </div>
);

const LEGENDARY_GRADIENT =
  "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(0,0,0,0) 50%, rgba(239,68,68,0.05) 100%)";

export const LootsListItem = ({ loot, canManageLoots }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const date = timestampToDate(loot.createdAt);

  const {
    playerColorMap,
    itemOwnerMap,
    itemsByPlayer,
    unassignedItems,
    hasLegendaryItem,
    sortedPlayers,
  } = useLootData(loot);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <Card
        onClick={() => setIsOpen(true)}
        className={cn(
          "group relative px-4 pt-2 pb-1 transition-all duration-300 cursor-pointer h-full flex flex-col gap-0",
          "bg-card/40 backdrop-blur-sm border-border",
          "hover:bg-card/80 hover:border-primary/30 hover:shadow-lg hover:scale-[1.01]",
          hasLegendaryItem &&
            "border-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.3),_0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4),_0_0_15px_rgba(239,68,68,0.3)]",
        )}
        style={
          hasLegendaryItem ? { background: LEGENDARY_GRADIENT } : undefined
        }
      >
        <LootHeader npcs={loot.npcs} commentsCount={loot.commentsCount} />
        <LootContent
          sortedPlayers={sortedPlayers}
          itemsByPlayer={itemsByPlayer}
          unassignedItems={unassignedItems}
        />
        <LootFooter
          location={loot.location}
          date={date}
          playersCount={loot.players.length}
          itemsCount={loot.items.length}
        />
      </Card>
      <LootDetailsSheetContent
        loot={loot}
        ownerMap={itemOwnerMap}
        playerColorMap={playerColorMap}
        canManageLoots={canManageLoots}
      />
    </Sheet>
  );
};
