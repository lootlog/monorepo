import { useId } from "react";
import type { Control, UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Input } from "@lootlog/ui/components/input";
import { PERCENTAGE_BOUNDS } from "../../utils/scoring-number-validation";
import { ScoringField } from "./scoring-field";
import { ScoringNumberInput } from "./scoring-number-input";
import type { ScoringRulesFormValues } from "./scoring-rules-editor";

interface ScoringGlobalSettingsProps {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
}

export const ScoringGlobalSettings = ({
  control,
  register,
}: ScoringGlobalSettingsProps) => {
  const { t } = useTranslation();
  const idPrefix = useId();

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <ScoringField
        label={t("events.scoring.hardCapPoints")}
        htmlFor={`${idPrefix}-cap`}
        hint={t("events.scoring.hint.hardCap")}
      >
        <ScoringNumberInput
          id={`${idPrefix}-cap`}
          control={control}
          register={register}
          name="scoringRules.hardCapPoints"
          unit={t("events.common.pointsShort")}
          label={t("events.scoring.hardCapPoints")}
        />
      </ScoringField>
      <ScoringField
        label={t("events.scoring.minTrackingPercentForBonuses")}
        htmlFor={`${idPrefix}-minTracking`}
        hint={t("events.scoring.hint.minTrackingForBonuses")}
      >
        <ScoringNumberInput
          id={`${idPrefix}-minTracking`}
          control={control}
          register={register}
          name="scoringRules.minTrackingPercentForBonuses"
          label={t("events.scoring.minTrackingPercentForBonuses")}
          bounds={PERCENTAGE_BOUNDS}
          step={1}
          unit="%"
        />
      </ScoringField>
      <ScoringField
        label={t("events.scoring.timezoneLabel")}
        htmlFor={`${idPrefix}-timezone`}
        hint={t("events.scoring.hint.timezone")}
      >
        <Input
          id={`${idPrefix}-timezone`}
          {...register("scoringRules.timezone")}
          placeholder="Europe/Warsaw"
        />
      </ScoringField>
    </div>
  );
};
