import { AnimatePresence } from "framer-motion";
import { useEffect, useEffectEvent, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { ArrowUp, Pause, Play, Radio } from "lucide-react";
import { DEFAULT_ACTIVITY_FEED_SETTINGS } from "@lootlog/domain/activity-feed";
import { Button } from "@lootlog/ui/components/button";
import { LiveFeedSkeleton } from "./live-feed-skeleton";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
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
  const card = useRef<HTMLDivElement>(null);
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

  const isFiltered =
    settings.excludedGuildIds.length > 0 ||
    settings.excludedNpcCategories.length > 0 ||
    settings.withLootOnly;

  const showPending = () => {
    applyPending();
    card.current?.scrollIntoView({ block: "nearest" });
  };

  return (
    <SectionCard
      ref={card}
      aria-labelledby={titleId}
      className="@container/feed min-w-0 @3xl/dashboard:col-start-1 @3xl/dashboard:row-start-1"
    >
      <SectionCardHeader
        id={titleId}
        className="shrink-0"
        icon={Radio}
        title={t("statistics.feedTitle")}
        actions={
          <>
            <Button
              size="sm"
              className={cn(!state.pending && "invisible")}
              aria-label={t("statistics.feedNew")}
              disabled={!state.pending || paused}
              onClick={showPending}
            >
              <ArrowUp className="size-4" aria-hidden />
              <span className="hidden @md/feed:inline">
                {t("statistics.feedNew")}
              </span>
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="size-9"
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
          </>
        }
      />
      <LiveFeedFilters
        settings={settings}
        disabled={!canSave}
        onChange={update}
      />
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
        <div aria-busy={state.isFetching} className="pb-2">
          {groups.length === 0 && !state.isError && (
            <div className="flex flex-col items-center gap-3 px-3 py-10 text-center text-sm text-muted-foreground">
              <p>
                {t(
                  isFiltered
                    ? "statistics.feedEmptyFiltered"
                    : "statistics.feedEmpty",
                )}
              </p>
              {isFiltered && canSave && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update({
                      excludedGuildIds:
                        DEFAULT_ACTIVITY_FEED_SETTINGS.excludedGuildIds,
                      excludedNpcCategories:
                        DEFAULT_ACTIVITY_FEED_SETTINGS.excludedNpcCategories,
                      withLootOnly: DEFAULT_ACTIVITY_FEED_SETTINGS.withLootOnly,
                    })
                  }
                >
                  {t("statistics.feedClearFilters")}
                </Button>
              )}
            </div>
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
                  className="px-4 pt-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground"
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
    </SectionCard>
  );
}
