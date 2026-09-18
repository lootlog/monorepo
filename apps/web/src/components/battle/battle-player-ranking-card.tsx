import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
import type { Battle } from "@/lib/api/battlelog-types";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Trophy } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { BattlePlayerRankingRow } from "./battle-player-ranking-row";
import {
  BATTLE_RANKING_METRICS,
  getBattlePlayerRanking,
  type BattleRankingMetric,
} from "./utils/battle-player-ranking";

export type BattlePlayerRankingCardProps = {
  battle: Battle;
};

export const BattlePlayerRankingCard: FC<BattlePlayerRankingCardProps> = ({
  battle,
}) => {
  const { t } = useTranslation();
  const [metric, setMetric] = useState<BattleRankingMetric>("damageDealt");
  const ranking = getBattlePlayerRanking(battle, metric);

  return (
    <SectionCard className="isolate w-full overflow-hidden border-border bg-card">
      <SectionCardHeader
        icon={Trophy}
        title={t("battleUi.ranking.title")}
        actions={
          <AnimatedToggleGroup
            size="small"
            label={t("battleUi.ranking.metricLabel")}
            value={metric}
            onValueChange={setMetric}
            options={BATTLE_RANKING_METRICS.map((value) => ({
              value,
              label: t(`battleUi.summary.metrics.${value}`),
            }))}
            className="text-xs"
          />
        }
      />
      <SectionCardContent>
        <ol className="flex flex-col gap-1.5">
          {ranking.map((entry, index) => (
            <BattlePlayerRankingRow
              key={entry.warrior.id}
              entry={entry}
              isCurrentCharacter={
                entry.warrior.originalId === battle.characterId
              }
              position={index + 1}
            />
          ))}
        </ol>
      </SectionCardContent>
    </SectionCard>
  );
};
