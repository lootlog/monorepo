import { useCatalogControllerGetItems } from "@lootlog/client/search";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { ItemsByRarity } from "@/components/catalog/items-by-rarity";
import { t } from "@/i18n/messages";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";

const DROPS_LIMIT = 96;

/** A monster's drops, the most valuable rarity first, highest level within each. */
export function NpcDrops({ npcKey }: { npcKey: string }) {
  const { data, isError } = useCatalogControllerGetItems({
    droppedBy: npcKey,
    gameVersion: WIKI_GAME_VERSION,
    sort: "lvl:desc",
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

  return <ItemsByRarity items={data.hits} idPrefix="npc-drops" />;
}
