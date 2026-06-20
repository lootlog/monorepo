import { buildBattleHpTimelineLegendItems } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legend-items";
import { BattleHpTimelineLegendEventRow } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legend-event-row";
import { legendaryBonusIconByType } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legendary-icons";
import type {
  BattleHpTimelineLayerConfig,
  BattleHpTimelineLayerKey,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-layers";
import type { LegendaryBonusMarkerDefinition } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legendary-markers";
import { Button } from "@lootlog/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Separator } from "@lootlog/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { CircleHelp } from "lucide-react";
import { useTranslation } from "react-i18next";

type BattleHpTimelineLegendPopoverProps = {
  config: BattleHpTimelineLayerConfig;
  layerCounts: Partial<Record<BattleHpTimelineLayerKey, number>>;
  legendaryItems: LegendaryBonusMarkerDefinition[];
};

export function BattleHpTimelineLegendPopover({
  config,
  layerCounts,
  legendaryItems,
}: BattleHpTimelineLegendPopoverProps) {
  const { t } = useTranslation();
  const legend = buildBattleHpTimelineLegendItems({
    config,
    layerCounts,
    legendaryItems,
  });
  const hasLegendItems =
    legend.eventItems.length > 0 || legend.legendaryItems.length > 0;
  const openLabel = t("battlePanel.single.chart.legend.open");

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              aria-label={openLabel}
              variant="ghost"
              size="icon"
              className="size-8"
            >
              <CircleHelp className="size-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{openLabel}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 p-0 sm:w-80">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <h3 className="text-sm font-semibold">
            {t("battlePanel.single.chart.legend.title")}
          </h3>
        </div>
        <Separator />
        <ScrollArea className="max-h-80">
          {hasLegendItems ? (
            <div className="flex flex-col gap-3 p-3">
              {legend.eventItems.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t("battlePanel.single.chart.legend.layers")}
                  </div>
                  <div className="flex flex-col gap-1">
                    {legend.eventItems.map((item) => (
                      <BattleHpTimelineLegendEventRow
                        key={item.key}
                        item={item}
                        label={t(item.labelKey)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {legend.legendaryItems.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t("battlePanel.single.chart.legend.legendary")}
                  </div>
                  <div className="flex flex-col gap-1">
                    {legend.legendaryItems.map((item) => {
                      const Icon = legendaryBonusIconByType[item.type];
                      const label = t(item.labelKey);

                      return (
                        <div
                          key={item.type}
                          className="flex min-w-0 items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                        >
                          <span
                            aria-hidden="true"
                            className="grid size-6 shrink-0 place-items-center rounded-full border bg-background"
                            style={{ borderColor: item.color }}
                          >
                            <Icon
                              className="size-3.5"
                              color={item.color}
                              strokeWidth={2.4}
                            />
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("battlePanel.single.chart.legend.empty")}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
