import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { t } from "@/i18n/messages";
import { CatalogItemCard } from "./catalog-item-card";

type CatalogItemGridProps = {
  items: readonly CatalogItemDtoOutput[] | undefined;
  isError: boolean;
  /** How many placeholders hold the grid's place while it loads. */
  placeholders: number;
  emptyLabel: string;
  showSource?: boolean;
  /** The searched phrase, marked in item names. */
  highlight?: string;
};

/** The catalog's grid of tiles, as many columns as fit. */
export const CATALOG_GRID =
  "grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3";

export function CatalogItemGrid({
  items,
  isError,
  placeholders,
  emptyLabel,
  showSource,
  highlight,
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
      <div className={CATALOG_GRID} aria-busy="true">
        {Array.from({ length: placeholders }, (_, index) => (
          <Skeleton key={index} className="h-[4.75rem] rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className={CATALOG_GRID}>
      {items.map((item) => (
        <li key={item.id}>
          <CatalogItemCard
            item={item}
            showSource={showSource}
            highlight={highlight}
          />
        </li>
      ))}
    </ul>
  );
}
