import type { TFunction } from "i18next";
import type { EventScoringRule } from "@lootlog/domain/scoring";
import { cn } from "cn";
import { formatScoringAction } from "../../utils/scoring-rule-labels";
import {
  getScoringRuleCondition,
  getScoringRuleName,
} from "./scoring-rule-display";

interface ScoringRulesListProps {
  label: string;
  hint: string;
  highlightedRuleIds: string[];
  rules: EventScoringRule[];
  t: TFunction;
}

/** One group of scoring rules under a small heading that explains it. */
export const ScoringRulesList = ({
  label,
  hint,
  highlightedRuleIds,
  rules,
  t,
}: ScoringRulesListProps) => {
  const highlightedIds = new Set(highlightedRuleIds);

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 pt-3 pb-1">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </h3>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <ul className="divide-y divide-border/60" aria-label={label}>
        {rules.map((rule) => {
          const isDisabled = rule.enabled === false;
          const isApplied = !isDisabled && highlightedIds.has(rule.id);

          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-start justify-between gap-3 px-3 py-2.5",
                isApplied && "bg-cyan-400/[0.06]",
              )}
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span
                    className={cn(
                      "min-w-0 text-sm font-medium leading-snug",
                      isDisabled ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
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
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {getScoringRuleCondition(rule, t)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums",
                  isDisabled
                    ? "bg-muted/40 text-muted-foreground line-through"
                    : "bg-primary/10 text-primary",
                )}
              >
                {formatScoringAction(rule.action, t)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
