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
    search: { rarities: ItemRarity.HEROIC, bosses: "HERO,EVENT_HERO" },
  },
  {
    key: "highLevelLegendaries",
    search: { rarities: ItemRarity.LEGENDARY, minLevel: 250 },
  },
  // Group fights go to whoever moves first, so players gear for speed.
  {
    key: "fastestTrackerNecklaces",
    search: { slot: "necklace", professions: "t", sort: "attackSpeed:desc" },
  },
  {
    key: "fastestTrackerHelmets",
    search: { slot: "helmet", professions: "t", sort: "attackSpeed:desc" },
  },
  {
    key: "fastestHunterNecklaces",
    search: { slot: "necklace", professions: "h", sort: "attackSpeed:desc" },
  },
];

export function QuickSearches() {
  return (
    <nav
      aria-label={t("home.quickSearchesLabel")}
      className="-mx-4 flex w-[calc(100%+2rem)] max-w-3xl gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {QUICK_SEARCHES.map(({ key, search }) => (
        <Button
          key={key}
          variant="outline"
          size="sm"
          className="shrink-0"
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
