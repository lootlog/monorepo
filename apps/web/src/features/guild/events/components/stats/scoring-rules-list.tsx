import type { TFunction } from "i18next";
import type { EventScoringRule } from "@lootlog/domain/scoring";
import { cn } from "cn";
import {
  getScoringRuleAction,
  getScoringRuleCondition,
  getScoringRuleName,
} from "./scoring-rule-display";

interface ScoringRulesListProps {
  highlightedRuleIds: string[];
  rules: EventScoringRule[];
  t: TFunction;
}

export const ScoringRulesList = ({
  highlightedRuleIds,
  rules,
  t,
}: ScoringRulesListProps) => (
  <ul
    className="divide-y divide-border/60"
    aria-label={t("events.killDetail.multipliers.configuredRules")}
  >
    {rules.map((rule) => {
      const isDisabled = rule.enabled === false;
      const isApplied = !isDisabled && highlightedRuleIds.includes(rule.id);

      return (
        <li
          key={rule.id}
          className={cn(
            "relative grid gap-1.5 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-4",
            isApplied &&
              "pl-5 before:absolute before:bottom-2.5 before:left-3 before:top-2.5 before:w-px before:bg-cyan-400",
            isDisabled && "bg-muted/15",
          )}
        >
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 sm:col-start-1 sm:row-start-1">
            <span className="min-w-0 text-sm font-semibold leading-snug text-foreground">
              {getScoringRuleName(rule, t)}
            </span>
            {isApplied ? (
              <span className="shrink-0 text-xs font-medium text-cyan-400">
                {t("events.killDetail.multipliers.appliedStatus")}
              </span>
            ) : null}
            {isDisabled ? (
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {t("events.killDetail.multipliers.disabledStatus")}
              </span>
            ) : null}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground sm:col-start-1 sm:row-start-2">
            {getScoringRuleCondition(rule, t)}
          </p>
          <span
            className={cn(
              "justify-self-end text-right text-sm font-semibold text-emerald-500 sm:col-start-2 sm:row-start-1",
              isDisabled && "text-muted-foreground",
            )}
          >
            {getScoringRuleAction(rule.action, t)}
          </span>
        </li>
      );
    })}
  </ul>
);
