import { battleHpTimelineEventIconByKey } from "./battle-hp-timeline-event-icons";
import type { BattleHpTimelineEventMarkerGroup } from "./battle-hp-timeline-event-markers";
import { BattleHpTimelineMarkerGroup } from "./battle-hp-timeline-marker-group";

type Props = {
  cx?: number;
  cy?: number;
  group: BattleHpTimelineEventMarkerGroup;
  label: string;
  onTurnSelect: (turn: number) => void;
};
export function BattleHpTimelineEventMarker({ group, ...props }: Props) {
  return (
    <BattleHpTimelineMarkerGroup
      {...props}
      variant="event"
      turn={group.turn}
      markers={group.markers.map((marker) => ({
        key: marker.key,
        color: marker.color,
        Icon: battleHpTimelineEventIconByKey[marker.key],
        count: marker.count,
      }))}
    />
  );
}
