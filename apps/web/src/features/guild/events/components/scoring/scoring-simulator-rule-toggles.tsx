import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@lootlog/ui/components/switch";
import { CheckCircle2, XCircle, Minus } from "lucide-react";
import { cn } from "cn";
import type { EventScoringRules } from "@lootlog/domain/scoring";
import type { evaluateEventScoring } from "../../utils/scoring-applied-rules";

export function ScoringSimulatorRuleToggles({
  rules,
  overrides,
  appliedRules,
  onToggle,
}: {
  rules: EventScoringRules["rules"];
  overrides: Record<string, boolean>;
  appliedRules: ReturnType<typeof evaluateEventScoring>["appliedRules"];
  onToggle: (ruleId: string, currentEnabled: boolean) => void;
}) {
  const { t } = useTranslation();
  const ruleIdPrefix = useId();
  const appliedRuleIds = new Set(appliedRules.map((rule) => rule.ruleId));
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-2">
        {t("events.scoring.simulator.activeRules")}
      </p>
      <div className="space-y-1">
        {rules.map((rule) => {
          const isActive = overrides[rule.id] ?? rule.enabled !== false;
          const fired = appliedRuleIds.has(rule.id);
          return (
            <div
              key={rule.id}
              className={cn(
                "relative w-full rounded-md text-left transition-colors",
                isActive
                  ? "bg-card hover:bg-card"
                  : "opacity-40 hover:opacity-60",
              )}
            >
              <Switch
                id={`${ruleIdPrefix}-${rule.id}`}
                className="absolute left-2.5 top-1/2 z-10 -translate-y-1/2"
                checked={isActive}
                onCheckedChange={() => onToggle(rule.id, isActive)}
              />
              <label
                htmlFor={`${ruleIdPrefix}-${rule.id}`}
                className="flex items-center gap-2 w-full cursor-pointer py-1.5 pl-12 pr-2.5"
              >
                <span className="text-[12px] flex-1 truncate">
                  {rule.name || t("events.scoring.unnamedRule")}
                </span>
                {isActive &&
                  (fired ? (
                    <CheckCircle2 className="size-3.5 text-green-400 shrink-0" />
                  ) : (
                    <Minus className="size-3.5 text-muted-foreground/30 shrink-0" />
                  ))}
                {!isActive && (
                  <XCircle className="size-3.5 text-muted-foreground/30 shrink-0" />
                )}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
