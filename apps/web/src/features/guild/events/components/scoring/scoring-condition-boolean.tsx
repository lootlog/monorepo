import { ScoringFactorSelect } from "./scoring-factor-select";
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

  return (
    <div className="grid grid-cols-[1fr_100px] gap-1.5">
      <div className="space-y-0.5">
        <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
          {t("events.scoring.conditionLabel.factor")}
        </Label>
        <Controller
          control={control}
          name={`scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.factor`}
          render={({ field }) => (
            <ScoringFactorSelect
              factors={EVENT_SCORING_BOOLEAN_FACTORS}
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
