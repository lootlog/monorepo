import { WatchableItemTile } from "@/components/tiles/watchable-item-tile";
import { ItemImage } from "@lootlog/ui/components/item-image";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import { ItemRarity, type Item, type Loot } from "@/lib/loots/loot-types";
import { cn } from "cn";
import { AnimatePresence } from "framer-motion";
import type { ReactNode, FC } from "react";
import { ItemStackBadge } from "@/features/guild/loots-list/components/loots-list/item-stack-badge";
import { ItemStackExpanded } from "@/features/guild/loots-list/components/loots-list/item-stack-expanded";
import { Check } from "lucide-react";
import { useItemStackExpansion } from "./use-item-stack-expansion";

const RARITY_PRIORITY: Record<ItemRarity, number> = {
  [ItemRarity.LEGENDARY]: 4,
  [ItemRarity.HEROIC]: 3,
  [ItemRarity.UNIQUE]: 2,
  [ItemRarity.UPGRADED]: 1,
  [ItemRarity.COMMON]: 0,
};

const sortByRarity = (items: Item[]): Item[] =>
  [...items].sort(
    (a, b) =>
      (RARITY_PRIORITY[b.rarity ?? ItemRarity.COMMON] ?? 0) -
      (RARITY_PRIORITY[a.rarity ?? ItemRarity.COMMON] ?? 0),
  );

type Props = {
  playerId: Loot["players"][number]["id"];
  items: Item[];
  watchContext: WatchedItemScope;
  selectedItemNames: string[];
  renderItem?: (item: Item) => ReactNode;
};

export const ItemStack: FC<Props> = ({
  playerId,
  items,
  watchContext,
  selectedItemNames,
  renderItem,
}) => {
  const { stackRef, anchorRect, isExpanded, toggleExpansion } =
    useItemStackExpansion(playerId);

  const firstItem = items[0];

  if (!firstItem) return null;

  if (items.length === 1) {
    return renderItem ? (
      renderItem(firstItem)
    ) : (
      <WatchableItemTile
        item={firstItem}
        watchContext={watchContext}
        selectedItemNames={selectedItemNames}
      />
    );
  }

  const sorted = sortByRarity(items);
  const topItem = sorted[0] ?? firstItem;

  const remainingCount = sorted.length - 1;
  const hasItemFilter = selectedItemNames.length > 0;
  const selectedNames = new Set(selectedItemNames);
  const hasSelectedItem = items.some((item) => selectedNames.has(item.name));

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    toggleExpansion();
  };

  return (
    <div
      ref={stackRef}
      className={cn(
        "relative cursor-pointer rounded-lg transition-[opacity,filter] duration-200",
        isExpanded && "z-40",
        hasItemFilter && !hasSelectedItem && "opacity-35 grayscale-[0.45]",
      )}
    >
      <button
        type="button"
        aria-label={topItem.name}
        aria-expanded={isExpanded}
        onClick={handleClick}
        className="relative block rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
      >
        {remainingCount >= 2 && (
          <div className="absolute inset-0 translate-x-[4px] translate-y-[4px] rounded-md border-2 border-muted-foreground/20 bg-muted/40 w-[32px] h-[32px]" />
        )}
        {remainingCount >= 1 && (
          <div className="absolute inset-0 translate-x-[2px] translate-y-[2px] rounded-md border-2 border-muted-foreground/30 bg-muted/60 w-[32px] h-[32px]" />
        )}
        <div className="relative">
          <ItemImage
            rarity={topItem.rarity ?? ItemRarity.COMMON}
            icon={topItem.icon}
          />
        </div>
        <ItemStackBadge count={remainingCount} />
        {hasItemFilter && hasSelectedItem ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-1 -top-1 z-10 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-2 ring-background"
          >
            <Check className="size-2.5" />
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {isExpanded && anchorRect && (
          <ItemStackExpanded
            renderItem={renderItem}
            items={sorted}
            anchorRect={anchorRect}
            watchContext={watchContext}
            selectedItemNames={selectedItemNames}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
