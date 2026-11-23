import { getNpcTypeStrengthRank } from "@lootlog/domain/npc-type";
import { findNpcType } from "@/constants/npc";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import { useTimerExpiry } from "./use-timer-expiry";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { EmptyMedia } from "@lootlog/ui/components/empty";
import { groupBy, sortBy } from "es-toolkit";
import { AlertCircle, Clock3, SearchX } from "lucide-react";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { EASE_EMPHASIZED, MOTION_DURATION } from "@/lib/motion";
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
import { TimersFilters } from "./timers-filters";
import { KillStatsSearch } from "@/components/common/kill-stats-search";

import { GuildWorldHeaderSwitcher } from "@/components/layout/guild-world-header-switcher";
import { useViewMode } from "@/hooks/use-view-mode";
import { useTranslation } from "react-i18next";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { getTimersControllerGetTimersQueryKey } from "@lootlog/client/main";
import {
  getTimerIdentityKey,
  getTimerPhase,
  getTimerSortTimeLeft,
  getTimerTimeLeft,
} from "@lootlog/domain/timers";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { useGuildTimers } from "./use-guild-timers";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildHeroSightings } from "@/features/guild/hero-sightings/use-guild-hero-sightings";
import { canViewHeroSightings } from "@/lib/hero-sightings-permissions";
import { findTimerHeroSighting } from "@/features/guild/hero-sightings/find-timer-hero-sighting";
import { useTimerDisplaySettings } from "./use-timer-display-settings";
import { useTimerExpiryClock } from "./use-timer-expiry-clock";
import { ThemeEmptyStateIcon } from "@/themes/adapters";
import { RetryButton } from "@/components/common/retry-button";
import { ClearFiltersButton } from "@/components/common/clear-filters-button";
import { QueryErrorNotice } from "@/components/common/query-error-notice";
import { ResultsSurface } from "@/components/common/results-surface";

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
  const expiryNow = useTimerExpiryClock(timers, removeTimerAfterMs);

  const listedTimers = timers?.filter(
    (timer) =>
      isPinned(timer) ||
      getTimerPhase(getTimerTimeLeft(timer, expiryNow), removeTimerAfterMs) !==
        "expired",
  );

  const { data: accessPolicy } = useGuildPermissions();

  const { sightings } = useGuildHeroSightings({
    enabled: canViewHeroSightings(accessPolicy),
  });

  const [search, setSearch] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const { viewMode, setViewMode, canChooseViewMode } = useViewMode(
    TIMERS_VIEW_MODE_KEY,
    "list",
    TIMERS_GRID_MEDIA_QUERY,
  );

  const { t } = useTranslation();

  const { filtered, hasFilteredTimers, showsNoSearchResults } =
    getTimerListState(listedTimers, search);

  const sorted = sortBy(
    (filtered ?? []).map((timer) => {
      const timeLeft = getTimerTimeLeft(timer, now);

      return {
        timer,
        sortTimeLeft: getTimerSortTimeLeft(timeLeft),
        isKept: getTimerPhase(timeLeft, removeTimerAfterMs) === "expired",
      };
    }),
    [
      ({ timer }) => getNpcTypeStrengthRank(timer.npc?.type),
      ({ isKept }) => (isKept ? 1 : 0),
      ({ isKept, sortTimeLeft }) => (isKept ? -sortTimeLeft : sortTimeLeft),
    ],
  ).map(({ timer }) => timer);

  const groups = groupBy(sorted, (timer) => timer.npc?.type ?? "");

  const groupLabel = (key: string) => {
    const npcType = findNpcType(key);

    return npcType ? t(`npcType.${npcType}`) : t("timers.npcType.manual");
  };

  const activeGroups = selectedGroups.filter((key) => key in groups);
  const activeGroupKeys = new Set(activeGroups);

  const visibleGroups = Object.entries(groups).filter(
    ([key]) => activeGroupKeys.size === 0 || activeGroupKeys.has(key),
  );

  const groupChips = activeGroups.map((key) => ({
    id: key,
    label: groupLabel(key),
    onRemove: () =>
      setSelectedGroups(activeGroups.filter((group) => group !== key)),
  }));

  const clearFilters = () => {
    setSearch("");
    setSelectedGroups([]);
  };

  const retryButton = (
    <RetryButton onRetry={() => refetch()} isRetrying={isFetching} />
  );

  const renderContent = () => {
    if (isError && timers === undefined) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={AlertCircle}
            title={t("timers.loadError")}
            description={t("timers.loadErrorDescription")}
            action={retryButton}
          />
        </div>
      );
    }

    if (isPending) {
      return <TimersListSkeleton viewMode={viewMode} />;
    }

    if (!hasFilteredTimers) {
      return (
        <div className="p-3">
          {showsNoSearchResults ? (
            <EmptyState
              fill
              icon={SearchX}
              title={t("timers.noResults")}
              description={t("timers.noResultsDescription")}
              action={<ClearFiltersButton onClear={clearFilters} />}
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

    return visibleGroups.map(([key, groupTimers]) => (
      <section key={key} aria-labelledby={`timers-group-${key}`}>
        <ListGroupHeading id={`timers-group-${key}`} count={groupTimers.length}>
          {groupLabel(key)}
        </ListGroupHeading>
        <div className="overflow-hidden">
          <div className={cn(getTimerGroupClassName(viewMode), "relative")}>
            <AnimatePresence initial={false} mode="popLayout">
              {groupTimers.map((timer) => (
                <m.div
                  key={getTimerIdentityKey(timer)}
                  layout="position"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: MOTION_DURATION.long,
                    ease: EASE_EMPHASIZED,
                  }}
                  data-list-tile
                  className={getTimerCellClassName(viewMode)}
                >
                  <SingleTimer
                    timer={timer}
                    paint={getPaint(timer.npc?.name ?? "")}
                    countdownMode={countdownMode}
                    removeTimerAfterMs={removeTimerAfterMs}
                    showWorld={world === null}
                    heroSighting={findTimerHeroSighting(sightings, timer)}
                  />
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>
    ));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{t("layout.navigation.timers")}</h1>
      <GuildWorldHeaderSwitcher />
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <ResultsSurface
          search={
            <KillStatsSearch
              value={search}
              placeholder={t("timers.filterPlaceholder")}
              onChange={setSearch}
            />
          }
          filters={
            <TimersFilters
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
          }
          filtersLabel={t("timers.filterLabel")}
          chips={groupChips}
          clearFiltersLabel={t("common.actions.clearFilters")}
          onClearFilters={clearFilters}
        >
          {isError && timers !== undefined && (
            <QueryErrorNotice
              message={t("timers.refreshError")}
              onRetry={() => refetch()}
              isRetrying={isFetching}
            />
          )}
          {renderContent()}
        </ResultsSurface>
      </ScrollArea>
    </div>
  );
};
