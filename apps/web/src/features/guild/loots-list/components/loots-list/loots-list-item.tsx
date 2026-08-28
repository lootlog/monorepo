import { ItemRarity, type Loot, type Item } from "@/lib/loots/loot-types";
import { PlayerTile } from "@/components/tiles";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
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
import { useSelectedLoot } from "@/hooks/use-selected-loot";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useThemeMeta } from "@/themes/use-theme-meta";
import { buildLootItemOwnerMap } from "@/features/guild/loots-list/utils/build-loot-share-maps";
import { useLootsFilters } from "@/hooks/use-loots-filters";

type Props = {
  loot: Loot;
  isNew?: boolean;
  variant?: "card" | "embedded";
};

type ItemsByPlayer = Record<string, Item[]>;

const buildLootData = (loot: Loot) => {
  const itemOwnerMap = buildLootItemOwnerMap(loot.lootShare);

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
    itemsByPlayer,
    unassignedItems,
    hasLegendaryItem,
    sortedPlayers,
  };
};

const useLootData = (loot: Loot) => {
  return buildLootData(loot);
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
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/50 bg-secondary/50 px-2 py-1 text-xs text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
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
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/50 bg-secondary/50 px-2 py-1 text-xs text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
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
  onShowLoots,
  hasPlayerFilter,
  isPlayerSelected,
  selectedItemNames,
}: {
  player: Loot["players"][number];
  items: Item[];
  watchContext: WatchedItemScope;
  onShowLoots: () => void;
  hasPlayerFilter: boolean;
  isPlayerSelected: boolean;
  selectedItemNames: string[];
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
      items={items}
      watchContext={watchContext}
      selectedItemNames={selectedItemNames}
    />
  </div>
);

const UnassignedItems = ({
  items,
  watchContext,
  selectedItemNames,
}: {
  items: Item[];
  watchContext: WatchedItemScope;
  selectedItemNames: string[];
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
            selectedItemNames={selectedItemNames}
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
  onShowPlayerLoots,
  selectedPlayerNames,
  selectedItemNames,
}: {
  sortedPlayers: Loot["players"];
  itemsByPlayer: ItemsByPlayer;
  unassignedItems: Item[];
  watchContext: WatchedItemScope;
  onShowPlayerLoots: (playerName: string) => void;
  selectedPlayerNames: string[];
  selectedItemNames: string[];
}) => (
  <div className="flex flex-row justify-between gap-4 py-2 border-t border-border/30 -mx-4 px-4 flex-1">
    <div className="flex flex-row items-start gap-2 flex-wrap">
      {sortedPlayers.map((player) => (
        <PlayerWithItems
          key={player.id}
          player={player}
          items={itemsByPlayer[player.id] || []}
          watchContext={watchContext}
          onShowLoots={() => onShowPlayerLoots(player.name)}
          hasPlayerFilter={selectedPlayerNames.length > 0}
          isPlayerSelected={selectedPlayerNames.includes(player.name)}
          selectedItemNames={selectedItemNames}
        />
      ))}
    </div>
    <UnassignedItems
      items={unassignedItems}
      watchContext={watchContext}
      selectedItemNames={selectedItemNames}
    />
  </div>
);

const MetaItem = ({
  icon: Icon,
  children,
  className,
  title,
}: {
  icon: React.FC<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) => (
  <span
    className={cn(
      "flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground",
      className,
    )}
    title={title}
  >
    <Icon className="h-3 w-3 shrink-0" />
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
    <div className="flex min-w-0 flex-1 items-center gap-0">
      <MetaItem icon={MapPin} className="min-w-0 flex-1" title={location}>
        <span className="truncate">{location}</span>
      </MetaItem>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <MetaItem icon={Calendar}>{date}</MetaItem>
      <Dot className="shrink-0 text-muted-foreground" />
      <MetaItem icon={Users}>{playersCount}</MetaItem>
      <Dot className="shrink-0 text-muted-foreground" />
      <MetaItem icon={Package}>{itemsCount}</MetaItem>
    </div>
  </div>
);

export const LootsListItem = ({ loot, isNew, variant = "card" }: Props) => {
  const { openLootDetails } = useSelectedLoot();
  const { filters, setFilters } = useLootsFilters();
  const date = timestampToDate(loot.createdAt);
  const { isRukiaTheme } = useThemeMeta();
  const shouldReduceMotion = useReducedMotion();

  const { itemsByPlayer, unassignedItems, hasLegendaryItem, sortedPlayers } =
    useLootData(loot);
  const watchContext = {
    world: loot.world,
  };
  let initialAnimation: false | { opacity: number; scale?: number } = false;
  const animate: { opacity: number; scale?: number } = {
    opacity: 1,
    scale: 1,
  };

  if (isNew) {
    if (shouldReduceMotion) {
      initialAnimation = { opacity: 0 };
    } else {
      initialAnimation = { opacity: 0, scale: 0.98 };
    }
  }

  const lootContent = (
    <>
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
        onShowPlayerLoots={(playerName) =>
          setFilters({ players: [playerName] })
        }
        selectedPlayerNames={filters.players}
        selectedItemNames={filters.itemNames}
      />
      <LootFooter
        location={loot.location}
        date={date}
        playersCount={loot.players.length}
        itemsCount={loot.items.length}
      />
    </>
  );

  return (
    <motion.div
      data-testid="loot-list-item"
      data-presentation={variant}
      initial={initialAnimation}
      animate={animate}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "h-full",
        variant === "embedded" &&
          "group relative flex flex-col gap-0 px-4 pt-2 pb-1 transition-colors hover:bg-muted/20",
        variant === "embedded" && hasLegendaryItem && "bg-red-500/5",
        variant === "card" &&
          isRukiaTheme &&
          "rounded-xl hover:shadow-[inset_0_0_8px_1px_rgba(200,230,255,0.4),0_0_10px_2px_rgba(180,220,255,0.25)] transition-shadow duration-300",
      )}
    >
      {variant === "embedded" ? (
        lootContent
      ) : (
        <Card
          className={cn(
            "group relative px-4 pt-2 pb-1 h-full flex flex-col gap-0",
            "bg-card border-border overflow-visible",
            "hover:bg-card hover:border-primary/30 hover:shadow-md transition-[background-color,border-color,box-shadow] duration-200",
            isNew && "border-primary/70 ring-1 ring-primary/40 shadow-lg",
            hasLegendaryItem &&
              "border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.25)] hover:shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:border-red-500/100",
          )}
        >
          {lootContent}
        </Card>
      )}
    </motion.div>
  );
};
