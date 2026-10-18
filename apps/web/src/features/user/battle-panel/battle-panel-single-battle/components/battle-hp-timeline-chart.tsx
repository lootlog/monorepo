import { ListGroupHeading } from "@/components/common/list-group-heading";
import {
  LIST_BAND_HEADING_CLASS,
  LIST_TILE_INSET_CLASS,
} from "@/components/common/list-tile";
import type { BattleTimelineResponseDtoOutput } from "@lootlog/client/battlelog";
import { BattleHpTimelineDialog } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-dialog";
import { getBattleHpTimelineEventLayerCounts } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-event-markers";
import { BattleHpTimelineLegendPopover } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legend-popover";
import {
  buildLegendaryBonusMarkerGroups,
  getLegendaryBonusLegendItems,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legendary-markers";
import { BattleHpTimelinePlot } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-plot";
import {
  BATTLE_HP_TIMELINE_PLOT_HEIGHT_CLASS_NAMES,
  useBattleHpTimelineSettingsStore,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-settings.store";
import { useBattleHpTimelineLayers } from "@/features/user/battle-panel/battle-panel-single-battle/components/use-battle-hp-timeline-layers";
import { Button } from "@lootlog/ui/components/button";
import { cn } from "cn";
import { ChevronsDownUp, ChevronsUpDown, Eye, EyeOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useId } from "react";
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
  const headingId = useId();

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

  const plotHeightClassName =
    BATTLE_HP_TIMELINE_PLOT_HEIGHT_CLASS_NAMES[heightMode];

  return (
    <section aria-labelledby={headingId}>
      <ListGroupHeading
        id={headingId}
        className={LIST_BAND_HEADING_CLASS}
        trailing={
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={visibilityLabel}
                    aria-pressed={isChartHidden}
                    variant="ghost"
                    size="icon-sm"
                    onClick={toggleChartHidden}
                  >
                    <VisibilityIcon className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>{visibilityLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={heightLabel}
                    aria-pressed={isExpanded}
                    variant="ghost"
                    size="icon-sm"
                    onClick={toggleHeightMode}
                  >
                    <HeightIcon className="size-3.5" />
                  </Button>
                }
              />
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
        }
      >
        {t("battlePanel.single.chart.title")}
      </ListGroupHeading>
      {isChartHidden ? null : (
        <div className={cn("py-3", LIST_TILE_INSET_CLASS)}>
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
        </div>
      )}
    </section>
  );
}
