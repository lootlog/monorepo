import type { BattleTimelineResponseDtoOutput } from "@/lib/api/generated/battlelog/model";
import { BattleHpTimelineDialog } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-dialog";
import { getBattleHpTimelineEventLayerCounts } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-event-markers";
import { BattleHpTimelineLegendPopover } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legend-popover";
import {
  buildLegendaryBonusMarkerGroups,
  getLegendaryBonusLegendItems,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legendary-markers";
import { BattleHpTimelinePlot } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-plot";
import { useBattleHpTimelineLayers } from "@/features/user/battle-panel/battle-panel-single-battle/components/use-battle-hp-timeline-layers";
import { Card } from "@lootlog/ui/components/card";
import { Activity } from "lucide-react";
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
  const { config, setLayerVisibility, resetLayers } =
    useBattleHpTimelineLayers();
  const layerCounts = getBattleHpTimelineEventLayerCounts(timeline, warriors);
  const legendaryMarkerGroups = config.legendary
    ? buildLegendaryBonusMarkerGroups(timeline, warriors)
    : [];
  const legendaryLegendItems = getLegendaryBonusLegendItems(
    legendaryMarkerGroups,
  );

  return (
    <Card className="gap-2 border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <div>
            <h2 className="text-base font-semibold leading-tight">
              {t("battlePanel.single.chart.title")}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
      <BattleHpTimelinePlot
        timeline={timeline}
        warriors={warriors}
        characterId={characterId}
        layers={config}
        selectedTurn={selectedTurn}
        compact
        className="h-36"
        onTurnSelect={onTurnSelect}
      />
    </Card>
  );
}
