import { AnimatePresence } from "framer-motion";
import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { ArrowUp, Pause, Play, Radio } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { LiveFeedSkeleton } from "./live-feed-skeleton";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { useLiveFeed } from "./use-live-feed";
import { AnimatedLiveFeedRow } from "./animated-live-feed-row";
import { groupFeedItems } from "./live-feed-state";

export function DashboardLiveFeed() {
  const { t } = useTranslation();
  const { state, paused, setPaused, setAtTop, applyPending, refresh } =
    useLiveFeed();
  const scroller = useRef<HTMLDivElement>(null);
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
  const items = state.items?.filter(
    (item) => new Date(item.occurredAt).getTime() >= now - 86_400_000,
  );
  const showPending = () => {
    applyPending();
    scroller.current?.scrollTo({ top: 0, behavior: "auto" });
  };
  return (
    <SectionCard className="@container/feed h-[36rem] min-w-0 overflow-hidden @3xl/dashboard:h-full @3xl/dashboard:min-h-0 @3xl/dashboard:col-start-1 @3xl/dashboard:row-start-1">
      <SectionCardHeader
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
              onClick={() => setPaused(!paused)}
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
      <ScrollArea
        ref={scroller}
        orientation="vertical"
        className="min-h-0 min-w-0 flex-1"
        role="region"
        aria-label={t("statistics.feedTitle")}
        onScroll={(event) => setAtTop(event.currentTarget.scrollTop <= 8)}
      >
        <div className="flex min-h-full flex-col">
          <div ref={top} className="h-px shrink-0" aria-hidden />
          {items === undefined ? (
            !state.isError && !paused && <LiveFeedSkeleton />
          ) : (
            <>
              {items.length === 0 && !state.isError && (
                <p className="flex flex-1 items-center justify-center px-3 py-8 text-center text-sm text-muted-foreground">
                  {t("statistics.feedEmpty")}
                </p>
              )}
              <ol
                aria-label={t("statistics.feedTitle")}
                aria-busy={state.isFetching}
              >
                <AnimatePresence>
                  {groupFeedItems(items).map(({ key, item, organizations }) => (
                    <AnimatedLiveFeedRow
                      key={key}
                      animateEntry={state.animatedKeys.includes(key)}
                      item={item}
                      organizations={organizations}
                      now={now}
                    />
                  ))}
                </AnimatePresence>
              </ol>
            </>
          )}
        </div>
      </ScrollArea>
    </SectionCard>
  );
}
