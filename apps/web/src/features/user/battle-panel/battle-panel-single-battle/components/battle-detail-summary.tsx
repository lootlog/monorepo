import { BattlePlayerRankingSection } from "@/components/battle/battle-player-ranking-section";
import { BattleSummarySection } from "@/components/battle/battle-summary-section";
import type { Battle } from "@/lib/api/battlelog-types";

type BattleDetailSummaryProps = {
  battle: Battle;
};

/** A duel is a head-to-head balance; a group battle is about who contributed what. */
export function BattleDetailSummary({ battle }: BattleDetailSummaryProps) {
  return battle.type === "1v1" ? (
    <BattleSummarySection battle={battle} />
  ) : (
    <BattlePlayerRankingSection battle={battle} />
  );
}
