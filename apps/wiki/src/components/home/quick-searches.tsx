import { Link } from "@tanstack/react-router";
import { Button } from "@lootlog/ui/components/button";
import { ItemRarity } from "@lootlog/ui/lib/item-rarity";
import { t } from "@/i18n/messages";
import type { ItemsSearch } from "@/lib/items-search";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";

// Searches players run most, one click from the home page.
const QUICK_SEARCHES: ReadonlyArray<{
  key: string;
  search: Partial<ItemsSearch>;
}> = [
  {
    key: "titanLegendaries",
    search: { rarities: ItemRarity.LEGENDARY, bosses: "TITAN" },
  },
  {
    key: "colossusLegendaries",
    search: { rarities: ItemRarity.LEGENDARY, bosses: "COLOSSUS" },
  },
  {
    key: "heroHeroics",
    search: { rarities: ItemRarity.HEROIC, bosses: "HERO" },
  },
  {
    key: "highLevelLegendaries",
    search: { rarities: ItemRarity.LEGENDARY, minLevel: "250" },
  },
];

export function QuickSearches() {
  return (
    <nav
      aria-label={t("home.quickSearchesLabel")}
      className="flex flex-wrap gap-2"
    >
      {QUICK_SEARCHES.map(({ key, search }) => (
        <Button
          key={key}
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link to="/items" search={{ ...EMPTY_ITEMS_SEARCH, ...search }} />
          }
        >
          {t(`home.quickSearches.${key}`)}
        </Button>
      ))}
    </nav>
  );
}
