import { ScoringFactorSelect } from "./scoring-factor-select";
import { ScoringOperatorSelect } from "./scoring-operator-select";
import {
  Controller,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { EVENT_SCORING_NUMERIC_FACTORS } from "@lootlog/domain/scoring";

import type { ScoringRulesFormValues } from "./scoring-rules-editor";

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
          name={`scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.factor`}
          render={({ field }) => (
            <ScoringFactorSelect
              factors={EVENT_SCORING_NUMERIC_FACTORS}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>
      <div className="space-y-0.5">
        <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
          {t("events.scoring.conditionLabel.operator")}
        </Label>
        <Controller
          control={control}
          name={`scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.operator`}
          render={({ field }) => (
            <ScoringOperatorSelect
              value={field.value}
              onChange={field.onChange}
            />
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
            `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.value`,
            { valueAsNumber: true },
          )}
        />
      </div>
    </div>
  );
};
