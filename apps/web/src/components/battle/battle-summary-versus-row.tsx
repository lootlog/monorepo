import { cn } from "cn";
import type { FC } from "react";
import { BATTLE_TEXT_COLORS } from "./utils/battle-color-palette";
import { formatNumber } from "@/components/battle/utils/value-utils";

export type BattleSummaryVersusRowProps = {
  enemyValue: number;
  friendlyValue: number;
  label: string;
  /** Marks the smaller value as the leading one, e.g. for damage taken. */
  lowerIsBetter?: boolean;
};

export const BattleSummaryVersusRow: FC<BattleSummaryVersusRowProps> = ({
  enemyValue,
  friendlyValue,
  label,
  lowerIsBetter = false,
}) => {
  const total = friendlyValue + enemyValue;

  const friendlyLeads = lowerIsBetter
    ? friendlyValue < enemyValue
    : friendlyValue > enemyValue;

  const enemyLeads = lowerIsBetter
    ? enemyValue < friendlyValue
    : enemyValue > friendlyValue;

  const friendlyShare = total === 0 ? 0.5 : friendlyValue / total;

  return (
    <li className="flex flex-col gap-1">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline gap-2">
        <span
          className={cn(
            "tabular-nums",
            friendlyLeads
              ? cn("font-semibold", BATTLE_TEXT_COLORS.team.friendly)
              : "text-muted-foreground",
          )}
        >
          {formatNumber(friendlyValue)}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className={cn(
            "text-right tabular-nums",
            enemyLeads
              ? cn("font-semibold", BATTLE_TEXT_COLORS.team.enemy)
              : "text-muted-foreground",
          )}
        >
          {formatNumber(enemyValue)}
        </span>
      </div>
      <div className="flex h-1.5 gap-0.5" aria-hidden>
        <span
          className="rounded-l-full bg-green-500/80"
          style={{ width: `${friendlyShare * 100}%` }}
        />
        <span className="flex-1 rounded-r-full bg-red-400/80" />
      </div>
    </li>
  );
};
