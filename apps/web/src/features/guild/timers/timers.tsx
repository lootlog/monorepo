import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { findNpcType, getNpcTypeSortIndex } from "@/constants/npc";
import { EmptyState } from "@/components/common/empty-state";
import { useTimerExpiry } from "./use-timer-expiry";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Button } from "@lootlog/ui/components/button";
import { EmptyMedia } from "@lootlog/ui/components/empty";
import { groupBy, sortBy } from "es-toolkit";
import { CircleAlert, Clock3, RotateCcw, SearchX } from "lucide-react";
import { useState } from "react";
import { SingleTimer } from "./single-timer";
import { TimersListSkeleton } from "./timers-list-skeleton";
import {
  getTimerCellClassName,
  getTimerGroupClassName,
  TIMERS_GRID_MEDIA_QUERY,
  TIMERS_VIEW_MODE_KEY,
} from "./timers-layout";
import { ListGroupHeading } from "@/components/common/list-group-heading";
import { cn } from "cn";
import { TimersToolbar } from "./timers-toolbar";

import { GuildWorldHeaderSwitcher } from "@/components/layout/guild-world-header-switcher";
import { useViewMode } from "@/hooks/use-view-mode";
import { useTranslation } from "react-i18next";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { getTimersControllerGetTimersQueryKey } from "@lootlog/client/main";
import { getTimerPhase, getTimerTimeLeft } from "@lootlog/domain/timers";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { useGuildTimers } from "./use-guild-timers";
import { useTimerDisplaySettings } from "./use-timer-display-settings";
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

  const { removeTimerAfterMs, countdownMode, getPaint, isPinned } =
    useTimerDisplaySettings();

  const { world, timers, isPending, isError, isFetching, fetchedAt, refetch } =
    useGuildTimers(removeTimerAfterMs);

  useTimerExpiry(
    timers,
    guildId ? getTimersControllerGetTimersQueryKey({ guildId }) : null,
    fetchedAt,
    removeTimerAfterMs,
  );
  const now = useMinuteTimestamp();
  const [search, setSearch] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const { viewMode, setViewMode, canChooseViewMode } = useViewMode(
    TIMERS_VIEW_MODE_KEY,
    "list",
    TIMERS_GRID_MEDIA_QUERY,
  );

  const { t } = useTranslation();

  const { filtered, hasFilteredTimers, showsNoSearchResults } =
    getTimerListState(timers, search);

  // Kept timers sit below the live ones, most recent first, as in the game;
  // a deleted timer counts from its deletion, as its row does.
  const sorted = sortBy(
    (filtered ?? []).map((timer) => {
      const timeLeft = getTimerTimeLeft(timer, now);

      return {
        timer,
        maxTimeLeft: timeLeft.maxTimeLeft,
        isKept: getTimerPhase(timeLeft, removeTimerAfterMs) === "expired",
      };
    }),
    [
      ({ timer }) => getNpcTypeSortIndex(timer.npc?.type),
      ({ isKept }) => (isKept ? 1 : 0),
      ({ isKept, maxTimeLeft }) => (isKept ? -maxTimeLeft : maxTimeLeft),
    ],
  ).map(({ timer }) => timer);

  const groups = groupBy(sorted, (timer) => timer.npc?.type ?? "");

  const groupLabel = (key: string) => {
    const npcType = findNpcType(key);

    return npcType ? t(`npcType.${npcType}`) : t("timers.npcType.manual");
  };

  // A chosen group that the search or a refresh emptied stops filtering, so
  // the list never ends up blank with no pill left to clear the choice.
  const activeGroups = selectedGroups.filter((key) => key in groups);

  const visibleGroups = Object.entries(groups).filter(
    ([key]) => activeGroups.length === 0 || activeGroups.includes(key),
  );

  const toolbar = (
    <TimersToolbar
      search={search}
      onSearchChange={setSearch}
      groups={Object.entries(groups).map(([key, groupTimers]) => ({
        key,
        label: groupLabel(key),
        count: groupTimers.length,
      }))}
      selectedGroups={activeGroups}
      onSelectedGroupsChange={setSelectedGroups}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      canChooseViewMode={canChooseViewMode}
    />
  );

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
    if (isError && timers === undefined) {
      return (
        <div className="p-3">
          <EmptyState
            fill
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
          <TimersListSkeleton
            viewMode={viewMode}
            canChooseViewMode={canChooseViewMode}
          />
        </ScrollArea>
      );
    }

    if (!hasFilteredTimers) {
      return (
        <div className="p-3">
          {showsNoSearchResults && (
            <div className="-mx-3 -mt-3 mb-3">{toolbar}</div>
          )}
          {showsNoSearchResults ? (
            <EmptyState
              fill
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
              fill
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
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        {toolbar}
        {visibleGroups.map(([key, groupTimers]) => {
          return (
            <section key={key} aria-labelledby={`timers-group-${key}`}>
              <ListGroupHeading
                id={`timers-group-${key}`}
                count={groupTimers.length}
              >
                {groupLabel(key)}
              </ListGroupHeading>
              <div className="overflow-hidden">
                <div className={getTimerGroupClassName(viewMode)}>
                  {groupTimers.map((timer) => (
                    <div
                      key={`${timer.world}:${timer.timerKey}`}
                      data-list-tile
                      className={cn(
                        getTimerCellClassName(viewMode),
                        // A dropped timer renders nothing; its cell goes too.
                        "empty:hidden",
                      )}
                    >
                      <SingleTimer
                        timer={timer}
                        paint={getPaint(timer.npc?.name ?? "")}
                        countdownMode={countdownMode}
                        removeTimerAfterMs={removeTimerAfterMs}
                        isPinned={isPinned(timer)}
                        showWorld={world === null}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </ScrollArea>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{t("layout.navigation.timers")}</h1>
      <GuildWorldHeaderSwitcher />

      <div className="flex min-h-0 flex-1 flex-col">
        {isError && timers !== undefined && (
          <Alert
            variant="destructive"
            className="m-3 flex w-auto flex-wrap items-center justify-between gap-3"
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
