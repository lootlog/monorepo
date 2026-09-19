import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { WorldSelectionEmptyState } from "@/components/common/world-selection-empty-state";
import {
  findNpcType,
  NPC_TYPE_NAMES,
  NPC_TYPE_SORT_ORDER,
} from "@/constants/npc";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { useTimerExpiry } from "./use-timer-expiry";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Button } from "@lootlog/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lootlog/ui/components/empty";
import groupBy from "lodash/groupBy";
import { Clock3, RotateCcw, SearchX } from "lucide-react";
import { useState } from "react";
import { SingleTimer } from "./single-timer";

import { SearchInput } from "@/components/ui/search-input";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useViewMode } from "@/hooks/use-view-mode";
import { useTranslation } from "react-i18next";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getTimersControllerGetTimersQueryKey,
  useTimersControllerGetTimers,
} from "@lootlog/client/main";
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

  const {
    data: timers,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useTimersControllerGetTimers(
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
        placeholderData: undefined,
      },
    },
  );

  useTimerExpiry(timers, guildId, world);
  const [search, setSearch] = useState("");
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
      NPC_TYPE_SORT_ORDER.findIndex((type) => type === a.npc?.type) -
      NPC_TYPE_SORT_ORDER.findIndex((type) => type === b.npc?.type)
    );
  });

  const groups = groupBy(sorted, (timer) => timer.npc?.type ?? "");

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <h1 className="sr-only">{t("layout.navigation.timers")}</h1>
      <div className="px-3 pt-3">
        <SectionCard className="rounded-xl">
          <SectionCardContent className="p-2">
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <SearchInput
                placeholder={t("timers.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
                wrapperClassName="min-w-0 basis-full sm:flex-1"
                aria-label={t("timers.searchPlaceholder")}
              />
              <div className="flex flex-1 items-center sm:flex-none sm:border-l sm:border-border sm:pl-2">
                <WorldSwitcher />
              </div>
              <ViewModeToggle
                value={viewMode}
                onChange={setViewMode}
                listLabel={t("timers.view.list")}
                gridLabel={t("timers.view.grid")}
              />
            </div>
          </SectionCardContent>
        </SectionCard>
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-3">
        {world && isError && (
          <Alert
            variant="destructive"
            className="mx-3 mb-3 w-auto flex flex-wrap items-center justify-between gap-3"
          >
            <AlertDescription>
              {t(
                timers === undefined
                  ? "timers.loadError"
                  : "timers.refreshError",
              )}
            </AlertDescription>
            <Button
              variant="outline"
              size="sm"
              loading={isFetching}
              icon=<RotateCcw className="size-3.5" />
              onClick={() => void refetch()}
            >
              {t("common.actions.retry")}
            </Button>
          </Alert>
        )}
        {!world ? (
          <WorldSelectionEmptyState
            title={t("timers.selectWorldTitle")}
            description={t("timers.noWorldSelected")}
          />
        ) : !isPending && timers && !hasFilteredTimers ? (
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-3 pb-3 md:[align-items:safe_center]">
            <Empty className="min-h-56 w-full max-w-xl">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {showsNoSearchResults ? (
                    <SearchX />
                  ) : (
                    <ThemeEmptyStateIcon fallback=<Clock3 /> />
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
              {hasFilteredTimers && (
                <div className="flex flex-col gap-4">
                  {Object.keys(groups).map((key) => {
                    const npcType = findNpcType(key);

                    return (
                      <div key={key}>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-1 mb-2">
                          {npcType
                            ? NPC_TYPE_NAMES[npcType]
                            : t("timers.npcType.manual")}{" "}
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
