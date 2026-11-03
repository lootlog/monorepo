import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import { CatalogItemCard } from "./catalog-item-card";
import type { AttackSpeedRanking } from "./item-attack-speed";

type CatalogItemGridProps = {
  items: readonly CatalogItemDtoOutput[] | undefined;
  isError: boolean;
  /** How many placeholders hold the grid's place while it loads. */
  placeholders: number;
  emptyLabel: string;
  showSource?: boolean;
  /** The searched phrase, marked in item names. */
  highlight?: string;
  /** The highest level the items are filtered to. */
  maxLevel?: number;
  /** Shows the attack speed each item adds, for a list ranked by it. */
  attackSpeed?: AttackSpeedRanking;
};

/** The catalog's grid of tiles, as many columns as fit. */
export const CATALOG_GRID =
  "grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3";

// Item rows are wider than tiles, so a name and its source share a line.
const ITEM_LIST =
  "grid grid-cols-[repeat(auto-fill,minmax(min(22rem,100%),1fr))] gap-1.5";

export function CatalogItemGrid({
  items,
  isError,
  placeholders,
  emptyLabel,
  showSource,
  highlight,
  maxLevel,
  attackSpeed,
}: CatalogItemGridProps) {
  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if (!items) {
    return (
      <div className={ITEM_LIST} aria-busy="true">
        {Array.from({ length: placeholders }, (_, index) => (
          <Skeleton
            key={index}
            className={cn(
              "rounded-md",
              showSource === false ? "h-14" : "h-[4.75rem]",
            )}
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  // One provider lets the rows' tooltips open quickly and hand over at once.
  return (
    <TooltipProvider delay={100}>
      <ul className={ITEM_LIST}>
        {items.map((item) => (
          <li key={item.id}>
            <CatalogItemCard
              item={item}
              showSource={showSource}
              highlight={highlight}
              maxLevel={maxLevel}
              attackSpeed={attackSpeed}
            />
          </li>
        ))}
      </ul>
    </TooltipProvider>
  );
}
