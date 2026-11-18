import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ShowMoreResults } from "@/components/common/show-more-results";
import { t } from "@/i18n/messages";
import {
  npcResultsQueryOptions,
  RESULTS_PAGE_SIZE,
} from "@/lib/catalog-page-queries";
import { CATALOG_MAX_HITS } from "@/lib/catalog-pages";
import { ITEM_LIST_CLASS } from "@/lib/item-list-layout";
import type { NpcSearchParams } from "@/lib/npcs-search";
import { NpcCard } from "./npc-card";

type NpcResultsProps = {
  params: NpcSearchParams;
  /** The typed phrase, highlighted in names. */
  query: string;
  /** The active filters, shown beside the count. */
  filters?: ReactNode;
};

/** The NPC search's hits, a page at a time, with how many there are. */
export function NpcResults({ params, query, filters }: NpcResultsProps) {
  const { data, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      ...npcResultsQueryOptions(params),
      placeholderData: keepPreviousData,
    });

  const npcs = data?.pages.flatMap((page) => page.hits);
  const total = data?.pages[0]?.estimatedTotalHits ?? 0;
  const reachable = Math.min(total, CATALOG_MAX_HITS);

  return (
    <section aria-labelledby="npcs-results" className="flex flex-col gap-3">
      <div className="flex min-h-7 flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2
          id="npcs-results"
          aria-live="polite"
          className="text-sm font-semibold text-foreground tabular-nums"
        >
          {data
            ? t("search.results", { count: total.toLocaleString("pl-PL") })
            : t("search.loading")}
        </h2>
        {filters}
      </div>
      {isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("catalog.loadError")}
        </p>
      ) : npcs?.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("search.noResults")}</p>
      ) : (
        <TooltipProvider delay={100}>
          <ul className={ITEM_LIST_CLASS}>
            {npcs
              ? npcs.map((npc) => (
                  <li key={npc.key}>
                    <NpcCard npc={npc} highlight={query} />
                  </li>
                ))
              : Array.from({ length: 12 }, (_, index) => (
                  <li key={index}>
                    <Skeleton className="h-20 rounded-md" />
                  </li>
                ))}
          </ul>
        </TooltipProvider>
      )}
      {npcs && hasNextPage ? (
        <ShowMoreResults
          shown={npcs.length}
          total={reachable}
          next={Math.min(RESULTS_PAGE_SIZE, reachable - npcs.length)}
          isLoading={isFetchingNextPage}
          onShowMore={() => void fetchNextPage()}
        />
      ) : null}
    </section>
  );
}
