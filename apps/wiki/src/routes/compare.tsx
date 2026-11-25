import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Trash2 } from "lucide-react";
import { useCatalogControllerGetItems } from "@lootlog/client/catalog";
import { Button } from "@lootlog/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
} from "@lootlog/ui/components/empty";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ShareLinkButton } from "@/components/common/share-link-button";
import { ItemComparisonTable } from "@/components/comparison/item-comparison-table";
import { useItemComparison } from "@/contexts/item-comparison-context";
import { PortalPageHeader } from "@lootlog/ui/components/portal-page-header";
import { t } from "@/i18n/messages";
import { wikiPageHead } from "@/lib/link-preview";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import {
  encodeItemComparison,
  ITEM_COMPARISON_PARAM,
  MAX_COMPARED_ITEMS,
} from "@/lib/item-comparison";
import { EMPTY_ITEMS_SEARCH } from "@/navigation/wiki-navigation";

export const Route = createFileRoute("/compare")({
  component: CompareRoute,
  head: () =>
    wikiPageHead({
      path: "/compare",
      title: t("comparison.metaTitle"),
      description: t("meta.description"),
      noindex: true,
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

  const compared = items.flatMap(({ id, upgrade }) => {
    const item = byId.get(id);

    return item ? [{ item, upgrade }] : [];
  });

  return (
    <div className="flex flex-col gap-6 py-6">
      <PortalPageHeader
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
        <Empty>
          <EmptyDescription>{t("comparison.empty")}</EmptyDescription>
          <EmptyContent>
            <Button
              variant="outline"
              size="sm"
              icon={<Search />}
              render={<Link to="/items" search={EMPTY_ITEMS_SEARCH} />}
              nativeButton={false}
            >
              {t("comparison.searchItems")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : compared.length === 0 ? (
        !data || isFetching ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (
          <Empty>
            <EmptyDescription>{t("comparison.notFound")}</EmptyDescription>
            <EmptyContent className="flex-row flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Trash2 />}
                onClick={clear}
              >
                {t("comparison.clear")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Search />}
                render={<Link to="/items" search={EMPTY_ITEMS_SEARCH} />}
                nativeButton={false}
              >
                {t("comparison.searchItems")}
              </Button>
            </EmptyContent>
          </Empty>
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
