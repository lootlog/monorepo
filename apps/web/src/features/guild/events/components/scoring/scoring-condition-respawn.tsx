import { ScoringOperatorSelect } from "./scoring-operator-select";
import { ScoringConditionTimeWindow } from "./scoring-condition-time-window";
import {
  Controller,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Label } from "@lootlog/ui/components/label";

import type { ScoringRulesFormValues } from "./scoring-rules-editor";
import { ScoringNumberInput } from "./scoring-number-input";

interface ScoringConditionRespawnProps {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  ruleIndex: number;
  conditionIndex: number;
}

export const ScoringConditionRespawn = ({
  control,
  register,
  ruleIndex,
  conditionIndex,
}: ScoringConditionRespawnProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      {/* Time range row */}
      <ScoringConditionTimeWindow
        register={register}
        ruleIndex={ruleIndex}
        conditionIndex={conditionIndex}
      />
      {/* Coverage threshold row */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="space-y-0.5">
          <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
            {t("events.scoring.conditionLabel.coverage")}
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
          <div className="flex items-center gap-1">
            <ScoringNumberInput
              control={control}
              register={register}
              name={`scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.value`}
              label={t("events.scoring.conditionLabel.value")}
              max={100}
            />
            <span className="text-[11px] text-muted-foreground/50 shrink-0 font-mono">
              %
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
