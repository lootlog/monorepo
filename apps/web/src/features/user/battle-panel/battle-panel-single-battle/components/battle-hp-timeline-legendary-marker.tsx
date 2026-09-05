import { legendaryBonusIconByType } from "./battle-hp-timeline-legendary-icons";
import type { LegendaryBonusMarkerGroup } from "./battle-hp-timeline-legendary-markers";
import { BattleHpTimelineMarkerGroup } from "./battle-hp-timeline-marker-group";

type Props = {
  cx?: number;
  cy?: number;
  group: LegendaryBonusMarkerGroup;
  label: string;
  onTurnSelect: (turn: number) => void;
};
export function BattleHpTimelineLegendaryMarker({ group, ...props }: Props) {
  return (
    <BattleHpTimelineMarkerGroup
      {...props}
      variant="legendary"
      turn={group.turn}
      markers={group.bonuses.map((marker, index) => ({
        key: `${marker.actionType}:${index}`,
        color: marker.color,
        Icon: legendaryBonusIconByType[marker.type],
      }))}
    />
  );
}
