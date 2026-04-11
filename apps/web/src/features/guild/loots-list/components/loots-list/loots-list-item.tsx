import { ItemRarity, type Loot, type Item } from "@/hooks/api/loots/use-loots";
import { PlayerTile } from "@/features/guild/loots-list/components/loots-list/player-tile";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { LOOT_SHARE_COLOR_PALETTE } from "@/features/guild/loots-list/constants/loot-share-color-palette";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import { Card } from "@lootlog/ui/components/card";
import { LootNpcs } from "@/features/guild/loots-list/components/loots-list/loot-npcs";
import {
  Calendar,
  ExternalLink,
  MapPin,
  MessageSquare,
  Users,
  Package,
  Dot,
} from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import { ItemStack } from "@/features/guild/loots-list/components/loots-list/item-stack";
import { WatchableItemTile } from "@/components/tiles";
import { useTheme } from "@/hooks/context/use-theme";
import { useSelectedLoot } from "@/hooks/use-selected-loot";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  loot: Loot;
};

type PlayerColorMap = Record<string, { color: string; idx: number }>;
type ItemOwnerMap = Record<string, string | undefined>;
type ItemsByPlayer = Record<string, Item[]>;

const buildLootData = (loot: Loot) => {
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
};

const useLootData = (loot: Loot) => {
  const lootDataRef = useRef<{
    loot: Loot;
    data: ReturnType<typeof buildLootData>;
  } | null>(null);

  if (!lootDataRef.current || lootDataRef.current.loot !== loot) {
    lootDataRef.current = {
      loot,
      data: buildLootData(loot),
    };
  }

  return lootDataRef.current.data;
};

const LootHeader = ({
  npcs,
  commentsCount,
  onOpenDetails,
}: {
  npcs: Loot["npcs"];
  commentsCount: number;
  onOpenDetails: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-row justify-between items-center gap-2 mb-1">
      <div className="min-w-0">
        <LootNpcs npcs={npcs} />
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails();
          }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md border border-border/50 hover:bg-secondary hover:text-foreground transition-colors duration-200"
        >
          <MessageSquare className="h-3 w-3" />
          <span className="font-medium">{commentsCount}</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails();
          }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md border border-border/50 hover:bg-secondary hover:text-foreground transition-colors duration-200"
        >
          <ExternalLink className="h-3 w-3" />
          <span className="font-medium">{t("loots.list.details")}</span>
        </button>
      </div>
    </div>
  );
};

const PlayerWithItems = ({
  player,
  items,
  watchContext,
}: {
  player: Loot["players"][number];
  items: Item[];
  watchContext: WatchedItemScope;
}) => (
  <div className="flex flex-col items-center gap-0.5">
    <PlayerTile player={player} />
    <ItemStack items={items} watchContext={watchContext} />
  </div>
);

const UnassignedItems = ({
  items,
  watchContext,
}: {
  items: Item[];
  watchContext: WatchedItemScope;
}) => {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 border-l border-border/30 pl-4">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {t("loots.list.unassignedItems")}
      </span>
      <div className="flex flex-row flex-wrap gap-1">
        {items.map((item, itemIdx) => (
          <WatchableItemTile
            key={`unassigned-${item.hid}-${itemIdx}`}
            item={item}
            watchContext={watchContext}
          />
        ))}
      </div>
    </div>
  );
};

const LootContent = ({
  sortedPlayers,
  itemsByPlayer,
  unassignedItems,
  watchContext,
}: {
  sortedPlayers: Loot["players"];
  itemsByPlayer: ItemsByPlayer;
  unassignedItems: Item[];
  watchContext: WatchedItemScope;
}) => (
  <div className="flex flex-row justify-between gap-4 py-2 border-t border-border/30 -mx-4 px-4 flex-1">
    <div className="flex flex-row items-start gap-2 flex-wrap">
      {sortedPlayers.map((player) => (
        <PlayerWithItems
          key={player.id}
          player={player}
          items={itemsByPlayer[player.id] || []}
          watchContext={watchContext}
        />
      ))}
    </div>
    <UnassignedItems items={unassignedItems} watchContext={watchContext} />
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

export const LootsListItem = ({ loot }: Props) => {
  const { openLootDetails } = useSelectedLoot();
  const date = timestampToDate(loot.createdAt);
  const { theme } = useTheme();
  const isRukiaTheme = theme === "rukia";

  const { itemsByPlayer, unassignedItems, hasLegendaryItem, sortedPlayers } =
    useLootData(loot);
  const watchContext = {
    world: loot.world,
  };

  return (
    <div
      className={cn(
        "h-full",
        isRukiaTheme &&
          "rounded-xl hover:shadow-[inset_0_0_8px_1px_rgba(200,230,255,0.4),0_0_10px_2px_rgba(180,220,255,0.25)] transition-shadow duration-300",
      )}
    >
      <Card
        className={cn(
          "group relative px-4 pt-2 pb-1 h-full flex flex-col gap-0",
          "bg-card/95 border-border overflow-visible",
          "hover:bg-card hover:border-primary/30 hover:shadow-md transition-[background-color,border-color,box-shadow] duration-200",
          hasLegendaryItem &&
            "border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.25)] hover:shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:border-red-500/100",
        )}
      >
        <LootHeader
          npcs={loot.npcs}
          commentsCount={loot.commentsCount}
          onOpenDetails={() => openLootDetails(loot.id)}
        />
        <LootContent
          sortedPlayers={sortedPlayers}
          itemsByPlayer={itemsByPlayer}
          unassignedItems={unassignedItems}
          watchContext={watchContext}
        />
        <LootFooter
          location={loot.location}
          date={date}
          playersCount={loot.players.length}
          itemsCount={loot.items.length}
        />
      </Card>
    </div>
  );
};
