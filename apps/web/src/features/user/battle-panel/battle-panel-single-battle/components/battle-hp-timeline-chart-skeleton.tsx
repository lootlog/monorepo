import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import {
  BATTLE_HP_TIMELINE_PLOT_HEIGHT_CLASS_NAMES,
  useBattleHpTimelineSettingsStore,
} from "./battle-hp-timeline-settings.store";

const chartActions = Array.from({ length: 4 });

const chartGridLines = Array.from({ length: 5 });

export function BattleHpTimelineChartSkeleton() {
  // The settings are persisted, so the skeleton can already match a hidden or expanded chart.
  const isChartHidden = useBattleHpTimelineSettingsStore(
    (state) => state.isChartHidden,
  );

  const heightMode = useBattleHpTimelineSettingsStore(
    (state) => state.heightMode,
  );

  return (
    <SectionCard aria-hidden="true">
      <SectionCardHeader
        title=<Skeleton className="h-5 w-40" />
        actions={
          <div className="flex items-center gap-2">
            {chartActions.map((_, index) => (
              <Skeleton key={index} className="size-8 rounded-md" />
            ))}
          </div>
        }
      />

      {isChartHidden ? null : (
        <SectionCardContent>
          <div
            className={cn(
              "flex gap-2",
              BATTLE_HP_TIMELINE_PLOT_HEIGHT_CLASS_NAMES[heightMode],
            )}
          >
            <div className="flex flex-col justify-between pb-5">
              {chartGridLines.map((_, index) => (
                <Skeleton key={index} className="h-2 w-5" />
              ))}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="relative min-h-0 flex-1">
                <div className="absolute inset-0 flex flex-col justify-between">
                  {chartGridLines.map((_, index) => (
                    <div key={index} className="h-px bg-border/50" />
                  ))}
                </div>
                <Skeleton className="absolute inset-x-0 top-[12%] h-0.5 rounded-full" />
                <Skeleton className="absolute inset-x-0 top-[38%] h-0.5 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-2 w-full" />
            </div>
          </div>
        </SectionCardContent>
      )}
    </SectionCard>
  );
}
