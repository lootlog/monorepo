import { useTranslation } from "react-i18next";
import type { EventScoringRule } from "@lootlog/types";
import {
  formatScoringAction,
  formatScoringCondition,
} from "../../utils/scoring-rule-labels";

interface ScoringRuleSummaryProps {
  rule: EventScoringRule;
}

export const ScoringRuleSummary = ({ rule }: ScoringRuleSummaryProps) => {
  const { t } = useTranslation();

  const conditionsText = rule.conditions
    .map((c) => formatScoringCondition(c, t))
    .join(` ${t("events.scoring.andLabel")} `);

  const actionText = formatScoringAction(rule.action, t);

  return (
    <p className="text-[11px] text-muted-foreground/70 leading-relaxed truncate">
      <span className="text-blue-400/70">{conditionsText}</span>
      <span className="text-muted-foreground/40 mx-1">&rarr;</span>
      <span className="text-green-400/70">{actionText}</span>
    </p>
  );
};
