import { groupBy } from "es-toolkit";
import { useCatalogControllerGetItems } from "@lootlog/client/search";
import {
  ITEM_RARITIES_BY_VALUE,
  resolveItemRarity,
} from "@lootlog/ui/lib/item-rarity";
import { LOOT_RARITY_TEXT_CLASS } from "@lootlog/ui/lib/item-rarity-colors";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { t } from "@/i18n/messages";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";

const DROPS_LIMIT = 96;

/** A monster's drops, the most valuable rarity first, newest within each. */
export function NpcDrops({ npcKey }: { npcKey: string }) {
  const { data, isError } = useCatalogControllerGetItems({
    droppedBy: npcKey,
    gameVersion: WIKI_GAME_VERSION,
    sort: "newest",
    limit: DROPS_LIMIT,
  });

  if (!data || isError || data.hits.length === 0) {
    return (
      <CatalogItemGrid
        items={data?.hits}
        isError={isError}
        placeholders={8}
        emptyLabel={t("catalog.noDropsYet")}
        showSource={false}
      />
    );
  }

  const byRarity = groupBy(data.hits, (item) => resolveItemRarity(item.rarity));

  return (
    <div className="flex flex-col gap-8">
      {ITEM_RARITIES_BY_VALUE.flatMap((rarity) => {
        const items = byRarity[rarity];

        if (!items) return [];

        return [
          <section
            key={rarity}
            aria-labelledby={`npc-drops-${rarity}`}
            className="flex flex-col gap-3"
          >
            <h3
              id={`npc-drops-${rarity}`}
              className="flex items-baseline gap-2 text-sm font-semibold"
            >
              <span className={LOOT_RARITY_TEXT_CLASS[rarity]}>
                {t(`catalog.dropRarities.${rarity}`)}
              </span>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {items.length}
              </span>
            </h3>
            <CatalogItemGrid
              items={items}
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
