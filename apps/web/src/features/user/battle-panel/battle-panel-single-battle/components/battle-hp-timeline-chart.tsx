import type { BattleTimelineResponseDtoOutput } from "@lootlog/api-client/models/battlelog/battle-timeline-response-dto-output";
import { BattleHpTimelineDialog } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-dialog";
import { getBattleHpTimelineEventLayerCounts } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-event-markers";
import { BattleHpTimelineLegendPopover } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legend-popover";
import {
  buildLegendaryBonusMarkerGroups,
  getLegendaryBonusLegendItems,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legendary-markers";
import { BattleHpTimelinePlot } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-plot";
import { useBattleHpTimelineSettingsStore } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-settings.store";
import { useBattleHpTimelineLayers } from "@/features/user/battle-panel/battle-panel-single-battle/components/use-battle-hp-timeline-layers";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import {
  Activity,
  ChevronsDownUp,
  ChevronsUpDown,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import { useTranslation } from "react-i18next";

type BattleHpTimelineChartProps = {
  timeline: BattleTimelineResponseDtoOutput["timeline"];
  warriors: BattleTimelineResponseDtoOutput["warriors"];
  characterId: string | null;
  selectedTurn: number | null;
  onTurnSelect: (turn: number) => void;
};

export function BattleHpTimelineChart({
  timeline,
  warriors,
  characterId,
  selectedTurn,
  onTurnSelect,
}: BattleHpTimelineChartProps) {
  const { t } = useTranslation();
  const isChartHidden = useBattleHpTimelineSettingsStore(
    (state) => state.isChartHidden,
  );
  const heightMode = useBattleHpTimelineSettingsStore(
    (state) => state.heightMode,
  );
  const toggleChartHidden = useBattleHpTimelineSettingsStore(
    (state) => state.toggleChartHidden,
  );
  const toggleHeightMode = useBattleHpTimelineSettingsStore(
    (state) => state.toggleHeightMode,
  );
  const { config, setLayerVisibility, resetLayers } =
    useBattleHpTimelineLayers();
  const isExpanded = heightMode === "expanded";
  const layerCounts = getBattleHpTimelineEventLayerCounts(timeline, warriors);
  const legendaryMarkerGroups = config.legendary
    ? buildLegendaryBonusMarkerGroups(timeline, warriors)
    : [];
  const legendaryLegendItems = getLegendaryBonusLegendItems(
    legendaryMarkerGroups,
  );
  const visibilityLabel = isChartHidden
    ? t("battlePanel.single.chart.showChart")
    : t("battlePanel.single.chart.hideChart");
  const heightLabel = isExpanded
    ? t("battlePanel.single.chart.defaultHeight")
    : t("battlePanel.single.chart.expandHeight");
  const VisibilityIcon = isChartHidden ? Eye : EyeOff;
  const HeightIcon = isExpanded ? ChevronsDownUp : ChevronsUpDown;
  const plotHeightClassName = isExpanded ? "h-72" : "h-36";

  return (
    <Card
      className={cn(
        "border-border bg-card",
        isChartHidden ? "gap-0 p-2.5" : "gap-2 p-3",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap justify-between gap-3 px-1",
          isChartHidden ? "items-center" : "items-start",
        )}
      >
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <div>
            <h2 className="text-base font-semibold leading-tight">
              {t("battlePanel.single.chart.title")}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={visibilityLabel}
                aria-pressed={isChartHidden}
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={toggleChartHidden}
              >
                <VisibilityIcon className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{visibilityLabel}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={heightLabel}
                aria-pressed={isExpanded}
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={toggleHeightMode}
              >
                <HeightIcon className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{heightLabel}</TooltipContent>
          </Tooltip>
          <BattleHpTimelineLegendPopover
            config={config}
            layerCounts={layerCounts}
            legendaryItems={legendaryLegendItems}
          />
          <BattleHpTimelineDialog
            timeline={timeline}
            warriors={warriors}
            characterId={characterId}
            config={config}
            selectedTurn={selectedTurn}
            onLayerVisibilityChange={setLayerVisibility}
            onResetLayers={resetLayers}
            onTurnSelect={onTurnSelect}
          />
        </div>
      </div>
      {isChartHidden ? null : (
        <BattleHpTimelinePlot
          timeline={timeline}
          warriors={warriors}
          characterId={characterId}
          layers={config}
          selectedTurn={selectedTurn}
          compact
          className={plotHeightClassName}
          onTurnSelect={onTurnSelect}
        />
      )}
    </Card>
  );
}
