import { sortBy } from "es-toolkit";

import { itemRarityRank } from "@lootlog/domain/item-rarity";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { CatalogItemTile } from "@/components/catalog/catalog-item-tile";
import { type NewBoss, useBossDrops } from "@/hooks/use-new-bosses";
import { t } from "@/i18n/messages";

const DROPS_SHOWN = 10;

export function HeroBossDrops({ boss }: { boss: NewBoss }) {
  const drops = useBossDrops(boss);

  if (!drops) {
    return <Skeleton aria-busy="true" className="h-9 w-full max-w-md" />;
  }

  return (
    <TooltipProvider delay={100}>
      <ul
        aria-label={t("home.bossDrops", { name: boss.name })}
        className="flex max-w-md flex-wrap justify-center gap-2 animate-rise-in"
      >
        {sortBy(drops, [({ rarity }) => itemRarityRank(rarity)])
          .slice(0, DROPS_SHOWN)
          .map((item) => (
            <li key={item.id}>
              <CatalogItemTile item={item} />
            </li>
          ))}
      </ul>
    </TooltipProvider>
  );
}
