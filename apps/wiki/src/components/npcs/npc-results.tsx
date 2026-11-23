import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { TooltipProvider } from "@lootlog/ui/components/tooltip";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
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
import { formatNumber } from "@lootlog/domain/locale";

type NpcResultsProps = {
  params: NpcSearchParams;
  query: string;
  filters?: ReactNode;
};

export function NpcResults({ params, query, filters }: NpcResultsProps) {
  const {
    data,
    isError,
    isPlaceholderData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    ...npcResultsQueryOptions(params),
    placeholderData: keepPreviousData,
  });

  const npcs = data?.pages.flatMap((page) => page.hits);
  const total = data?.pages[0]?.estimatedTotalHits ?? 0;
  const reachable = Math.min(total, CATALOG_MAX_HITS);
  const appendedFrom = data?.pages[0]?.hits.length ?? 0;

  return (
    <section aria-labelledby="npcs-results" className="flex flex-col gap-3">
      <div className="flex min-h-7 flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2
          id="npcs-results"
          aria-live="polite"
          className="text-sm font-semibold text-foreground tabular-nums"
        >
          {data
            ? t("search.results", { count: formatNumber(total) })
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
          <ul
            aria-busy={!npcs || isPlaceholderData || undefined}
            className={cn(
              ITEM_LIST_CLASS,
              "transition-opacity duration-200 motion-reduce:transition-none",
              isPlaceholderData && "opacity-60",
            )}
          >
            {npcs
              ? npcs.map((npc, index) => (
                  <li
                    key={npc.key}
                    className={cn(
                      index >= appendedFrom &&
                        "animate-rise-in motion-reduce:animate-none",
                    )}
                  >
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
