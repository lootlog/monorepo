import { BandSection } from "@/components/common/band-section";
import { DetailBar } from "@/components/common/detail-bar";
import { ListGroupHeading } from "@/components/common/list-group-heading";
import {
  LIST_BAND_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { SkeletonLine } from "@/components/common/skeleton-line";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import {
  BATTLE_DETAIL_COLUMN_CLASS_NAME,
  BATTLE_DETAIL_COLUMNS_CLASS_NAME,
  BATTLE_DETAIL_CONTENT_CLASS_NAME,
  BATTLE_DETAIL_RAIL_CLASS_NAME,
} from "./components/battle-detail-layout";
import { BattleHpTimelineChartSkeleton } from "./components/battle-hp-timeline-chart-skeleton";
import { BattleTeamSkeleton } from "./components/battle-team-skeleton";

const metadataItems = ["w-28", "w-14", "w-10", "w-14", "w-16"];

const summaryRows = Array.from({ length: 6 });

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

// A full-height rail shows more entries than one pattern pass.
const logEntries = [...logEntryPattern, ...logEntryPattern];

/** Stands in for the battle: teams, chart and balance beside the log rail. */
export const BattlePanelSingleBattleSkeleton = () => {
  const { t } = useTranslation();

  return (
    <ScrollArea data-under-top-bar className="h-full min-h-0" aria-hidden>
      <div aria-busy="true" className={BATTLE_DETAIL_CONTENT_CLASS_NAME}>
        <DetailBar
          meta={metadataItems.map((widthClassName, index) => (
            <SkeletonLine key={index} className={cn("h-3", widthClassName)} />
          ))}
        />

        <div className={BATTLE_DETAIL_COLUMNS_CLASS_NAME}>
          <ScrollArea
            className={cn("@container", BATTLE_DETAIL_COLUMN_CLASS_NAME)}
          >
            <div className="grid grid-cols-1 border-b border-sidebar-border @md:grid-cols-2">
              <BattleTeamSkeleton align="start" />
              <BattleTeamSkeleton
                align="end"
                className="border-t border-sidebar-border @md:border-t-0 @md:border-l"
              />
            </div>

            <BattleHpTimelineChartSkeleton />

            <BandSection
              id="battle-summary-skeleton"
              title={t("battleUi.summary.title")}
              wide
            >
              {summaryRows.map((_, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <SkeletonLine className="h-3 w-16" />
                    <SkeletonLine className="h-3 w-28" />
                    <SkeletonLine className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </BandSection>
          </ScrollArea>

          <ScrollArea className={BATTLE_DETAIL_RAIL_CLASS_NAME}>
            <ListGroupHeading
              id="battle-log-skeleton"
              className={LIST_BAND_HEADING_CLASS}
            >
              {t("battlePanel.single.log.title")}
            </ListGroupHeading>
            <div
              className={cn(
                "flex min-h-12 items-center gap-4 py-2",
                LIST_TILE_RULE_CLASS,
                LIST_TILE_INSET_CLASS,
              )}
            >
              <SkeletonLine className="h-3 w-32" />
              <div className="ml-auto flex items-center gap-1">
                <SkeletonLine className="h-3 w-10" />
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="size-8 rounded-md" />
              </div>
            </div>
            {logEntries.map((lines, index) => (
              <div key={index} className="flex border-b border-background">
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
          </ScrollArea>
        </div>
      </div>
    </ScrollArea>
  );
};
