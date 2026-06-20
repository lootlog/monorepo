import type { BattleTimelineResponseDtoOutput } from "@/lib/api/generated/battlelog/model";
import { getBattleHpTimelineEventLayerCounts } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-event-markers";
import { BattleHpTimelineLayerControls } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-layer-controls";
import { buildLegendaryBonusMarkerGroups } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legendary-markers";
import type {
  BattleHpTimelineLayerConfig,
  BattleHpTimelineLayerKey,
} from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-layers";
import { BattleHpTimelinePlot } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-plot";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@lootlog/ui/components/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Maximize2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type BattleHpTimelineDialogProps = {
  timeline: BattleTimelineResponseDtoOutput["timeline"];
  warriors: BattleTimelineResponseDtoOutput["warriors"];
  characterId: string | null;
  config: BattleHpTimelineLayerConfig;
  selectedTurn: number | null;
  onLayerVisibilityChange: (
    key: BattleHpTimelineLayerKey,
    visible: boolean,
  ) => void;
  onResetLayers: () => void;
  onTurnSelect: (turn: number) => void;
};

export function BattleHpTimelineDialog({
  timeline,
  warriors,
  characterId,
  config,
  selectedTurn,
  onLayerVisibilityChange,
  onResetLayers,
  onTurnSelect,
}: BattleHpTimelineDialogProps) {
  const { t } = useTranslation();
  const legendaryMarkerCount = buildLegendaryBonusMarkerGroups(
    timeline,
    warriors,
  ).reduce((count, group) => count + group.bonuses.length, 0);
  const layerCounts = {
    ...getBattleHpTimelineEventLayerCounts(timeline, warriors),
    legendary: legendaryMarkerCount,
  };
  const openLabel = t("battlePanel.single.chart.openDialog");

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              aria-label={openLabel}
              variant="ghost"
              size="icon"
              className="size-8"
            >
              <Maximize2 className="size-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{openLabel}</TooltipContent>
      </Tooltip>
      <DialogContent className="flex h-[88dvh] max-h-[900px] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[calc(100vw-2rem)] xl:max-w-[1500px] max-sm:h-dvh max-sm:w-screen max-sm:max-w-none max-sm:rounded-none">
        <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12">
          <DialogTitle className="px-0 pt-0 text-base">
            {t("battlePanel.single.chart.dialogTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <BattleHpTimelinePlot
              timeline={timeline}
              warriors={warriors}
              characterId={characterId}
              layers={config}
              selectedTurn={selectedTurn}
              compact={false}
              className="min-h-[320px] flex-1"
              onTurnSelect={onTurnSelect}
            />
          </div>
          <BattleHpTimelineLayerControls
            config={config}
            layerCounts={layerCounts}
            onLayerVisibilityChange={onLayerVisibilityChange}
            onReset={onResetLayers}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
