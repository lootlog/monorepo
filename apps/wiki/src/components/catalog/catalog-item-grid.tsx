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
  placeholders: number;
  emptyLabel: string;
  showSource?: boolean;
  highlight?: string;
  maxLevel?: number;
  attackSpeed?: AttackSpeedRanking;
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
