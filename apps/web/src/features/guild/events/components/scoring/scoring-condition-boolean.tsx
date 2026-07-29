import { Controller, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
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
import { EVENT_SCORING_BOOLEAN_FACTORS } from "@lootlog/scoring";
import {
  getScoringFactorDescription,
  getScoringFactorLabel,
} from "../../utils/scoring-rule-labels";

type ScoringRulesFormValues = {
  scoringRules: { rules: { conditions: unknown[] }[] };
};

interface ScoringConditionBooleanProps {
  control: Control<ScoringRulesFormValues>;
  ruleIndex: number;
  conditionIndex: number;
}

export const ScoringConditionBoolean = ({
  control,
  ruleIndex,
  conditionIndex,
}: ScoringConditionBooleanProps) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-[1fr_100px] gap-1.5">
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
                  {EVENT_SCORING_BOOLEAN_FACTORS.map((factor) => (
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
                      field.value as (typeof EVENT_SCORING_BOOLEAN_FACTORS)[number],
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
          {t("events.scoring.conditionLabel.value")}
        </Label>
        <Controller
          control={control}
          name={
            `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.value` as `scoringRules.rules.${number}.conditions.${number}`
          }
          render={({ field }) => (
            <Select
              value={String(field.value)}
              onValueChange={(v) => field.onChange(v === "true")}
            >
              <SelectTrigger size="sm" className="h-8 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">
                  {t("events.scoring.booleanValue.true")}
                </SelectItem>
                <SelectItem value="false">
                  {t("events.scoring.booleanValue.false")}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </div>
  );
};
