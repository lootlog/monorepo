import {
  Controller,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { HelpCircle } from "lucide-react";
import {
  EVENT_SCORING_NUMERIC_FACTORS,
  EVENT_SCORING_NUMERIC_OPERATORS,
} from "../../types/scoring-rules";
import {
  getScoringFactorDescription,
  getScoringFactorLabel,
} from "../../utils/scoring-rule-labels";

type ScoringRulesFormValues = {
  scoringRules: { rules: { conditions: unknown[] }[] };
};

interface ScoringConditionNumericProps {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  ruleIndex: number;
  conditionIndex: number;
}

export const ScoringConditionNumeric = ({
  control,
  register,
  ruleIndex,
  conditionIndex,
}: ScoringConditionNumericProps) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-[1fr_80px_80px] gap-1.5">
      <div className="space-y-0.5">
        <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
          {t("events.scoring.conditionLabel.factor")}
        </Label>
        <Controller
          control={control}
          name={
            `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.factor` as `scoringRules.rules.${number}.conditions.${number}`
          }
          render={({ field }) => (
            <div className="flex items-center gap-1">
              <Select
                value={field.value as string}
                onValueChange={field.onChange}
              >
                <SelectTrigger size="sm" className="h-8 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_SCORING_NUMERIC_FACTORS.map((factor) => (
                    <SelectItem key={factor} value={factor}>
                      {getScoringFactorLabel(factor, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="size-3.5 text-muted-foreground/30 shrink-0 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  <p className="text-xs">
                    {getScoringFactorDescription(
                      field.value as (typeof EVENT_SCORING_NUMERIC_FACTORS)[number],
                      t,
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        />
      </div>
      <div className="space-y-0.5">
        <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
          {t("events.scoring.conditionLabel.operator")}
        </Label>
        <Controller
          control={control}
          name={
            `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.operator` as `scoringRules.rules.${number}.conditions.${number}`
          }
          render={({ field }) => (
            <Select
              value={field.value as string}
              onValueChange={field.onChange}
            >
              <SelectTrigger size="sm" className="h-8 text-[12px] font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_SCORING_NUMERIC_OPERATORS.map((operator) => (
                  <SelectItem
                    key={operator}
                    value={operator}
                    className="font-mono"
                  >
                    {operator}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="space-y-0.5">
        <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
          {t("events.scoring.conditionLabel.value")}
        </Label>
        <Input
          type="number"
          step={0.01}
          className="h-8 text-[12px] font-mono"
          {...register(
            `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.value` as `scoringRules.rules.${number}.conditions.${number}`,
            { valueAsNumber: true },
          )}
        />
      </div>
    </div>
  );
};
