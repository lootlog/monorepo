import { BattleStatsTable } from "@/components/battle";
import { BattleStatsCustomizationActions } from "@/components/battle/battle-stats-customization-actions";
import type { useStatsCustomization } from "@/hooks/use-stats-customization";
import type { Battle } from "@/lib/api/battlelog-types";
import { useTranslation } from "react-i18next";

type BattleDetailStatsPanelProps = {
  battle: Battle;
  hideZeros: boolean;
  setHideZeros: (value: boolean) => void;
  statsCustomization: ReturnType<typeof useStatsCustomization>;
};

/** The battle's full statistics table. */
export function BattleDetailStatsPanel({
  battle,
  hideZeros,
  setHideZeros,
  statsCustomization,
}: BattleDetailStatsPanelProps) {
  const { t } = useTranslation();
  const headerTitle = t("battlePanel.single.statistics.title");

  if (battle.type !== "1v1") {
    return (
      <BattleStatsTable battle={battle} compact headerTitle={headerTitle} />
    );
  }

  return (
    <BattleStatsTable
      battle={battle}
      compact
      pinnedHeader
      headerTitle={headerTitle}
      headerActions={
        <BattleStatsCustomizationActions
          customization={statsCustomization}
          compact
          hideZeros={hideZeros}
          setHideZeros={setHideZeros}
        />
      }
      hideZeros={hideZeros}
      onHideZerosChange={setHideZeros}
      statsCustomizationConfig={statsCustomization.config}
    />
  );
}
