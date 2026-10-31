import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import {
  type CatalogControllerGetItemsParams,
  catalogControllerGetItems,
  getCatalogControllerGetItemsQueryKey,
} from "@lootlog/client/search";
import { Button } from "@lootlog/ui/components/button";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import { t } from "@/i18n/messages";

const PAGE_SIZE = 48;

// Meilisearch counts hits exactly up to its `maxTotalHits`; a count that
// reaches it means "at least this many".
const COUNTED_HITS = 1000;

type ItemResultsProps = {
  params: Omit<CatalogControllerGetItemsParams, "limit" | "offset">;
  /** The typed phrase, highlighted in item names. */
  query: string;
};

/** The item search's hits, a page at a time, with how many there are. */
export function ItemResults({ params, query }: ItemResultsProps) {
  const { data, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: [...getCatalogControllerGetItemsQueryKey(params), "pages"],
      queryFn: ({ pageParam, signal }) =>
        catalogControllerGetItems(
          { ...params, limit: PAGE_SIZE, offset: pageParam },
          { signal },
        ),
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) => {
        const loaded = pages.reduce((sum, page) => sum + page.hits.length, 0);

        return lastPage.hits.length === PAGE_SIZE &&
          loaded < lastPage.estimatedTotalHits
          ? loaded
          : undefined;
      },
      placeholderData: keepPreviousData,
    });

  const items = data?.pages.flatMap((page) => page.hits);
  const total = data?.pages[0]?.estimatedTotalHits ?? 0;

  return (
    <section aria-labelledby="items-results" className="flex flex-col gap-3">
      <h2
        id="items-results"
        aria-live="polite"
        className="text-sm font-semibold text-foreground tabular-nums"
      >
        {data
          ? t(
              total >= COUNTED_HITS ? "search.resultsCapped" : "search.results",
              {
                count: total.toLocaleString("pl-PL"),
              },
            )
          : t("search.loading")}
      </h2>
      <CatalogItemGrid
        items={items}
        isError={isError}
        placeholders={12}
        emptyLabel={t("search.noResults")}
        highlight={query}
      />
      {items && hasNextPage ? (
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("search.shown", {
              shown: items.length.toLocaleString("pl-PL"),
              total: total.toLocaleString("pl-PL"),
            })}
          </p>
          <Button
            type="button"
            variant="outline"
            loading={isFetchingNextPage}
            icon={<ChevronDown />}
            onClick={() => void fetchNextPage()}
          >
            {t("search.showMore")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
