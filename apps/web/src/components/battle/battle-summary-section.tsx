import { BandSection } from "@/components/common/band-section";
import type { Battle } from "@/lib/api/battlelog-types";
import { useId, type FC } from "react";
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

export type BattleSummarySectionProps = {
  battle: Battle;
};

export const BattleSummarySection: FC<BattleSummarySectionProps> = ({
  battle,
}) => {
  const { t } = useTranslation();
  const id = useId();
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
    <BandSection id={id} title={t("battleUi.summary.title")} wide>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold">
        <span className={BATTLE_TEXT_COLORS.team.friendly}>
          {friendlyLabel}
        </span>
        <span className={BATTLE_TEXT_COLORS.team.enemy}>{enemyLabel}</span>
      </div>

      <ul className="flex flex-col gap-2.5 text-sm">
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
        <section className="flex flex-col gap-2 border-t border-sidebar-border pt-4">
          <h3 className="text-xs font-medium text-muted-foreground">
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
    </BandSection>
  );
};
