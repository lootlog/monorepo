import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import groupBy from "lodash/groupBy";
import { Clock3, Globe2, Grid2X2, List, SearchX } from "lucide-react";
import { useState } from "react";
import { SingleTimer } from "./single-timer";
import { NPC_TYPE_NAMES, NPC_TYPE_SORT_ORDER } from "@/constants/npc";
import { SearchInput } from "@/components/ui/search-input";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { useViewMode } from "@/hooks/use-view-mode";
import { useTranslation } from "react-i18next";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getTimersControllerGetTimersQueryKey,
  useTimersControllerGetTimers,
} from "@lootlog/api-client/react-query/main/timers";
import { ThemeEmptyStateIcon } from "@/themes";

const getTimerListState = <Timer extends { npc?: { name: string } | null }>(
  timers: Timer[] | undefined,
  search: string,
) => {
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = timers?.filter((timer) =>
    timer.npc?.name.toLowerCase().includes(normalizedSearch),
  );
  const hasFilteredTimers = (filtered?.length ?? 0) > 0;
  return {
    filtered,
    hasFilteredTimers,
    showsNoSearchResults:
      Boolean(normalizedSearch) &&
      (timers?.length ?? 0) > 0 &&
      !hasFilteredTimers,
  };
};

const getViewModeVariant = (isActive: boolean) =>
  isActive ? "default" : "ghost";

const getTimerGroupClassName = (viewMode: "grid" | "list") =>
  viewMode === "grid"
    ? "grid grid-cols-1 gap-1.5 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    : "flex flex-col gap-1.5";

const getEmptyTimerTranslationKeys = (showsNoSearchResults: boolean) =>
  showsNoSearchResults
    ? {
        title: "timers.noResults",
        description: "timers.noResultsDescription",
      }
    : { title: "timers.empty", description: "timers.emptyDescription" };

export const Timers = () => {
  const guildId = useGuildId();
  const { world } = useGuildContext();
  const queryGuildId = guildId ?? "";
  const { data: timers, isPending } = useTimersControllerGetTimers(
    { guildId: queryGuildId },
    { world },
    {
      query: {
        enabled: !!guildId && !!world,
        queryKey: getTimersControllerGetTimersQueryKey(
          { guildId: queryGuildId },
          { world },
        ),
        staleTime: 15_000,
      },
    },
  );
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();
  const { viewMode, setViewMode } = useViewMode("timers-view-mode", "list");
  const { t } = useTranslation();
  const { filtered, hasFilteredTimers, showsNoSearchResults } =
    getTimerListState(timers, search);
  const emptyTranslationKeys =
    getEmptyTimerTranslationKeys(showsNoSearchResults);

  const sortedByTime = filtered?.sort((a, b) => {
    return (
      new Date(a.maxSpawnTime).getTime() - new Date(b.maxSpawnTime).getTime()
    );
  });
  const sorted = sortedByTime?.sort((a, b) => {
    return (
      NPC_TYPE_SORT_ORDER.indexOf(
        a.npc?.type as (typeof NPC_TYPE_SORT_ORDER)[number],
      ) -
      NPC_TYPE_SORT_ORDER.indexOf(
        b.npc?.type as (typeof NPC_TYPE_SORT_ORDER)[number],
      )
    );
  });

  const groups = groupBy(sorted, (timer) => timer.npc?.type ?? "");

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="px-3 pt-3">
        <Card className="gap-2 border-border bg-card p-2">
          <div className="flex items-center gap-2">
            <SearchInput
              placeholder={t("timers.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
              wrapperClassName="flex-1"
            />
            {isMobile ? (
              <WorldSwitcher />
            ) : (
              <div className="flex shrink-0 items-center border-l border-border pl-2">
                <WorldSwitcher />
              </div>
            )}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      onClick={() => setViewMode("list")}
                      variant={getViewModeVariant(viewMode === "list")}
                      size="icon"
                      className="h-8 w-8"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  }
                />
                <TooltipContent side="bottom">
                  <p>{t("timers.view.list")}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      onClick={() => setViewMode("grid")}
                      variant={getViewModeVariant(viewMode === "grid")}
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Grid2X2 className="h-4 w-4" />
                    </Button>
                  }
                />
                <TooltipContent side="bottom">
                  <p>{t("timers.view.grid")}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-3">
        {!world ? (
          <div className="flex flex-1 items-start justify-center px-4 pb-8 pt-5 sm:px-6 md:items-center md:py-8">
            <section className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-border bg-card px-4 py-5 text-center shadow-sm sm:px-7 sm:py-8">
              <div className="mb-4 flex size-14 items-center justify-center rounded-xl border border-border bg-background">
                <ThemeEmptyStateIcon
                  className="size-8 text-muted-foreground"
                  fallback={<Globe2 className="size-8 text-primary" />}
                />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                {t("timers.selectWorldTitle")}
              </h2>
              <p className="mt-1 max-w-xs text-sm leading-5 text-muted-foreground">
                {t("timers.noWorldSelected")}
              </p>
              <div className="mt-5 w-full text-left">
                <WorldSwitcher
                  width="w-full"
                  triggerClassName="h-11 w-full justify-between px-3"
                />
              </div>
            </section>
          </div>
        ) : !isPending && timers && !hasFilteredTimers ? (
          <div className="flex flex-1 items-start justify-center px-3 pb-3 md:items-center">
            <Empty className="min-h-56 w-full max-w-xl">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {showsNoSearchResults ? (
                    <SearchX />
                  ) : (
                    <ThemeEmptyStateIcon fallback={<Clock3 />} />
                  )}
                </EmptyMedia>
                <EmptyTitle>{t(emptyTranslationKeys.title)}</EmptyTitle>
                <EmptyDescription>
                  {t(emptyTranslationKeys.description)}
                </EmptyDescription>
              </EmptyHeader>
              {showsNoSearchResults && (
                <EmptyContent>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSearch("")}
                  >
                    {t("timers.clearSearch")}
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-4 px-3 pb-3">
              {isPending && (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              )}
              {!isPending && timers && hasFilteredTimers && (
                <div className="flex flex-col gap-4">
                  {Object.keys(groups).map((key) => {
                    return (
                      <div key={key}>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-1 mb-2">
                          {NPC_TYPE_NAMES[key as keyof typeof NPC_TYPE_NAMES] ??
                            t("timers.npcType.manual")}{" "}
                          ({groups[key]?.length})
                        </p>
                        <div className={getTimerGroupClassName(viewMode)}>
                          {groups[key]?.map((timer) => {
                            return (
                              <SingleTimer
                                key={timer.npc?.id ?? timer.timerKey}
                                timer={timer}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};
