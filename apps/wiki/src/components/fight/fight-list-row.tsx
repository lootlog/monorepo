import { cn } from "cn";
import { BATTLE_TEXT_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";
import { formatNumber } from "@lootlog/domain/locale";
import { t } from "@/i18n/messages";
import { formatPercent } from "@/lib/calculator-format";
import { fightOutcome, type FightOutcome } from "@/lib/fight/fight-list";
import type { FightRecord } from "@/lib/fight/fight-summary";

export const FIGHT_LIST_COLUMNS =
  "grid grid-cols-[3.25rem_minmax(0,1fr)_3.5rem_5rem_5rem] items-center gap-x-2 px-3";

const OUTCOME_CLASS: Record<FightOutcome, string> = {
  won: BATTLE_TEXT_COLORS.result.won,
  lost: BATTLE_TEXT_COLORS.result.lost,
  drawn: "text-muted-foreground",
};

const hpShare = (share: number | undefined) =>
  formatPercent(Math.round((share ?? 0) * 1000) / 10);

type FightListRowProps = {
  index: number;
  fight: FightRecord;
  isSelected: boolean;
  onSelect: (index: number) => void;
};

export function FightListRow({
  index,
  fight,
  isSelected,
  onSelect,
}: FightListRowProps) {
  const outcome = fightOutcome(fight.winner);

  return (
    <li className="h-7" data-fight={index}>
      <button
        type="button"
        aria-current={isSelected}
        onClick={() => onSelect(index)}
        className={cn(
          FIGHT_LIST_COLUMNS,
          "size-full text-left text-[0.8125rem] tabular-nums outline-none hover:bg-accent/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          isSelected && "bg-primary/12 hover:bg-primary/12",
        )}
      >
        <span className="text-muted-foreground">{formatNumber(index + 1)}</span>
        <span className={OUTCOME_CLASS[outcome]}>
          {t(`fightPage.outcomes.${outcome}`)}
        </span>
        <span className="text-right">{formatNumber(fight.moves)}</span>
        <span className="text-right">{hpShare(fight.hpLeft[0])}</span>
        <span className="text-right">{hpShare(fight.hpLeft[1])}</span>
      </button>
    </li>
  );
}
