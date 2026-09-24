import { useId } from "react";
import { useWatch, type Control, type UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Input } from "@lootlog/ui/components/input";
import { getScoringNumberError } from "../../utils/scoring-number-validation";
import type { ScoringRulesFormValues } from "./scoring-rules-editor";

interface ScoringNumberInputProps {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  name:
    | "scoringRules.hardCapPoints"
    | "scoringRules.minTrackingPercentForBonuses"
    | `scoringRules.rules.${number}.conditions.${number}.value`
    | `scoringRules.rules.${number}.action.points`;
  label: string;
  max?: number;
  step?: number;
  className?: string;
}

export const ScoringNumberInput = ({
  control,
  register,
  name,
  label,
  max,
  step = 0.01,
  className = "h-8 text-[12px] font-mono",
}: ScoringNumberInputProps) => {
  const { t } = useTranslation();
  const errorId = useId();
  const fieldValue = useWatch({ control, name });
  const parsedValue = z.number().safeParse(fieldValue);
  const value = parsedValue.success ? parsedValue.data : Number.NaN;
  const error = getScoringNumberError(value, max);

  return (
    <div className="min-w-0 flex-1">
      <Input
        {...register(name, { valueAsNumber: true })}
        type="number"
        min={0}
        max={max}
        step={step}
        className={className}
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert" className="text-destructive text-xs mt-1">
          {t(error)}
        </p>
      )}
    </div>
  );
};
