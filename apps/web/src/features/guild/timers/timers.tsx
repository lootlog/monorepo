import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { WorldSelectionEmptyState } from "@/components/common/world-selection-empty-state";
import { findNpcType, NPC_TYPE_SORT_ORDER } from "@/constants/npc";
import { EmptyState } from "@/components/common/empty-state";
import { FilterBar } from "@/components/common/filter-bar";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { useTimerExpiry } from "./use-timer-expiry";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Button } from "@lootlog/ui/components/button";
import { EmptyMedia } from "@lootlog/ui/components/empty";
import { groupBy, sortBy } from "es-toolkit";
import { CircleAlert, Clock3, RotateCcw, SearchX } from "lucide-react";
import { useState } from "react";
import { SingleTimer } from "./single-timer";
import { TimersListSkeleton } from "./timers-list-skeleton";
import { getTimerGroupClassName, TIMERS_VIEW_MODE_KEY } from "./timers-layout";

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

export const Timers = () => {
  const guildId = useGuildId();
  const { world } = useGuildContext();
  const queryGuildId = guildId ?? "";

  const {
    data: timers,
    dataUpdatedAt,
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

  useTimerExpiry(timers, guildId, world, dataUpdatedAt);
  const [search, setSearch] = useState("");
  const { viewMode, setViewMode } = useViewMode(TIMERS_VIEW_MODE_KEY, "list");
  const { t } = useTranslation();

  const { filtered, hasFilteredTimers, showsNoSearchResults } =
    getTimerListState(timers, search);

  const sorted = sortBy(filtered ?? [], [
    (timer) =>
      NPC_TYPE_SORT_ORDER.findIndex((type) => type === timer.npc?.type),
    (timer) => new Date(timer.maxSpawnTime).getTime(),
  ]);

  const groups = groupBy(sorted, (timer) => timer.npc?.type ?? "");

  const retryButton = (
    <Button
      type="button"
      variant="outline"
      loading={isFetching}
      icon=<RotateCcw className="size-3.5" />
      onClick={() => void refetch()}
    >
      {t("common.actions.retry")}
    </Button>
  );

  const renderContent = () => {
    if (!world) {
      return (
        <WorldSelectionEmptyState
          title={t("timers.selectWorldTitle")}
          description={t("timers.noWorldSelected")}
        />
      );
    }

    if (isError && timers === undefined) {
      return (
        <div className="px-3 pb-3">
          <EmptyState
            framed
            icon={CircleAlert}
            title={t("timers.loadError")}
            description={t("timers.loadErrorDescription")}
            action={retryButton}
          />
        </div>
      );
    }

    if (isPending) {
      return (
        <ScrollArea className="min-h-0 flex-1">
          <TimersListSkeleton viewMode={viewMode} />
        </ScrollArea>
      );
    }

    if (!hasFilteredTimers) {
      return (
        <div className="px-3 pb-3">
          {showsNoSearchResults ? (
            <EmptyState
              framed
              icon={SearchX}
              title={t("timers.noResults")}
              description={t("timers.noResultsDescription")}
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSearch("")}
                >
                  {t("timers.clearSearch")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              framed
              media={
                <EmptyMedia variant="icon">
                  <ThemeEmptyStateIcon fallback=<Clock3 /> />
                </EmptyMedia>
              }
              title={t("timers.empty")}
              description={t("timers.emptyDescription")}
            />
          )}
        </div>
      );
    }

    return (
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 px-3 pb-3">
          {Object.entries(groups).map(([key, groupTimers]) => {
            const npcType = findNpcType(key);

            return (
              <section key={key} aria-labelledby={`timers-group-${key}`}>
                <h2
                  id={`timers-group-${key}`}
                  className="mb-2 px-1 text-xs font-medium text-muted-foreground"
                >
                  {npcType
                    ? t(`npcType.${npcType}`)
                    : t("timers.npcType.manual")}{" "}
                  ({groupTimers.length})
                </h2>
                <div className={getTimerGroupClassName(viewMode)}>
                  {groupTimers.map((timer) => (
                    <SingleTimer
                      key={timer.npc?.id ?? timer.timerKey}
                      timer={timer}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{t("layout.navigation.timers")}</h1>
      <div className="px-3 pt-3">
        <FilterBar ariaLabel={t("timers.toolbarLabel")}>
          <SearchInput
            placeholder={t("timers.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="h-10 min-w-0 basis-full sm:flex-1 sm:basis-0"
            aria-label={t("timers.searchPlaceholder")}
          />
          <WorldSwitcher />
          <ViewModeToggle
            value={viewMode}
            onChange={setViewMode}
            listLabel={t("timers.view.list")}
            gridLabel={t("timers.view.grid")}
          />
        </FilterBar>
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-3">
        {world && isError && timers !== undefined && (
          <Alert
            variant="destructive"
            className="mx-3 mb-3 flex w-auto flex-wrap items-center justify-between gap-3"
          >
            <AlertDescription>{t("timers.refreshError")}</AlertDescription>
            {retryButton}
          </Alert>
        )}
        {renderContent()}
      </div>
    </div>
  );
};
