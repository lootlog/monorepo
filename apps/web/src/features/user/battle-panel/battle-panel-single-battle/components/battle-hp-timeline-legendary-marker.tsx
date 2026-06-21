import type { KeyboardEvent, MouseEvent } from "react";
import { BATTLE_HEX_COLORS } from "@/components/battle/utils/battle-color-palette";
import { legendaryBonusIconByType } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-hp-timeline-legendary-icons";
import type { LegendaryBonusMarkerGroup } from "./battle-hp-timeline-legendary-markers";

type BattleHpTimelineLegendaryMarkerProps = {
  cx?: number;
  cy?: number;
  group: LegendaryBonusMarkerGroup;
  label: string;
  onTurnSelect: (turn: number) => void;
};

const markerOffsets = [
  { x: 0, y: 0 },
  { x: -11, y: -7 },
  { x: 11, y: -7 },
] as const;

export function BattleHpTimelineLegendaryMarker({
  cx,
  cy,
  group,
  label,
  onTurnSelect,
}: BattleHpTimelineLegendaryMarkerProps) {
  if (typeof cx !== "number" || typeof cy !== "number") {
    return null;
  }

  const visibleBonuses = group.bonuses.slice(0, 3);
  const hiddenBonusCount = group.bonuses.length - visibleBonuses.length;

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
        r={visibleBonuses.length > 1 ? 25 : 16}
        fill="transparent"
        stroke="transparent"
      />
      {visibleBonuses.map((bonus, index) => {
        const Icon = legendaryBonusIconByType[bonus.type];
        const offset = markerOffsets[index] ?? markerOffsets[0];
        const iconX = cx + offset.x - 6;
        const iconY = cy + offset.y - 6;

        return (
          <g key={`${bonus.actionType}:${index}`}>
            <circle
              cx={cx + offset.x}
              cy={cy + offset.y}
              r={9}
              fill="var(--background)"
              stroke={bonus.color}
              strokeWidth={1.5}
            />
            <Icon
              color={bonus.color}
              height={12}
              pointerEvents="none"
              strokeWidth={2.4}
              width={12}
              x={iconX}
              y={iconY}
            />
          </g>
        );
      })}
      {hiddenBonusCount > 0 ? (
        <g>
          <circle
            cx={cx + 20}
            cy={cy - 18}
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
            x={cx + 20}
            y={cy - 15}
          >
            +{hiddenBonusCount}
          </text>
        </g>
      ) : null}
    </g>
  );
}
