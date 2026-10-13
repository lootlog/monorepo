import { EmptyState } from "@/components/common/empty-state";
import type { EventScoringRules } from "@lootlog/domain/scoring";
import type { TFunction } from "i18next";
import { Calculator } from "lucide-react";
import { formatPoints } from "../../utils/format-points";
import { ScoringRulesList } from "./scoring-rules-list";

interface ScoringRulesOverviewProps {
  scoringRules: EventScoringRules | null;
  highlightedRuleIds?: string[];
  t: TFunction;
}

const EMPTY_RULE_IDS: string[] = [];

/**
 * Advanced scoring rules split by how they combine: the last matching base
 * rule sets the base points, and matching bonuses add up to the cap.
 */
export const ScoringRulesOverview = ({
  scoringRules,
  highlightedRuleIds = EMPTY_RULE_IDS,
  t,
}: ScoringRulesOverviewProps) => {
  const rules = scoringRules?.rules ?? [];
  const hardCapPoints = scoringRules?.hardCapPoints ?? 2;

  const minTrackingPercentForBonuses =
    scoringRules?.minTrackingPercentForBonuses ?? 50;

  const timezone = scoringRules?.timezone ?? "Europe/Warsaw";

  if (rules.length === 0) {
    return (
      <EmptyState
        compact
        icon={Calculator}
        title={t("events.killDetail.multipliers.noRules")}
      />
    );
  }

  const baseRules = rules.filter((rule) => rule.action.type !== "ADD_BONUS");
  const bonusRules = rules.filter((rule) => rule.action.type === "ADD_BONUS");

  return (
    <>
      <div className="divide-y divide-border/70">
        {baseRules.length > 0 ? (
          <ScoringRulesList
            label={t("events.killDetail.multipliers.baseGroup")}
            hint={t("events.killDetail.multipliers.baseGroupHint")}
            highlightedRuleIds={highlightedRuleIds}
            rules={baseRules}
            t={t}
          />
        ) : null}
        {bonusRules.length > 0 ? (
          <ScoringRulesList
            label={t("events.killDetail.multipliers.bonusGroup")}
            hint={t("events.scoring.summary.minTrackingForBonuses", {
              percentage: minTrackingPercentForBonuses,
            })}
            highlightedRuleIds={highlightedRuleIds}
            rules={bonusRules}
            t={t}
          />
        ) : null}
      </div>
      <p className="border-t border-border/70 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
        {t("events.scoring.summary.cap", {
          points: formatPoints(hardCapPoints),
        })}
        {" · "}
        {t("events.scoring.summary.timezone", { timezone })}
      </p>
    </>
  );
};
