import { groupBy } from "es-toolkit";
import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import {
  ITEM_RARITIES_BY_VALUE,
  resolveItemRarity,
} from "@lootlog/ui/lib/item-rarity";
import { LOOT_RARITY_TEXT_CLASS } from "@lootlog/ui/lib/item-rarity-colors";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { t } from "@/i18n/messages";

type ItemsByRarityProps = {
  items: readonly CatalogItemDtoOutput[];
  /** Makes the rarity headings' ids unique on the page. */
  idPrefix: string;
};

/** Items under their rarities, the most valuable first, in the given order within each. */
export function ItemsByRarity({ items, idPrefix }: ItemsByRarityProps) {
  const byRarity = groupBy(items, (item) => resolveItemRarity(item.rarity));

  return (
    <div className="flex flex-col gap-8">
      {ITEM_RARITIES_BY_VALUE.flatMap((rarity) => {
        const rarityItems = byRarity[rarity];

        if (!rarityItems) return [];

        return [
          <section
            key={rarity}
            aria-labelledby={`${idPrefix}-${rarity}`}
            className="flex flex-col gap-3"
          >
            <h3
              id={`${idPrefix}-${rarity}`}
              className="flex items-baseline gap-2 text-sm font-semibold"
            >
              <span className={LOOT_RARITY_TEXT_CLASS[rarity]}>
                {t(`catalog.dropRarities.${rarity}`)}
              </span>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {rarityItems.length}
              </span>
            </h3>
            <CatalogItemGrid
              items={rarityItems}
              isError={false}
              placeholders={0}
              emptyLabel=""
              showSource={false}
            />
          </section>,
        ];
      })}
    </div>
  );
}
