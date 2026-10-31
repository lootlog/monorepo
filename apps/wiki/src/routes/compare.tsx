import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Trash2 } from "lucide-react";
import { useCatalogControllerGetItems } from "@lootlog/client/search";
import { Button } from "@lootlog/ui/components/button";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ShareLinkButton } from "@/components/common/share-link-button";
import { ItemComparisonTable } from "@/components/comparison/item-comparison-table";
import { useItemComparison } from "@/contexts/item-comparison-context";
import { t } from "@/i18n/messages";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import {
  encodeItemComparison,
  ITEM_COMPARISON_PARAM,
  MAX_COMPARED_ITEMS,
} from "@/lib/item-comparison";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";

export const Route = createFileRoute("/compare")({
  component: CompareRoute,
  head: () => ({
    meta: [{ title: `${t("comparison.metaTitle")} | ${t("meta.title")}` }],
  }),
});

function CompareRoute() {
  const { items, clear } = useItemComparison();
  const ids = items.map(({ id }) => id);

  const { data, isError } = useCatalogControllerGetItems(
    { ids, gameVersion: WIKI_GAME_VERSION, limit: MAX_COMPARED_ITEMS },
    {
      query: {
        enabled: ids.length > 0,
        placeholderData: (previous) => previous,
      },
    },
  );

  const byId = new Map((data?.hits ?? []).map((item) => [item.id, item]));

  // Items keep the order they were added in; one gone from the catalog drops.
  const compared = items.flatMap(({ id, upgrade }) => {
    const item = byId.get(id);

    return item ? [{ item, upgrade }] : [];
  });

  return (
    <div className="flex flex-col gap-6 py-6">
      <header className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("comparison.title")}
          </h1>
          <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
            {t("comparison.description", { count: MAX_COMPARED_ITEMS })}
          </p>
        </div>
        {items.length > 0 ? (
          <div className="flex shrink-0 gap-2">
            <ShareLinkButton
              path="/compare"
              param={ITEM_COMPARISON_PARAM}
              value={encodeItemComparison(items)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("comparison.clear")}
              title={t("comparison.clear")}
              onClick={clear}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </header>

      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("catalog.loadError")}
        </p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border px-5 py-6">
          <p className="text-sm text-muted-foreground">
            {t("comparison.empty")}
          </p>
          <Button
            variant="outline"
            size="sm"
            icon={<Search />}
            render={<Link to="/items" search={EMPTY_ITEMS_SEARCH} />}
            nativeButton={false}
          >
            {t("comparison.searchItems")}
          </Button>
        </div>
      ) : !data ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <>
          <ItemComparisonTable items={compared} />
          {items.length < MAX_COMPARED_ITEMS ? (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              icon={<Search />}
              render={<Link to="/items" search={EMPTY_ITEMS_SEARCH} />}
              nativeButton={false}
            >
              {t("comparison.addMore", {
                count: MAX_COMPARED_ITEMS - items.length,
              })}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
