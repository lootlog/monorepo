import { useId } from "react";
import { ScoringFactorSelect } from "./scoring-factor-select";
import { ScoringOperatorSelect } from "./scoring-operator-select";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { EVENT_SCORING_NUMERIC_FACTORS } from "@lootlog/domain/scoring";
import { ScoringField } from "./scoring-field";
import { ScoringNumberInput } from "./scoring-number-input";
import type { ScoringRulesFormValues } from "./scoring-rules-editor";

interface ScoringConditionNumericProps {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  ruleIndex: number;
  conditionIndex: number;
}

const getFactorUnit = (factor: string | undefined) => {
  if (!factor || factor === "assignedMembersCount") return undefined;

  if (factor.endsWith("Percentage")) return "percent";

  return factor === "minutesSinceLeaveToKill" ? "minutes" : "seconds";
};

export const ScoringConditionNumeric = ({
  control,
  register,
  ruleIndex,
  conditionIndex,
}: ScoringConditionNumericProps) => {
  const { t } = useTranslation();
  const idPrefix = useId();

  const path =
    `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}` as const;

  const factor = useWatch({ control, name: `${path}.factor` });
  const unit = getFactorUnit(factor);

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_8rem]">
      <ScoringField
        label={t("events.scoring.conditionLabel.factor")}
        htmlFor={`${idPrefix}-factor`}
      >
        <Controller
          control={control}
          name={`${path}.factor`}
          render={({ field }) => (
            <ScoringFactorSelect
              id={`${idPrefix}-factor`}
              factors={EVENT_SCORING_NUMERIC_FACTORS}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </ScoringField>
      <ScoringField
        label={t("events.scoring.conditionLabel.operator")}
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
          unit={
            unit === "percent" ? "%" : unit && t(`events.scoring.unit.${unit}`)
          }
          label={t("events.scoring.fieldLabel.conditionValue", {
            rule: ruleIndex + 1,
            condition: conditionIndex + 1,
          })}
        />
      </ScoringField>
    </div>
  );
};
