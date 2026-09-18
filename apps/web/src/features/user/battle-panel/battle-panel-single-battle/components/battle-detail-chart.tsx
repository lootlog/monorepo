import { BattleHpTimelineChart } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-chart";
import { BattleHpTimelineChartSkeleton } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-chart-skeleton";
import type { BattleTimelineResponseDtoOutput } from "@lootlog/client/battlelog";

type BattleDetailChartProps = {
  characterId: string | null;
  selectedTurn: number | null;
  /** Undefined while the timeline is still loading. */
  timeline: BattleTimelineResponseDtoOutput | undefined;
  onTurnSelect: (turn: number) => void;
};

export function BattleDetailChart({
  characterId,
  selectedTurn,
  timeline,
  onTurnSelect,
}: BattleDetailChartProps) {
  if (!timeline) {
    return <BattleHpTimelineChartSkeleton />;
  }

  return (
    <BattleHpTimelineChart
      timeline={timeline.timeline}
      warriors={timeline.warriors}
      characterId={characterId}
      selectedTurn={selectedTurn}
      onTurnSelect={onTurnSelect}
    />
  );
}
