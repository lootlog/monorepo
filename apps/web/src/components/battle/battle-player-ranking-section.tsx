import { BandSection } from "@/components/common/band-section";
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
import type { Battle } from "@/lib/api/battlelog-types";
import { useId, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { BattlePlayerRankingRow } from "./battle-player-ranking-row";
import {
  BATTLE_RANKING_METRICS,
  getBattlePlayerRanking,
  type BattleRankingMetric,
} from "./utils/battle-player-ranking";

export type BattlePlayerRankingSectionProps = {
  battle: Battle;
};

export const BattlePlayerRankingSection: FC<
  BattlePlayerRankingSectionProps
> = ({ battle }) => {
  const { t } = useTranslation();
  const id = useId();
  const [metric, setMetric] = useState<BattleRankingMetric>("damageDealt");
  const ranking = getBattlePlayerRanking(battle, metric);

  return (
    <BandSection id={id} title={t("battleUi.ranking.title")} wide>
      <AnimatedToggleGroup
        size="sm"
        label={t("battleUi.ranking.metricLabel")}
        value={metric}
        onValueChange={setMetric}
        options={BATTLE_RANKING_METRICS.map((value) => ({
          value,
          label: t(`battleUi.ranking.metrics.${value}`),
        }))}
        className="self-start text-xs max-sm:w-full"
      />
      <ol className="flex flex-col gap-1.5">
        {ranking.map((entry, index) => (
          <BattlePlayerRankingRow
            key={entry.warrior.originalId}
            entry={entry}
            isCurrentCharacter={entry.warrior.originalId === battle.characterId}
            position={index + 1}
          />
        ))}
      </ol>
    </BandSection>
  );
};
