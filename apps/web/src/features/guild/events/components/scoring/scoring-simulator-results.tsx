import { formatPoints } from "../../utils/format-points";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Badge } from "@lootlog/ui/components/badge";
import { Trophy } from "lucide-react";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { evaluateEventScoring } from "../../utils/scoring-applied-rules";
import {
  SCORING_ACTION_TONE,
  SCORING_TONE_BADGE_VARIANT,
  SCORING_TONE_TEXT_CLASS,
} from "../../utils/scoring-tone";

export function ScoringSimulatorResults({
  result,
  hardCapPoints,
}: {
  result: ReturnType<typeof evaluateEventScoring>;
  hardCapPoints: number;
}) {
  const { t } = useTranslation();
  const isCapped = result.basePoints + result.bonusPoints > hardCapPoints;

  return (
    <div className="bg-muted/20 p-3">
      <SectionCardHeader
        icon={Trophy}
        title={t("events.scoring.simulator.results")}
        className="mb-3"
      />
      <div className="flex items-baseline gap-4">
        <div className="text-center">
          <p className="text-2xs text-muted-foreground/60">
            {t("events.scoring.simulator.base")}
          </p>
          <p className="text-lg font-mono font-bold">
            {formatPoints(result.basePoints)}
          </p>
        </div>
        <span className="text-muted-foreground/40 text-lg">+</span>
        <div className="text-center">
          <p className="text-2xs text-muted-foreground/60">
            {t("events.scoring.simulator.bonus")}
          </p>
          <p
            className={cn(
              "text-lg font-mono font-bold",
              SCORING_TONE_TEXT_CLASS.bonus,
            )}
          >
            {formatPoints(result.bonusPoints)}
          </p>
        </div>
        <span className="text-muted-foreground/40 text-lg">=</span>
        <div className="text-center">
          <p className="text-2xs text-muted-foreground/60">
            {t("events.scoring.simulator.total")}
          </p>
          <p
            className={cn(
              "text-xl font-mono font-bold",
              isCapped && SCORING_TONE_TEXT_CLASS.adjusted,
            )}
          >
            {formatPoints(result.totalPoints)}
            {isCapped && (
              <span
                className={cn(
                  "text-2xs font-normal ml-1",
                  SCORING_TONE_TEXT_CLASS.adjusted,
                )}
              >
                {t("events.scoring.simulator.capped")}
              </span>
            )}
          </p>
        </div>
      </div>

      {result.appliedRules.length > 0 ? (
        <div className="mt-2 pt-2 border-t border-border/40">
          <p className="text-2xs text-muted-foreground/60 mb-1">
            {t("events.scoring.simulator.firedRules")}:
          </p>
          <div className="flex flex-wrap gap-1">
            {result.appliedRules.map((rule) => (
              <Badge
                key={rule.ruleId}
                variant={
                  SCORING_TONE_BADGE_VARIANT[
                    SCORING_ACTION_TONE[rule.actionType]
                  ]
                }
                size="sm"
                className="font-normal"
              >
                {rule.ruleName ?? rule.ruleId}
                {rule.actionType !== "ZERO_BASE" && (
                  <span className="ml-1 font-mono">
                    {rule.actionType === "SET_BASE" ? "=" : "+"}
                    {rule.points}
                  </span>
                )}
                {rule.actionType === "ZERO_BASE" && (
                  <span className="ml-1">= 0</span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-2 pt-2 border-t border-border/40 text-2xs text-muted-foreground/50">
          {t("events.scoring.simulator.noRulesFired")}
        </p>
      )}
    </div>
  );
}
