import { useId } from "react";
import { ScoringFactorSelect } from "./scoring-factor-select";
import { Controller, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ScoringField } from "./scoring-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { EVENT_SCORING_BOOLEAN_FACTORS } from "@lootlog/domain/scoring";

import type { ScoringRulesFormValues } from "./scoring-rules-editor";

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
  const idPrefix = useId();

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
      <ScoringField
        label={t("events.scoring.conditionLabel.factor")}
        htmlFor={`${idPrefix}-factor`}
      >
        <Controller
          control={control}
          name={`scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.factor`}
          render={({ field }) => (
            <ScoringFactorSelect
              id={`${idPrefix}-factor`}
              factors={EVENT_SCORING_BOOLEAN_FACTORS}
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
        <Controller
          control={control}
          name={`scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.value`}
          render={({ field }) => (
            <Select
              value={String(field.value)}
              onValueChange={(v) => field.onChange(v === "true")}
              items={[
                {
                  value: "true",
                  label: <>{t("events.scoring.booleanValue.true")}</>,
                },
                {
                  value: "false",
                  label: <>{t("events.scoring.booleanValue.false")}</>,
                },
              ]}
            >
              <SelectTrigger id={`${idPrefix}-value`} className="w-full">
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
      </ScoringField>
    </div>
  );
};
