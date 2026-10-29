import { useTranslation } from "react-i18next";
import type { EventScoringRule } from "@lootlog/domain/scoring";
import { formatScoringConditions } from "../../utils/scoring-rule-labels";

interface ScoringRuleSummaryProps {
  rule: EventScoringRule;
}

/** The rule's conditions as one readable sentence. */
export const ScoringRuleSummary = ({ rule }: ScoringRuleSummaryProps) => {
  const { t } = useTranslation();

  return (
    <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
      {formatScoringConditions(rule.conditions, t)}
    </p>
  );
};
