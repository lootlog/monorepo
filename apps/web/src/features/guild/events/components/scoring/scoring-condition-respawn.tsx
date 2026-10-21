import { useId } from "react";
import { ScoringOperatorSelect } from "./scoring-operator-select";
import { ScoringConditionTimeWindow } from "./scoring-condition-time-window";
import {
  Controller,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { PERCENTAGE_BOUNDS } from "../../utils/scoring-number-validation";
import { ScoringField } from "./scoring-field";
import { ScoringNumberInput } from "./scoring-number-input";
import type { ScoringRulesFormValues } from "./scoring-rules-editor";

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
  const idPrefix = useId();

  const path =
    `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}` as const;

  return (
    <div className="grid gap-2">
      <ScoringConditionTimeWindow
        register={register}
        ruleIndex={ruleIndex}
        conditionIndex={conditionIndex}
      />
      <div className="grid grid-cols-[6rem_8rem] gap-2">
        <ScoringField
          label={t("events.scoring.conditionLabel.coverage")}
          htmlFor={`${idPrefix}-operator`}
        >
          <Controller
            control={control}
            name={`${path}.operator`}
            render={({ field }) => (
              <ScoringOperatorSelect
                id={`${idPrefix}-operator`}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </ScoringField>
        <ScoringField
          label={t("events.scoring.conditionLabel.value")}
          htmlFor={`${idPrefix}-value`}
        >
          <ScoringNumberInput
            id={`${idPrefix}-value`}
            control={control}
            register={register}
            name={`${path}.value`}
            bounds={PERCENTAGE_BOUNDS}
            unit="%"
            label={t("events.scoring.fieldLabel.conditionValue", {
              rule: ruleIndex + 1,
              condition: conditionIndex + 1,
            })}
          />
        </ScoringField>
      </div>
    </div>
  );
};
