import { WatchableItemTile } from "@/components/tiles";
import { ItemImage } from "@lootlog/ui/components/item-image";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import { ItemRarity, type Item } from "@/lib/loots/loot-types";
import { cn } from "cn";
import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, type FC } from "react";
import { ItemStackBadge } from "@/features/guild/loots-list/components/loots-list/item-stack-badge";
import { ItemStackExpanded } from "@/features/guild/loots-list/components/loots-list/item-stack-expanded";
import { Check } from "lucide-react";

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
  items: Item[];
  watchContext: WatchedItemScope;
  selectedItemNames: string[];
};

export const ItemStack: FC<Props> = ({
  items,
  watchContext,
  selectedItemNames,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: PointerEvent) => {
      if (stackRef.current && !stackRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, [isExpanded]);

  if (items.length === 0) return null;

  if (items.length === 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return (
      <WatchableItemTile
        item={items[0]!}
        watchContext={watchContext}
        selectedItemNames={selectedItemNames}
      />
    );
  }

  const sorted = sortByRarity(items);
  const topItem = sorted[0];
  if (!topItem) {
    return null;
  }
  const remainingCount = sorted.length - 1;
  const hasItemFilter = selectedItemNames.length > 0;
  const hasSelectedItem = items.some((item) =>
    selectedItemNames.includes(item.name),
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExpanded && stackRef.current) {
      setAnchorRect(stackRef.current.getBoundingClientRect());
    }
    setIsExpanded((prev) => !prev);
  };

  return (
    <div
      ref={stackRef}
      className={cn(
        "relative cursor-pointer rounded-lg transition-[opacity,filter] duration-200",
        isExpanded && "z-40",
        hasItemFilter && !hasSelectedItem && "opacity-35 grayscale-[0.45]",
      )}
      onClick={handleClick}
    >
      <div className="relative">
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
      </div>

      <AnimatePresence>
        {isExpanded && anchorRect && (
          <ItemStackExpanded
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
