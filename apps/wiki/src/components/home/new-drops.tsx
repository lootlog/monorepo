import { useCatalogControllerGetItems } from "@lootlog/client/search";
import { ItemRarity } from "@lootlog/ui/lib/item-rarity";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { t } from "@/i18n/messages";

const NEW_DROPS = {
  rarities: [ItemRarity.LEGENDARY, ItemRarity.HEROIC],
  sort: "newest",
  limit: 12,
} as const;

/** Legendary and heroic items Lootlog saw for the first time most recently. */
export function NewDrops() {
  const { data, isError } = useCatalogControllerGetItems({
    ...NEW_DROPS,
    rarities: [...NEW_DROPS.rarities],
  });

  return (
    <CatalogItemGrid
      items={data?.hits}
      isError={isError}
      placeholders={NEW_DROPS.limit}
      emptyLabel={t("home.newDropsEmpty")}
    />
  );
}
