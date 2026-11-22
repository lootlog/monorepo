import { BattlePlayerRankingSection } from "@/components/battle/battle-player-ranking-section";
import { BattleSummarySection } from "@/components/battle/battle-summary-section";
import type { Battle } from "@/lib/api/battlelog-types";

type BattleDetailSummaryProps = {
  battle: Battle;
};

export function BattleDetailSummary({ battle }: BattleDetailSummaryProps) {
  return battle.type === "1v1" ? (
    <BattleSummarySection battle={battle} />
  ) : (
    <BattlePlayerRankingSection battle={battle} />
  );
}
