import type { KeyboardEvent, MouseEvent } from "react";
import { battleHpTimelineEventIconByKey } from "./battle-hp-timeline-event-icons";
import type { BattleHpTimelineEventMarkerGroup } from "./battle-hp-timeline-event-markers";

type BattleHpTimelineEventMarkerProps = {
  cx?: number;
  cy?: number;
  group: BattleHpTimelineEventMarkerGroup;
  label: string;
  onTurnSelect: (turn: number) => void;
};

const markerOffsets = [
  { x: 0, y: 0 },
  { x: -12, y: 9 },
  { x: 12, y: 9 },
] as const;

export function BattleHpTimelineEventMarker({
  cx,
  cy,
  group,
  label,
  onTurnSelect,
}: BattleHpTimelineEventMarkerProps) {
  if (typeof cx !== "number" || typeof cy !== "number") {
    return null;
  }

  const visibleMarkers = group.markers.slice(0, 3);
  const hiddenMarkerCount = group.markers.length - visibleMarkers.length;

  const handleSelect = () => {
    onTurnSelect(group.turn);
  };

  const handleClick = (event: MouseEvent<SVGGElement>) => {
    event.stopPropagation();
    handleSelect();
  };

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect();
    }
  };

  return (
    <g
      aria-label={label}
      className="cursor-pointer outline-none"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <title>{label}</title>
      <circle
        cx={cx}
        cy={cy}
        r={visibleMarkers.length > 1 ? 27 : 17}
        fill="transparent"
        stroke="transparent"
      />
      {visibleMarkers.map((marker, index) => {
        const Icon = battleHpTimelineEventIconByKey[marker.key];
        const offset = markerOffsets[index] ?? markerOffsets[0];
        const iconX = cx + offset.x - 5.5;
        const iconY = cy + offset.y - 5.5;

        return (
          <g key={marker.key}>
            <circle
              cx={cx + offset.x}
              cy={cy + offset.y}
              r={8.5}
              fill="var(--background)"
              stroke={marker.color}
              strokeWidth={1.5}
            />
            <Icon
              color={marker.color}
              height={11}
              pointerEvents="none"
              strokeWidth={2.4}
              width={11}
              x={iconX}
              y={iconY}
            />
            {marker.count > 1 ? (
              <text
                fill={marker.color}
                fontSize={7}
                fontWeight={700}
                pointerEvents="none"
                textAnchor="middle"
                x={cx + offset.x + 7}
                y={cy + offset.y - 6}
              >
                {marker.count}
              </text>
            ) : null}
          </g>
        );
      })}
      {hiddenMarkerCount > 0 ? (
        <g>
          <circle
            cx={cx + 21}
            cy={cy + 18}
            r={8}
            fill="var(--background)"
            stroke="#f59e0b"
            strokeWidth={1.5}
          />
          <text
            fill="#f59e0b"
            fontSize={8}
            fontWeight={700}
            pointerEvents="none"
            textAnchor="middle"
            x={cx + 21}
            y={cy + 21}
          >
            +{hiddenMarkerCount}
          </text>
        </g>
      ) : null}
    </g>
  );
}
