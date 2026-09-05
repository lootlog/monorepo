import type { KeyboardEvent, MouseEvent } from "react";
import { BATTLE_HEX_COLORS } from "@/components/battle/utils/battle-color-palette";
import type { LucideIcon } from "lucide-react";

type BattleHpTimelineMarkerGroupProps = {
  cx?: number;
  cy?: number;
  turn: number;
  markers: { key: string; color: string; Icon: LucideIcon; count?: number }[];
  variant: "event" | "legendary";
  label: string;
  onTurnSelect: (turn: number) => void;
};

export function BattleHpTimelineMarkerGroup({
  cx,
  cy,
  turn,
  markers,
  variant,
  label,
  onTurnSelect,
}: BattleHpTimelineMarkerGroupProps) {
  if (typeof cx !== "number" || typeof cy !== "number") {
    return null;
  }

  const legendary = variant === "legendary";
  const markerOffsets = legendary
    ? [
        { x: 0, y: 0 },
        { x: -11, y: -7 },
        { x: 11, y: -7 },
      ]
    : [
        { x: 0, y: 0 },
        { x: -12, y: 9 },
        { x: 12, y: 9 },
      ];
  const singleHitRadius = legendary ? 16 : 17;
  const multipleHitRadius = legendary ? 25 : 27;
  const iconSize = legendary ? 12 : 11;
  const overflowX = cx + (legendary ? 20 : 21);
  const overflowY = cy + (legendary ? -18 : 18);
  const visibleMarkers = markers.slice(0, 3);
  const hiddenMarkerCount = markers.length - visibleMarkers.length;

  const handleSelect = () => {
    onTurnSelect(turn);
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
        r={visibleMarkers.length > 1 ? multipleHitRadius : singleHitRadius}
        fill="transparent"
        stroke="transparent"
      />
      {visibleMarkers.map((marker, index) => {
        const Icon = marker.Icon;
        const offset = markerOffsets[index] ?? { x: 0, y: 0 };
        const iconX = cx + offset.x - iconSize / 2;
        const iconY = cy + offset.y - iconSize / 2;

        return (
          <g key={marker.key}>
            <circle
              cx={cx + offset.x}
              cy={cy + offset.y}
              r={legendary ? 9 : 8.5}
              fill="var(--background)"
              stroke={marker.color}
              strokeWidth={1.5}
            />
            <Icon
              color={marker.color}
              height={iconSize}
              pointerEvents="none"
              strokeWidth={2.4}
              width={iconSize}
              x={iconX}
              y={iconY}
            />
            {(marker.count ?? 0) > 1 ? (
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
            cx={overflowX}
            cy={overflowY}
            r={8}
            fill="var(--background)"
            stroke={BATTLE_HEX_COLORS.legendary.unknown}
            strokeWidth={1.5}
          />
          <text
            fill={BATTLE_HEX_COLORS.legendary.unknown}
            fontSize={8}
            fontWeight={700}
            pointerEvents="none"
            textAnchor="middle"
            x={overflowX}
            y={overflowY + 3}
          >
            +{hiddenMarkerCount}
          </text>
        </g>
      ) : null}
    </g>
  );
}
