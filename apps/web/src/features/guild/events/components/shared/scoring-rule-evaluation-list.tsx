import { useTranslation } from "react-i18next";
import type {
  EventScoringExplanation,
  EventScoringRule,
} from "@lootlog/domain/scoring";
import type {
  EventKillPresence,
  PresenceParticipantId,
} from "@lootlog/domain/scoring-presence";
import { CircleCheck, CircleHelp, CircleX } from "lucide-react";
import { cn } from "cn";
import { formatScoringCondition } from "../../utils/scoring-rule-labels";
import { getConditionMeasurement } from "../../utils/scoring-presence-presentation";
import { ScoringActionBadge } from "../scoring/scoring-action-badge";

interface ScoringRuleEvaluationListProps {
  explanation: EventScoringExplanation;
  rules: readonly EventScoringRule[];
  analysis: EventKillPresence | null;
  participantId: PresenceParticipantId;
  nameOf: (participantId: PresenceParticipantId) => string;
}

const OUTCOME_ICONS = {
  MET: { icon: CircleCheck, className: "text-emerald-400" },
  NOT_MET: { icon: CircleX, className: "text-muted-foreground" },
  UNKNOWN: { icon: CircleHelp, className: "text-amber-400" },
} as const;

/** Every enabled rule with its conditions met, not met or undeterminable. */
export const ScoringRuleEvaluationList = ({
  explanation,
  rules,
  analysis,
  participantId,
  nameOf,
}: ScoringRuleEvaluationListProps) => {
  const { t } = useTranslation();
  const actionByRuleId = new Map(rules.map((rule) => [rule.id, rule.action]));

  return (
    <ol className="grid gap-2">
      {explanation.rules
        .filter((rule) => rule.enabled)
        .map((rule) => {
          const status = rule.applied
            ? rule.overridden
              ? "overridden"
              : "applied"
            : rule.matched
              ? "blocked"
              : "notMatched";

          const action = actionByRuleId.get(rule.ruleId);

          return (
            <li
              key={rule.ruleId}
              className={cn(
                "grid gap-1.5 rounded-lg border border-border p-2.5",
                status === "applied" && "border-primary/40 bg-primary/5",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium">
                  {rule.ruleName ?? t("events.scoring.unnamedRule")}
                </span>
                {action ? (
                  <ScoringActionBadge
                    action={action}
                    muted={status !== "applied"}
                  />
                ) : null}
                <span
                  className={cn(
                    "text-xs",
                    status === "applied"
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {t(`events.scoring.evaluation.${status}`)}
                </span>
              </div>
              <ul className="grid gap-1">
                {rule.conditions.map(({ condition, outcome }, index) => {
                  const { icon: Icon, className } =
                    OUTCOME_ICONS[outcome.status];

                  const measurement = getConditionMeasurement({
                    condition,
                    outcome,
                    analysis,
                    participantId,
                    nameOf,
                    t,
                  });

                  return (
                    // oxlint-disable-next-line react/no-array-index-key -- conditions have no id and keep their order.
                    <li key={index} className="flex gap-2 text-xs leading-snug">
                      <Icon
                        className={cn("mt-px size-3.5 shrink-0", className)}
                        aria-label={t(
                          `events.scoring.evaluation.outcome.${outcome.status}`,
                        )}
                      />
                      <span className="grid gap-0.5">
                        <span>{formatScoringCondition(condition, t)}</span>
                        {measurement.map((line) => (
                          <span key={line} className="text-muted-foreground">
                            {line}
                          </span>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
    </ol>
  );
};
