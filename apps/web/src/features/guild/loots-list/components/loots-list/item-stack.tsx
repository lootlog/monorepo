import { WatchableItemTile } from "@/components/tiles";
import { ItemImage } from "@/components/tiles/item-image";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import { ItemRarity, type Item } from "@/hooks/api/loots/use-loots";
import { cn } from "@lootlog/ui/lib/utils";
import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, type FC } from "react";
import { ItemStackBadge } from "@/features/guild/loots-list/components/loots-list/item-stack-badge";
import { ItemStackExpanded } from "@/features/guild/loots-list/components/loots-list/item-stack-expanded";

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
      (RARITY_PRIORITY[b.rarity] ?? 0) - (RARITY_PRIORITY[a.rarity] ?? 0),
  );

type Props = {
  items: Item[];
  watchContext: WatchedItemScope;
};

export const ItemStack: FC<Props> = ({ items, watchContext }) => {
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
    return <WatchableItemTile item={items[0]!} watchContext={watchContext} />;
  }

  const sorted = sortByRarity(items);
  const topItem = sorted[0];
  if (!topItem) {
    return null;
  }
  const remainingCount = sorted.length - 1;

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
      className={cn("relative cursor-pointer", isExpanded && "z-40")}
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
          <ItemImage rarity={topItem.rarity} icon={topItem.icon} />
        </div>
        <ItemStackBadge count={remainingCount} />
      </div>

      <AnimatePresence>
        {isExpanded && anchorRect && (
          <ItemStackExpanded
            items={sorted}
            anchorRect={anchorRect}
            watchContext={watchContext}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
