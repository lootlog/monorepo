import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { BattleTeamMemberSkeleton } from "./components/battle-team-member-skeleton";
import { SectionCard } from "@/components/common/section-card/section-card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { BattleHpTimelineChartSkeleton } from "./components/battle-hp-timeline-chart-skeleton";
import {
  BATTLE_DETAIL_BATTLE_COLUMN_CLASS_NAME,
  BATTLE_DETAIL_BATTLE_CONTENT_CLASS_NAME,
  BATTLE_DETAIL_CHART_SLOT_CLASS_NAME,
  BATTLE_DETAIL_PANELS_COLUMN_CLASS_NAME,
  BATTLE_DETAIL_PANELS_CONTENT_CLASS_NAME,
  BATTLE_DETAIL_TABS_SLOT_CLASS_NAME,
  getBattleDetailContentClassName,
} from "./components/battle-detail-layout";

const metadataItems = ["w-28", "w-14", "w-10", "w-14", "w-16"];

const summaryRows = Array.from({ length: 6 });

const statsRows = Array.from({ length: 21 });

const STATS_CATEGORY_INTERVAL = 5;

const logEntryPattern = [
  ["w-11/12"],
  ["w-3/4"],
  ["w-2/3"],
  ["w-1/2", "w-3/5"],
  ["w-2/5", "w-4/5", "w-1/2", "w-3/5", "w-2/3"],
  ["w-1/3"],
  ["w-1/2", "w-3/4", "w-2/5", "w-3/5"],
  ["w-2/3"],
  ["w-2/5", "w-4/5", "w-1/2"],
  ["w-1/3"],
  ["w-1/2", "w-3/5", "w-2/3", "w-2/5"],
];

// A full-height log column shows more entries than one pattern pass.
const logEntries = [...logEntryPattern, ...logEntryPattern];

const panelCardClassName =
  "flex w-full flex-col overflow-hidden border-border bg-card";

export const BattlePanelSingleBattleSkeleton = () => {
  return (
    <ScrollArea className="h-full bg-background" aria-hidden="true">
      <div className={getBattleDetailContentClassName({ isGroup: false })}>
        <ScrollArea className={BATTLE_DETAIL_BATTLE_COLUMN_CLASS_NAME}>
          <div className={BATTLE_DETAIL_BATTLE_CONTENT_CLASS_NAME}>
            <SectionCard className="w-full overflow-hidden border-border bg-card">
              <div className="grid grid-cols-1 gap-3 bg-gradient-to-r from-green-400/10 via-transparent to-red-400/10 px-3 py-3 @md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @md:gap-4 @md:px-4">
                <section className="flex min-w-0 flex-col gap-2">
                  <div className="flex h-5 items-center gap-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-5 w-20 rounded-sm" />
                  </div>
                  <div className="flex">
                    <BattleTeamMemberSkeleton />
                  </div>
                </section>

                <div className="flex items-center gap-3 @md:flex-col @md:self-stretch">
                  <span className="h-px flex-1 bg-border/70 @md:h-auto @md:w-px" />
                  <Skeleton className="h-6 w-9 rounded-full" />
                  <span className="h-px flex-1 bg-border/70 @md:h-auto @md:w-px" />
                </div>

                <section className="flex min-w-0 flex-col gap-2">
                  <div className="flex h-5 items-center gap-2 @md:flex-row-reverse">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-5 w-20 rounded-sm" />
                  </div>
                  <div className="flex @md:justify-end">
                    <BattleTeamMemberSkeleton />
                  </div>
                </section>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 bg-background/30 px-3 py-2 @md:px-4">
                {metadataItems.map((widthClassName, index) => (
                  <Skeleton key={index} className={cn("h-4", widthClassName)} />
                ))}
              </div>
            </SectionCard>

            <div className={BATTLE_DETAIL_CHART_SLOT_CLASS_NAME}>
              <BattleHpTimelineChartSkeleton />
            </div>

            <div className="hidden min-w-0 xl:block">
              <SectionCard className={panelCardClassName}>
                <SectionCardHeader
                  className="shrink-0"
                  title=<Skeleton className="h-5 w-36" />
                />
                <div className="flex min-h-[49px] shrink-0 items-center gap-2 border-b border-border/70 px-3 py-2">
                  <Skeleton className="h-8 min-w-0 flex-1 rounded-md" />
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="size-8 rounded-md" />
                  <Skeleton className="size-8 rounded-md" />
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  {logEntries.map((lines, index) => (
                    <div
                      key={index}
                      className="flex border-b border-background"
                    >
                      <div className="flex w-10 shrink-0 justify-end px-1.5 pt-1.5">
                        <Skeleton className="h-2 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5 bg-gray-100/10 px-3 py-1.5">
                        {lines.map((widthClassName, lineIndex) => (
                          <Skeleton
                            key={lineIndex}
                            className={cn("h-3", widthClassName)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        </ScrollArea>

        <ScrollArea className={BATTLE_DETAIL_PANELS_COLUMN_CLASS_NAME}>
          <div className={BATTLE_DETAIL_PANELS_CONTENT_CLASS_NAME}>
            <div className={BATTLE_DETAIL_TABS_SLOT_CLASS_NAME}>
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>

            <SectionCard className={panelCardClassName}>
              <SectionCardHeader title=<Skeleton className="h-5 w-32" /> />
              <div className="flex flex-col gap-4 p-3">
                {summaryRows.map((_, index) => (
                  <div key={index} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="min-w-0">
              <SectionCard className={panelCardClassName}>
                <SectionCardHeader
                  className="shrink-0"
                  title=<Skeleton className="h-5 w-36" />
                  actions={
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="size-8 rounded-md" />
                      <Skeleton className="size-8 rounded-md" />
                    </div>
                  }
                />
                <div className="shrink-0 border-b border-border/70 px-3 py-2">
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
                <div className="grid h-8 shrink-0 grid-cols-[128fr_94fr_94fr] items-center border-b border-border/70 bg-muted">
                  <Skeleton className="ml-4 h-3 w-16" />
                  <Skeleton className="mx-auto h-3 w-16" />
                  <Skeleton className="mx-auto h-3 w-16" />
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  {statsRows.map((_, index) =>
                    index % STATS_CATEGORY_INTERVAL === 0 ? (
                      <div
                        key={index}
                        className="flex h-[30px] items-center border-b border-border/70 bg-muted/50 pl-4"
                      >
                        <Skeleton className="h-3 w-28" />
                      </div>
                    ) : (
                      <div
                        key={index}
                        className="grid h-[30px] grid-cols-[128fr_94fr_94fr] items-center border-b border-border/70"
                      >
                        <Skeleton className="ml-4 h-3 w-24" />
                        <Skeleton className="mx-auto h-3 w-12" />
                        <Skeleton className="mx-auto h-3 w-12" />
                      </div>
                    ),
                  )}
                </div>
              </SectionCard>
            </div>
          </div>
        </ScrollArea>
      </div>
    </ScrollArea>
  );
};
