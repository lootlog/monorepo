import { AnimatePresence } from "framer-motion";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { ArrowUp, Pause, Play, Radio, SlidersHorizontal } from "lucide-react";
import { DEFAULT_ACTIVITY_FEED_SETTINGS } from "@lootlog/domain/activity-feed";
import { Button } from "@lootlog/ui/components/button";
import { LiveFeedSkeleton } from "./live-feed-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { BandSection } from "@/components/common/band-section";
import { FilterCount } from "@/components/common/filter-count";
import {
  LIST_GROUP_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
} from "@/components/common/list-tile";
import { FiltersOverlay } from "@/components/filters/filters-overlay";
import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { useMediaQuery } from "usehooks-ts";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { useLiveFeed } from "./use-live-feed";
import { useActivityFeedSettings } from "./use-activity-feed-settings";
import { AnimatedLiveFeedRow } from "./animated-live-feed-row";
import { LiveFeedFilters } from "./live-feed-filters";
import {
  FEED_WINDOW_MS,
  groupFeedItems,
  isGroupVisible,
  type FeedGroup,
} from "./live-feed-state";

const TIME_SECTIONS = [
  { key: "recent", maxAgeMs: 15 * 60_000 },
  { key: "hour", maxAgeMs: 60 * 60_000 },
  { key: "earlier", maxAgeMs: FEED_WINDOW_MS },
] as const;

const sectionOf = (group: FeedGroup, now: number) =>
  TIME_SECTIONS.find(
    ({ maxAgeMs }) => now - Date.parse(group.occurredAt) < maxAgeMs,
  )?.key ?? "earlier";

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
  const animatedKeys = new Set(state.animatedKeys);

  const groups = groupFeedItems(
    state.items?.filter(
      (item) => new Date(item.occurredAt).getTime() >= now - FEED_WINDOW_MS,
    ) ?? [],
  ).filter((group) => isGroupVisible(group, settings));

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
      <div ref={top} className="h-px shrink-0" aria-hidden />
      {state.items === undefined ? (
        !state.isError && <LiveFeedSkeleton />
      ) : (
        <div aria-busy={state.isFetching}>
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
          {TIME_SECTIONS.map(({ key }) => {
            const sectionGroups = groups.filter(
              (group) => sectionOf(group, now) === key,
            );

            if (sectionGroups.length === 0) return null;

            return (
              <section key={key} aria-labelledby={`${titleId}-${key}`}>
                <h3
                  id={`${titleId}-${key}`}
                  className={cn(
                    LIST_GROUP_HEADING_CLASS,
                    LIST_TILE_INSET_CLASS,
                  )}
                >
                  {t(`statistics.feedSection.${key}`)}
                </h3>
                <ol className="relative before:absolute before:inset-y-0 before:left-[1.375rem] before:w-px before:bg-border/70">
                  <AnimatePresence initial={false}>
                    {sectionGroups.map((group) => (
                      <AnimatedLiveFeedRow
                        key={group.key}
                        animateEntry={animatedKeys.has(group.key)}
                        group={group}
                        now={now}
                      />
                    ))}
                  </AnimatePresence>
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </BandSection>
  );
}
