import { BattleStatsTable } from "@/components/battle";
import { BattlePlayerRankingCard } from "@/components/battle/battle-player-ranking-card";
import { BattleStatsCustomizationActions } from "@/components/battle/battle-stats-customization-actions";
import { BattleSummaryCard } from "@/components/battle/battle-summary-card";
import type { useStatsCustomization } from "@/hooks/use-stats-customization";
import type { Battle } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";

type BattleDetailStatsPanelProps = {
  battle: Battle;
  hideZeros: boolean;
  setHideZeros: (value: boolean) => void;
  statsCustomization: ReturnType<typeof useStatsCustomization>;
};

export function BattleDetailStatsPanel({
  battle,
  hideZeros,
  setHideZeros,
  statsCustomization,
}: BattleDetailStatsPanelProps) {
  const { t } = useTranslation();
  const headerTitle = t("battlePanel.single.statistics.title");

  // A group battle is about who contributed what; a duel is a head-to-head balance.
  if (battle.type !== "1v1") {
    return (
      <>
        <BattlePlayerRankingCard battle={battle} />
        <BattleStatsTable battle={battle} compact headerTitle={headerTitle} />
      </>
    );
  }

  return (
    <>
      <BattleSummaryCard battle={battle} />
      <BattleStatsTable
        battle={battle}
        compact
        headerTitle={headerTitle}
        headerActions={
          <div className="flex shrink-0 items-center gap-1.5">
            <BattleStatsCustomizationActions
              customization={statsCustomization}
              compact
              hideZeros={hideZeros}
              setHideZeros={setHideZeros}
            />
          </div>
        }
        hideZeros={hideZeros}
        onHideZerosChange={setHideZeros}
        statsCustomizationConfig={statsCustomization.config}
      />
    </>
  );
}
