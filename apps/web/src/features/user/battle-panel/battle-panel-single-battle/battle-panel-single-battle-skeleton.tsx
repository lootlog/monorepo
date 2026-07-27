import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import type { CSSProperties } from "react";
import { BattleHpTimelineChartSkeleton } from "./components/battle-hp-timeline-chart-skeleton";

const layoutStyle = {
  "--battle-chart-height": "216px",
  "--battle-scroll-viewport-height": "calc(100dvh - 3.5rem)",
  "--battle-side-card-height":
    "max(0px, calc(var(--battle-scroll-viewport-height) - var(--battle-chart-height) - 32px))",
} as CSSProperties;

const teamRows = Array.from({ length: 2 });
const statsRows = Array.from({ length: 14 });
const logTurns = Array.from({ length: 9 });
const recentRows = Array.from({ length: 7 });

export const BattlePanelSingleBattleSkeleton = () => {
  return (
    <ScrollArea className="h-full bg-background" aria-hidden="true">
      <div className="flex flex-col gap-4 px-3 py-3" style={layoutStyle}>
        <Card className="w-full gap-0 overflow-hidden border-border bg-card p-0">
          <div className="bg-gradient-to-r from-green-400/10 via-transparent to-red-400/10 px-3 py-3">
            <div className="grid grid-cols-1 items-stretch gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
              <section className="min-w-0 rounded-sm bg-background/35 px-2.5 py-2">
                <div className="mb-1.5 flex items-center gap-2">
                  <Skeleton className="size-3.5 rounded-sm" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {teamRows.map((_, index) => (
                    <div
                      key={index}
                      className="flex min-w-0 max-w-full items-center gap-1.5 rounded-sm border border-border/70 bg-muted/35 py-1 pl-1 pr-2"
                    >
                      <Skeleton className="h-9 w-6 shrink-0 rounded-sm" />
                      <div className="min-w-0 space-y-1.5">
                        <Skeleton className="h-3 w-20" />
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-3 w-8" />
                          <Skeleton className="size-4 rounded-full" />
                          <Skeleton className="size-4 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex items-center justify-center py-1 lg:py-0">
                <Skeleton className="h-6 w-9 rounded-sm" />
              </div>

              <section className="min-w-0 rounded-sm bg-background/35 px-2.5 py-2">
                <div className="mb-1.5 flex items-center gap-2 lg:justify-end">
                  <Skeleton className="size-3.5 rounded-sm" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                  {teamRows.map((_, index) => (
                    <div
                      key={index}
                      className="flex min-w-0 max-w-full items-center gap-1.5 rounded-sm border border-border/70 bg-muted/35 py-1 pl-1 pr-2"
                    >
                      <Skeleton className="h-9 w-6 shrink-0 rounded-sm" />
                      <div className="min-w-0 space-y-1.5">
                        <Skeleton className="h-3 w-20" />
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-3 w-8" />
                          <Skeleton className="size-4 rounded-full" />
                          <Skeleton className="size-4 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-border/60 pt-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-3 w-24" />
              ))}
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3 lg:sticky lg:top-3 lg:z-20">
          <div className="bg-background">
            <BattleHpTimelineChartSkeleton />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.3fr)] xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)_minmax(300px,0.9fr)]">
            <div className="min-w-0">
              <Card className="flex w-full flex-col gap-0 overflow-hidden border-border bg-card p-0  lg:h-[var(--battle-side-card-height)] lg:min-h-0">
                <div className="flex min-h-[57px] items-center justify-between gap-3 border-b bg-background px-3 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Skeleton className="size-4 rounded-sm" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Skeleton className="size-9 rounded-sm" />
                    <Skeleton className="size-9 rounded-sm" />
                  </div>
                </div>
                <div className="min-h-0 flex-1 space-y-0 overflow-hidden">
                  {statsRows.map((_, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[minmax(0,1fr)_72px] items-center gap-3 border-b border-border/70 px-3 py-2.5"
                    >
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3.5 w-full" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <Card className="overflow-hidden border-border bg-card p-0 lg:flex lg:h-[var(--battle-side-card-height)] lg:min-h-0 lg:w-full lg:flex-col">
                <div className="flex min-h-[52px] items-center gap-2 border-b bg-background px-3 py-2.5">
                  <Skeleton className="h-9 flex-1 rounded-sm" />
                  <Skeleton className="size-9 rounded-sm" />
                  <Skeleton className="size-9 rounded-sm" />
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  {logTurns.map((_, index) => (
                    <div
                      key={index}
                      className="space-y-2 border-b border-border/70 px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3.5 w-16" />
                      </div>
                      <Skeleton className="h-3.5 w-11/12" />
                      <Skeleton className="h-3.5 w-7/12" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="hidden min-w-0 xl:block xl:self-start">
              <div>
                <Card className="flex max-h-[420px] min-h-0 w-full flex-col gap-0 overflow-hidden border-border bg-card p-0 xl:h-[var(--battle-side-card-height)] xl:max-h-none">
                  <div className="flex min-h-[49px] shrink-0 items-center justify-between gap-3 border-b bg-background px-3 py-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Skeleton className="size-4 rounded-sm" />
                      <Skeleton className="h-4 min-w-0 flex-1" />
                    </div>
                    <Skeleton className="size-8 shrink-0 rounded-sm" />
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {recentRows.map((_, index) => (
                      <div
                        key={index}
                        className="grid min-h-10 grid-cols-[32px_minmax(0,1fr)_68px] items-center gap-2 border-b border-border/70 px-2.5 py-1"
                      >
                        <Skeleton className="size-6 rounded-md" />
                        <div className="flex min-w-0 items-center gap-3.5">
                          <div className="flex max-w-[calc(50%-0.4375rem)] min-w-0 items-center gap-1">
                            <Skeleton className="h-9 w-6 shrink-0 rounded-sm" />
                            <div className="min-w-0 space-y-1.5">
                              <Skeleton className="h-3 w-16" />
                              <Skeleton className="h-3 w-12" />
                            </div>
                          </div>
                          <div className="flex max-w-[calc(50%-0.4375rem)] min-w-0 items-center gap-1">
                            <Skeleton className="h-9 w-6 shrink-0 rounded-sm" />
                            <div className="min-w-0 space-y-1.5">
                              <Skeleton className="h-3 w-16" />
                              <Skeleton className="h-3 w-12" />
                            </div>
                          </div>
                        </div>
                        <Skeleton className="h-4 rounded-sm" />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};
