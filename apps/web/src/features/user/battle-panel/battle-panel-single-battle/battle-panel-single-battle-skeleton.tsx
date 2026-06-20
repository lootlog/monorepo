import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import type { CSSProperties } from "react";

const layoutStyle = {
  "--battle-chart-height": "360px",
  "--battle-scroll-viewport-height": "calc(100dvh - 3.5rem)",
  "--battle-side-card-height":
    "max(0px, calc(var(--battle-scroll-viewport-height) - var(--battle-chart-height) - 32px))",
} as CSSProperties;

const teamRows = Array.from({ length: 3 });
const chartTicks = Array.from({ length: 7 });
const chartBarHeights = [
  "h-12",
  "h-20",
  "h-28",
  "h-16",
  "h-36",
  "h-24",
  "h-32",
];
const statsRows = Array.from({ length: 14 });
const logTurns = Array.from({ length: 9 });
const recentRows = Array.from({ length: 7 });

export const BattlePanelSingleBattleSkeleton = () => {
  return (
    <ScrollArea className="h-full bg-background/50" aria-hidden="true">
      <div className="flex flex-col gap-4 px-3 py-3" style={layoutStyle}>
        <Card className="w-full gap-0 overflow-hidden border-border bg-card/40 p-0 backdrop-blur-sm">
          <div className="relative bg-gradient-to-r from-green-400/10 via-transparent to-red-400/10 text-white">
            <div className="p-4 pb-6 pt-12">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-12 rounded-sm" />
                  </div>
                  <div className="space-y-2">
                    {teamRows.map((_, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-md bg-background/35 p-2"
                      >
                        <Skeleton className="size-9 shrink-0 rounded-sm" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-4 w-10" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid min-h-28 grid-cols-3 items-center justify-items-center">
                  <Skeleton className="size-10 rounded-full opacity-60" />
                  <div className="space-y-2 text-center">
                    <Skeleton className="mx-auto h-8 w-12" />
                    <Skeleton className="mx-auto h-3 w-20" />
                  </div>
                  <Skeleton className="size-10 rounded-full opacity-60" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-12 rounded-sm" />
                  </div>
                  <div className="space-y-2">
                    {teamRows.map((_, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-md bg-background/35 p-2"
                      >
                        <Skeleton className="size-9 shrink-0 rounded-sm" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-4 w-10" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 border-t border-border/70 bg-background/70 p-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3 lg:sticky lg:top-3 lg:z-20">
          <div className="bg-background">
            <Card className="gap-3 border-border bg-card p-3">
              <div className="flex flex-wrap items-start justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded-sm" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64 max-w-[60vw]" />
                  </div>
                </div>
                <Skeleton className="h-8 w-28 rounded-sm" />
              </div>

              <div className="relative h-64 w-full overflow-hidden rounded-md border border-border/60 bg-background/45 px-4 py-5">
                <div className="absolute inset-x-4 top-1/2 h-px bg-border/70" />
                <div className="absolute inset-x-4 top-1/4 h-px bg-border/40" />
                <div className="absolute inset-x-4 top-3/4 h-px bg-border/40" />
                <div className="flex h-full items-end justify-between gap-2">
                  {chartTicks.map((_, index) => (
                    <div
                      key={index}
                      className="flex h-full flex-1 flex-col justify-end gap-2"
                    >
                      <Skeleton
                        className={`w-full rounded-sm ${chartBarHeights[index] ?? "h-16"}`}
                      />
                      <Skeleton className="mx-auto h-2 w-8" />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.3fr)] xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)_minmax(300px,0.9fr)]">
            <div className="min-w-0">
              <Card className="flex w-full flex-col gap-0 overflow-hidden border-border bg-card/40 p-0 backdrop-blur-sm lg:h-[var(--battle-side-card-height)] lg:min-h-0">
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
                        className="grid h-10 grid-cols-[24px_54px_78px_44px_minmax(0,1fr)] items-center gap-2 border-b border-border/70 px-2"
                      >
                        <Skeleton className="size-5 rounded-sm" />
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-full" />
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
