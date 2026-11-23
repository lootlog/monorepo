import type { ReactNode } from "react";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { ShowMoreResults } from "@/components/common/show-more-results";
import { CatalogItemGrid } from "@/components/catalog/catalog-item-grid";
import type { AttackSpeedRanking } from "@/components/catalog/item-attack-speed";
import { t } from "@/i18n/messages";
import {
  itemResultsQueryOptions,
  RESULTS_PAGE_SIZE,
  type ItemSearchParams,
} from "@/lib/catalog-page-queries";
import { CATALOG_MAX_HITS } from "@/lib/catalog-pages";
import { formatNumber } from "@lootlog/domain/locale";

const ATTACK_SPEED_RANKINGS = new Map<string | undefined, AttackSpeedRanking>([
  ["attackSpeed:desc", "dropped"],
  ["upgradedAttackSpeed:desc", "upgraded"],
]);

type ItemResultsProps = {
  params: ItemSearchParams;
  query: string;
  filters?: ReactNode;
};

export function ItemResults({ params, query, filters }: ItemResultsProps) {
  const {
    data,
    isError,
    isPlaceholderData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    ...itemResultsQueryOptions(params),
    placeholderData: keepPreviousData,
  });

  const items = data?.pages.flatMap((page) => page.hits);
  const total = data?.pages[0]?.estimatedTotalHits ?? 0;
  const reachable = Math.min(total, CATALOG_MAX_HITS);

  return (
    <section aria-labelledby="items-results" className="flex flex-col gap-3">
      <div className="flex min-h-7 flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2
          id="items-results"
          aria-live="polite"
          className="text-sm font-semibold text-foreground tabular-nums"
        >
          {data
            ? t(
                total >= CATALOG_MAX_HITS
                  ? "search.resultsCapped"
                  : "search.results",
                {
                  count: formatNumber(total),
                },
              )
            : t("search.loading")}
        </h2>
        {filters}
      </div>
      <CatalogItemGrid
        items={items}
        isError={isError}
        placeholders={12}
        emptyLabel={t("search.noResults")}
        highlight={query}
        maxLevel={params.maxLevel}
        attackSpeed={ATTACK_SPEED_RANKINGS.get(params.sort)}
        isStale={isPlaceholderData}
        appendedFrom={data?.pages[0]?.hits.length}
      />
      {items && hasNextPage ? (
        <ShowMoreResults
          shown={items.length}
          total={reachable}
          next={Math.min(RESULTS_PAGE_SIZE, reachable - items.length)}
          isLoading={isFetchingNextPage}
          onShowMore={() => void fetchNextPage()}
        />
      ) : null}
    </section>
  );
}
