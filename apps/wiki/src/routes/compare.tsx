import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Trash2 } from "lucide-react";
import { useCatalogControllerGetItems } from "@lootlog/client/catalog";
import { Button } from "@lootlog/ui/components/button";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ShareLinkButton } from "@/components/common/share-link-button";
import { ItemComparisonTable } from "@/components/comparison/item-comparison-table";
import { useItemComparison } from "@/contexts/item-comparison-context";
import { PageHeader } from "@/components/common/page-header";
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

  const { data, isError, isFetching } = useCatalogControllerGetItems(
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
      <PageHeader
        title={t("comparison.title")}
        description={t("comparison.description", { count: MAX_COMPARED_ITEMS })}
        actions={
          items.length > 0 ? (
            <>
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
            </>
          ) : null
        }
      />

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
      ) : compared.length === 0 ? (
        // An item just added may still be loading; ids the catalog no longer
        // has, from an old visit or a shared link, never load.
        !data || isFetching ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (
          <p className="rounded-xl border border-dashed border-border px-5 py-6 text-sm text-muted-foreground">
            {t("comparison.notFound")}
          </p>
        )
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
