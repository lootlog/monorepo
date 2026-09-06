import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { ArrowUp, Pause, Play, Radio } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import { useLiveFeed } from "./use-live-feed";
import { LiveFeedRow } from "./live-feed-row";

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
    <SectionCard className="@container/feed h-[36rem] min-w-0 overflow-hidden @3xl/dashboard:h-full @3xl/dashboard:min-h-0">
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
              size="sm"
              variant="outline"
              onClick={() => setPaused(!paused)}
            >
              {paused ? (
                <Play className="size-4 text-primary" aria-hidden />
              ) : (
                <Pause className="size-4" aria-hidden />
              )}
              {t(
                paused
                  ? "statistics.feedResumeAction"
                  : "statistics.feedPauseAction",
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
          {items === undefined || (items.length === 0 && state.isFetching) ? (
            !state.isError &&
            !paused && (
              <div
                role="status"
                aria-label={t("common.loading")}
                className="space-y-3 p-3"
              >
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            )
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
                {items.map((item) => (
                  <LiveFeedRow key={item.id} item={item} now={now} />
                ))}
              </ol>
            </>
          )}
        </div>
      </ScrollArea>
    </SectionCard>
  );
}
