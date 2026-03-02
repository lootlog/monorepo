import { Card } from "@lootlog/ui/components/card";
import { Calculator } from "lucide-react";
import type { EventConfig } from "../../hooks/queries/use-kill-detail";
import type { TFunction } from "i18next";
import {
  formatScoringAction,
  formatScoringCondition,
} from "../../utils/scoring-rule-labels";

interface MultipliersCardProps {
  eventConfig: EventConfig;
  highlightedRuleIds?: string[];
  t: TFunction;
}

export const MultipliersCard = ({
  eventConfig,
  highlightedRuleIds = [],
  t,
}: MultipliersCardProps) => {
  const rules = eventConfig.scoringRules?.rules ?? [];
  const andLabel = t("events.scoring.andLabel", "i");

  return (
    <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2">
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Calculator className="w-4 h-4" />
        {t("events.killDetail.multipliers.title", "Zasady punktacji")}
      </h3>

      <div className="space-y-3 text-sm">
        {eventConfig.scoringMode === "SIMPLE" ? (
          <div className="text-muted-foreground">
            {t(
              "events.killDetail.multipliers.simpleMode",
              "Tryb prosty: 1 punkt za eligible gracza.",
            )}
          </div>
        ) : (
          <div className="space-y-2 text-muted-foreground">
            {rules.map((rule) => {
              const isHighlighted = highlightedRuleIds.includes(rule.id);

              return (
                <div
                  key={rule.id}
                  className={`rounded-md border p-2 ${
                    isHighlighted ? "border-green-500/70 bg-green-500/5" : ""
                  }`}
                >
                  <p
                    className={`text-xs font-medium ${
                      isHighlighted
                        ? "text-green-600 dark:text-green-400"
                        : "text-foreground"
                    }`}
                  >
                    {rule.name ||
                      (rule.action.type === "ADD_BONUS"
                        ? t("events.scoring.unnamedBonus", "Nienazwany bonus")
                        : rule.id)}{" "}
                    {rule.enabled === false
                      ? t("events.scoring.ruleDisabledSuffix", "(WYŁ.)")
                      : ""}
                  </p>
                  <p className="text-xs mt-1">
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
              );
            })}
          </div>
        )}

        <div className="pt-2 border-t border-border/50 text-muted-foreground">
          <p>
            {t(
              "events.killDetail.multipliers.cap",
              "Maksymalnie {{points}} pkt za jednego herosa",
              { points: (eventConfig.scoringRules?.hardCapPoints ?? 2).toFixed(2) },
            )}
          </p>
          <p>
            {t(
              "events.killDetail.multipliers.timezone",
              "Strefa: {{timezone}}",
              {
                timezone: eventConfig.scoringRules?.timezone ?? "Europe/Warsaw",
              },
            )}
          </p>
          <p>
            {t(
              "events.killDetail.multipliers.minTrackingForBonuses",
              "Min. pokrycie dla bonusów: {{percentage}}%",
              {
                percentage:
                  eventConfig.scoringRules?.minTrackingPercentForBonuses ?? 50,
              },
            )}
          </p>
        </div>
      </div>
    </Card>
  );
};
