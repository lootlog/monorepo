import type {
  CatalogDropSourceDtoOutput,
  CatalogItemDtoOutput,
} from "@lootlog/client/catalog";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { t } from "@/i18n/messages";
import { ITEM_LIST_CLASS } from "@/lib/item-list-layout";
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
  /** Shows how often this boss's kills drop each item, on the boss's page. */
  dropRateOf?: Pick<CatalogDropSourceDtoOutput, "name" | "type">;
};

export function CatalogItemGrid({
  items,
  isError,
  placeholders,
  emptyLabel,
  showSource,
  highlight,
  maxLevel,
  attackSpeed,
  dropRateOf,
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
      <div className={ITEM_LIST_CLASS} aria-busy="true">
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
      <ul className={ITEM_LIST_CLASS}>
        {items.map((item) => (
          <li key={item.id}>
            <CatalogItemCard
              item={item}
              showSource={showSource}
              highlight={highlight}
              maxLevel={maxLevel}
              attackSpeed={attackSpeed}
              dropRateOf={dropRateOf}
            />
          </li>
        ))}
      </ul>
    </TooltipProvider>
  );
}
