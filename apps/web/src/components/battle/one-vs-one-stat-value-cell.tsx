import { TableCell } from "@lootlog/ui/components/table";
import type { BattleStatValue } from "@/types/stats-customization.types";
import { cn } from "cn";
import type { FC } from "react";
import { BATTLE_SURFACE_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";

export type OneVsOneStatValueCellProps = {
  compact?: boolean;
  label: string;
  opposingValue: BattleStatValue;
  side: "friendly" | "enemy";
  value: BattleStatValue;
};

const BAR_CLASS_NAME_BY_SIDE = {
  friendly: "right-0 rounded-l-sm bg-green-400/25",
  enemy: "left-0 rounded-r-sm bg-red-400/25",
} as const;

const toMagnitude = (value: BattleStatValue) =>
  Number.isFinite(value) ? Math.abs(Number(value)) : null;

export const OneVsOneStatValueCell: FC<OneVsOneStatValueCellProps> = ({
  compact,
  label,
  opposingValue,
  side,
  value,
}) => {
  const magnitude = toMagnitude(value);
  const opposingMagnitude = toMagnitude(opposingValue);
  const isComparable = magnitude !== null && opposingMagnitude !== null;
  const largest = isComparable ? Math.max(magnitude, opposingMagnitude) : 0;
  const share = isComparable && largest > 0 ? magnitude / largest : 0;
  const isLeading = isComparable && magnitude > opposingMagnitude;

  return (
    <TableCell
      className={cn(
        "relative text-center tabular-nums whitespace-nowrap",
        side === "friendly"
          ? BATTLE_SURFACE_COLORS.team.friendlyCell
          : BATTLE_SURFACE_COLORS.team.enemyCell,
        compact ? "h-auto px-1.5 py-1.5" : "px-2 py-2",
        isLeading && "font-semibold",
      )}
    >
      {share === 0 ? null : (
        <span
          aria-hidden
          className={cn("absolute inset-y-1", BAR_CLASS_NAME_BY_SIDE[side])}
          style={{ width: `${share * 100}%` }}
        />
      )}
      <span className="relative">{label}</span>
    </TableCell>
  );
};
