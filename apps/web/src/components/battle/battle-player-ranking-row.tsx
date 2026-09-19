import { cn } from "cn";
import type { FC } from "react";
import { BATTLE_TEXT_COLORS } from "./utils/battle-color-palette";
import type { BattlePlayerRankingEntry } from "./utils/battle-player-ranking";
import { formatNumber } from "@/components/battle/utils/value-utils";

export type BattlePlayerRankingRowProps = {
  entry: BattlePlayerRankingEntry;
  isCurrentCharacter: boolean;
  position: number;
};

export const BattlePlayerRankingRow: FC<BattlePlayerRankingRowProps> = ({
  entry,
  isCurrentCharacter,
  position,
}) => (
  <li className="grid grid-cols-[1.25rem_minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-2 text-[13px]">
    <span className="text-right text-[11px] tabular-nums text-muted-foreground">
      {position}
    </span>
    <span className="flex min-w-0 items-baseline gap-1.5">
      <span
        className={cn(
          "truncate font-medium",
          isCurrentCharacter &&
            cn("font-semibold", BATTLE_TEXT_COLORS.team.friendly),
        )}
      >
        {entry.warrior.name}
      </span>
      <span className="shrink-0 text-[11px] text-muted-foreground">
        {entry.warrior.lvl}
        {entry.warrior.prof}
      </span>
    </span>
    <span
      className="h-2.5 overflow-hidden rounded-full bg-muted/50"
      aria-hidden
    >
      <span
        className={cn(
          "block h-full rounded-full",
          entry.isFriendly ? "bg-green-500/80" : "bg-red-400/80",
        )}
        style={{ width: `${entry.relative * 100}%` }}
      />
    </span>
    <span className="flex items-baseline justify-end gap-1.5 tabular-nums">
      <span className="font-semibold">{formatNumber(entry.value)}</span>
      <span className="w-9 text-right text-[11px] text-muted-foreground">
        {Math.round(entry.share * 100)}%
      </span>
    </span>
  </li>
);
