import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, Pause, Play, Radio, SlidersHorizontal } from "lucide-react";
import { DEFAULT_ACTIVITY_FEED_SETTINGS } from "@lootlog/domain/activity-feed";
import { Button } from "@lootlog/ui/components/button";
import { LiveFeedSkeleton } from "./live-feed-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { BandSection } from "@/components/common/band-section";
import { FilterCount } from "@/components/common/filter-count";
import { FiltersOverlay } from "@/components/filters/filters-overlay";
import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { useMediaQuery } from "usehooks-ts";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { useLiveFeed } from "./use-live-feed";
import { useActivityFeedSettings } from "./use-activity-feed-settings";
import { LiveFeedSections } from "./live-feed-sections";
import { LiveFeedFilters } from "./live-feed-filters";
import { LiveFeedShowOlder } from "./live-feed-show-older";
import {
  FEED_WINDOW_MS,
  groupFeedItems,
  isGroupVisible,
} from "./live-feed-state";

/** Events listed before the rest folds behind "show older". */
const VISIBLE_GROUPS = 8;

export function DashboardLiveFeed() {
  const { t } = useTranslation();
  const titleId = useId();
  const { settings, isReady, canSave, update } = useActivityFeedSettings();

  const { state, setAtTop, applyPending, refresh } = useLiveFeed({
    filters: settings,
    paused: settings.paused,
    ready: isReady,
  });

  const paused = settings.paused;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isWide = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);
  const top = useRef<HTMLDivElement>(null);
  const now = useMinuteTimestamp();

  const handleVisibility = useEffectEvent((visible: boolean) =>
    setAtTop(visible),
  );

  useEffect(() => {
    const target = top.current;

    if (!target || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];

      if (entry) handleVisibility(entry.isIntersecting);
    });

    observer.observe(target);

    return () => observer.disconnect();
  }, []);

  const groups = groupFeedItems(
    state.items?.filter(
      (item) => new Date(item.occurredAt).getTime() >= now - FEED_WINDOW_MS,
    ) ?? [],
  ).filter((group) => isGroupVisible(group, settings));

  // A fixed number of events keeps the feed's height steady while live
  // entries arrive; older ones wait behind "show older".
  const [expanded, setExpanded] = useState(false);
  const shownGroups = expanded ? groups : groups.slice(0, VISIBLE_GROUPS);

  const activeFilterCount = [
    settings.excludedGuildIds.length > 0,
    settings.excludedNpcCategories.length > 0,
    settings.withLootOnly,
  ].filter(Boolean).length;

  const isFiltered = activeFilterCount > 0;

  const clearFilters = () =>
    update({
      excludedGuildIds: DEFAULT_ACTIVITY_FEED_SETTINGS.excludedGuildIds,
      excludedNpcCategories:
        DEFAULT_ACTIVITY_FEED_SETTINGS.excludedNpcCategories,
      withLootOnly: DEFAULT_ACTIVITY_FEED_SETTINGS.withLootOnly,
    });

  // Back to the newest entries, under the pinned headings.
  const showPending = () => {
    applyPending();
    top.current?.scrollIntoView({
      block: "center",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <BandSection
      id={titleId}
      title={t("statistics.feedTitle")}
      tiled
      trailing={
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={!canSave}
            aria-label={t(
              paused
                ? "statistics.feedResumeAction"
                : "statistics.feedPauseAction",
            )}
            title={t(
              paused
                ? "statistics.feedResumeAction"
                : "statistics.feedPauseAction",
            )}
            onClick={() => update({ paused: !paused })}
          >
            {paused ? (
              <Play className="size-4" aria-hidden />
            ) : (
              <Pause className="size-4" aria-hidden />
            )}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="relative"
            disabled={!canSave}
            aria-label={
              isFiltered
                ? `${t("common.filters.title")}. ${t("common.filters.activeCount", { count: activeFilterCount })}`
                : t("common.filters.title")
            }
            title={t("common.filters.title")}
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            <FilterCount count={activeFilterCount} variant="corner" />
          </Button>
        </div>
      }
    >
      <FiltersOverlay
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title={t("statistics.feedFilters")}
        activeFilterCount={activeFilterCount}
        onClear={clearFilters}
      >
        <LiveFeedFilters
          settings={settings}
          disabled={!canSave}
          onChange={update}
        />
      </FiltersOverlay>
      {/* Floats under the pinned heading while older entries are on screen. */}
      <div
        // Announces the button, which appears while older entries are read.
        aria-live="polite"
        className="pointer-events-none sticky top-[calc(var(--page-sticky-top)+var(--filter-bar-height,0px)+3rem)] z-10 flex h-0 justify-center"
      >
        {state.pending && !paused && (
          <Button
            size="sm"
            className="pointer-events-auto rounded-full shadow-lg shadow-black/40"
            onClick={showPending}
          >
            <ArrowUp className="size-4" aria-hidden />
            {t("statistics.feedNew")}
          </Button>
        )}
      </div>
      {state.isError && (
        <div
          role="alert"
          className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
        >
          <p>{t("statistics.feedError")}</p>
          <Button
            variant="outline"
            size="sm"
            disabled={state.isFetching || paused}
            loading={state.isFetching}
            onClick={refresh}
          >
            {t("common.actions.retry")}
          </Button>
        </div>
      )}
      <div aria-busy={state.isFetching} className="@container">
        <div ref={top} className="h-px shrink-0" aria-hidden />
        {state.items === undefined ? (
          !state.isError && <LiveFeedSkeleton />
        ) : (
          <>
            {groups.length === 0 && !state.isError && (
              <EmptyState
                icon={Radio}
                title={t(
                  isFiltered
                    ? "statistics.feedEmptyFiltered"
                    : "statistics.feedEmpty",
                )}
                // Beside the side column, it centres in the screen it has.
                fill={isWide}
                compact={!isWide}
                action={
                  isFiltered && canSave ? (
                    <Button variant="outline" onClick={clearFilters}>
                      {t("statistics.feedClearFilters")}
                    </Button>
                  ) : undefined
                }
              />
            )}
            <LiveFeedSections
              titleId={titleId}
              groups={shownGroups}
              animatedKeys={state.animatedKeys}
              now={now}
            />
            {groups.length > VISIBLE_GROUPS && (
              <LiveFeedShowOlder
                expanded={expanded}
                hiddenCount={groups.length - VISIBLE_GROUPS}
                onToggle={() => setExpanded(!expanded)}
              />
            )}
          </>
        )}
      </div>
    </BandSection>
  );
}
