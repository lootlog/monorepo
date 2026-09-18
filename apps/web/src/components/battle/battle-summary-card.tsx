import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import type { Battle } from "@/lib/api/battlelog-types";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Scale } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { BattleSummaryComposition } from "./battle-summary-composition";
import { BattleSummaryVersusRow } from "./battle-summary-versus-row";
import {
  BATTLE_SEGMENT_COLORS,
  BATTLE_TEXT_COLORS,
} from "./utils/battle-color-palette";
import {
  BATTLE_SUMMARY_METRICS,
  getBattleTeamSummaries,
} from "./utils/battle-team-summary";
import { getBattleTeamPresentation } from "./utils/battle-team-presentation";

export type BattleSummaryCardProps = {
  battle: Battle;
};

export const BattleSummaryCard: FC<BattleSummaryCardProps> = ({ battle }) => {
  const { t } = useTranslation();
  const { friendly, enemy } = getBattleTeamSummaries(battle);
  const { leftTeam, rightTeam } = getBattleTeamPresentation(battle);

  // A duel names its two fighters; a group battle falls back to the team labels.
  const friendlyLabel =
    leftTeam.length === 1 && leftTeam[0]
      ? leftTeam[0].name
      : t("battleUi.team.userTeam");

  const enemyLabel =
    rightTeam.length === 1 && rightTeam[0]
      ? rightTeam[0].name
      : t("battleUi.team.enemyTeam");

  const metrics = BATTLE_SUMMARY_METRICS.filter(
    (metric) => friendly.metrics[metric] > 0 || enemy.metrics[metric] > 0,
  );

  const getSegmentLabel = (key: string) => t(`battleUi.oneVsOne.stats.${key}`);

  const hasDamageComposition =
    friendly.damageSegments.length > 0 || enemy.damageSegments.length > 0;

  return (
    <SectionCard className="isolate w-full overflow-hidden border-border bg-card">
      <SectionCardHeader icon={Scale} title={t("battleUi.summary.title")} />
      <SectionCardContent className="flex flex-col gap-4 text-sm">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold">
          <span className={BATTLE_TEXT_COLORS.team.friendly}>
            {friendlyLabel}
          </span>
          <span className={BATTLE_TEXT_COLORS.team.enemy}>{enemyLabel}</span>
        </div>

        <ul className="flex flex-col gap-2.5">
          {metrics.map((metric) => (
            <BattleSummaryVersusRow
              key={metric}
              label={t(`battleUi.summary.metrics.${metric}`)}
              friendlyValue={friendly.metrics[metric]}
              enemyValue={enemy.metrics[metric]}
              lowerIsBetter={metric === "damageTaken"}
            />
          ))}
        </ul>

        {hasDamageComposition ? (
          <section className="flex flex-col gap-2 border-t border-border/60 pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("battleUi.summary.damageComposition")}
            </h3>
            <BattleSummaryComposition
              colors={BATTLE_SEGMENT_COLORS.damage}
              getLabel={getSegmentLabel}
              segments={friendly.damageSegments}
              teamClassName={BATTLE_TEXT_COLORS.team.friendly}
              teamLabel={friendlyLabel}
            />
            <BattleSummaryComposition
              colors={BATTLE_SEGMENT_COLORS.damage}
              getLabel={getSegmentLabel}
              segments={enemy.damageSegments}
              teamClassName={BATTLE_TEXT_COLORS.team.enemy}
              teamLabel={enemyLabel}
            />
          </section>
        ) : null}
      </SectionCardContent>
    </SectionCard>
  );
};
