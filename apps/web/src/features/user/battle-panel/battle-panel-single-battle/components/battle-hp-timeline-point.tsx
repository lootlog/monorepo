import type { MouseEvent } from "react";
import { getBattleTimelinePayloadTurn } from "./battle-hp-timeline-point.utils";

type BattleHpTimelinePointProps = {
  cx?: number | null;
  cy?: number | null;
  fill?: string;
  payload?: unknown;
  stroke?: string;
  visible?: boolean;
  onTurnSelect: (turn: number) => void;
};

export function BattleHpTimelinePoint({
  cx,
  cy,
  fill,
  payload,
  stroke,
  visible = false,
  onTurnSelect,
}: BattleHpTimelinePointProps) {
  const turn = getBattleTimelinePayloadTurn(payload);

  if (typeof cx !== "number" || typeof cy !== "number" || turn === null) {
    return null;
  }

  const handleClick = (event: MouseEvent<SVGGElement>) => {
    event.stopPropagation();
    onTurnSelect(turn);
  };

  return (
    <g className="cursor-pointer" onClick={handleClick}>
      <circle cx={cx} cy={cy} r={10} fill="transparent" stroke="transparent" />
      {visible ? (
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill={fill ?? stroke ?? "var(--background)"}
          stroke={stroke ?? fill ?? "var(--primary)"}
          strokeWidth={2}
        />
      ) : null}
    </g>
  );
}
