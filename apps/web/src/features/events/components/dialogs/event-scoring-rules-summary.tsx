import type { TFunction } from "i18next";
import type {
  EventScoringMode,
  EventScoringRules,
} from "../../types/scoring-rules";
import {
  formatScoringAction,
  formatScoringCondition,
} from "../../utils/scoring-rule-labels";

interface EventScoringRulesSummaryProps {
  scoringMode: EventScoringMode;
  rules: EventScoringRules | null;
  t: TFunction;
}

export const EventScoringRulesSummary = ({
  scoringMode,
  rules,
  t,
}: EventScoringRulesSummaryProps) => {
  const andLabel = t("events.scoring.andLabel", "i");

  if (scoringMode === "SIMPLE") {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          {t(
            "events.scoring.summary.simple",
            "Tryb prosty: każdy eligible gracz otrzymuje 1 pkt.",
          )}
        </p>
      </div>
    );
  }

  const normalizedRules = rules?.rules ?? [];

  return (
    <div className="space-y-3 text-sm">
      <div className="text-muted-foreground">
        {t("events.scoring.summary.cap", "Maksymalnie {{points}} pkt za kill", {
          points: rules?.hardCapPoints ?? 2,
        })}
        {" · "}
        {t(
          "events.scoring.summary.minTrackingForBonuses",
          "Min. pokrycie dla bonusów: {{percentage}}%",
          {
            percentage: rules?.minTrackingPercentForBonuses ?? 50,
          },
        )}
      </div>
      <div className="space-y-2">
        {normalizedRules.map((rule) => (
          <div key={rule.id} className="rounded-md border p-2">
            <p className="font-medium text-xs">
              {rule.name || rule.id}{" "}
              {rule.enabled === false
                ? t("events.scoring.ruleDisabledSuffix", "(WYŁ.)")
                : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("events.scoring.ifLabel", "JEŻELI")}{" "}
              {rule.conditions.length > 0
                ? rule.conditions
                    .map((condition) => formatScoringCondition(condition, t))
                    .join(` ${andLabel} `)
                : t("events.scoring.always", "zawsze")}{" "}
              {t("events.scoring.thenLabel", "WTEDY")}{" "}
              {formatScoringAction(rule.action, t)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
