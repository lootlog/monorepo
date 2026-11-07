import { useCatalogControllerGetItems } from "@lootlog/client/catalog";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { t } from "@/i18n/messages";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { ITEM_LIST_CLASS } from "@/lib/item-list-layout";
import { ItemChangeCard } from "./item-change-card";

const ITEMS_SHOWN = 12;

/** The items the game changed most recently, the latest change first. */
export function RecentItemChanges() {
  const { data, isError } = useCatalogControllerGetItems({
    gameVersion: WIKI_GAME_VERSION,
    sort: "changedOn:desc",
    limit: ITEMS_SHOWN,
  });

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("catalog.loadError")}
      </p>
    );
  }

  if (!data) {
    return (
      <div className={ITEM_LIST_CLASS} aria-busy="true">
        {Array.from({ length: ITEMS_SHOWN }, (_, index) => (
          <Skeleton key={index} className="h-14 rounded-md" />
        ))}
      </div>
    );
  }

  // Items the game never changed follow the changed ones.
  const changed = data.hits.filter(({ revisions }) => revisions.length > 0);

  if (changed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("revisions.recentEmpty")}
      </p>
    );
  }

  return (
    <TooltipProvider delay={100}>
      <ul className={ITEM_LIST_CLASS}>
        {changed.map((item) => (
          <li key={item.id}>
            <ItemChangeCard item={item} />
          </li>
        ))}
      </ul>
    </TooltipProvider>
  );
}
