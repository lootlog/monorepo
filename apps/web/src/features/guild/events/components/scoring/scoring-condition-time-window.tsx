import { useId } from "react";
import type { UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Input } from "@lootlog/ui/components/input";
import { ScoringField } from "./scoring-field";
import type { ScoringRulesFormValues } from "./scoring-rules-editor";

interface ScoringConditionTimeWindowProps {
  register: UseFormRegister<ScoringRulesFormValues>;
  ruleIndex: number;
  conditionIndex: number;
}

export const ScoringConditionTimeWindow = ({
  register,
  ruleIndex,
  conditionIndex,
}: ScoringConditionTimeWindowProps) => {
  const { t } = useTranslation();
  const idPrefix = useId();

  const path =
    `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}` as const;

  return (
    <div className="grid grid-cols-2 gap-2 sm:max-w-72">
      <ScoringField
        label={t("events.scoring.conditionLabel.from")}
        htmlFor={`${idPrefix}-from`}
      >
        <Input
          id={`${idPrefix}-from`}
          type="time"
          className="tabular-nums"
          {...register(`${path}.from`)}
        />
      </ScoringField>
      <ScoringField
        label={t("events.scoring.conditionLabel.to")}
        htmlFor={`${idPrefix}-to`}
      >
        <Input
          id={`${idPrefix}-to`}
          type="time"
          className="tabular-nums"
          {...register(`${path}.to`)}
        />
      </ScoringField>
    </div>
  );
};
