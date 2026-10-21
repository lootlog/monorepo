import { useId } from "react";
import {
  useWatch,
  type Control,
  type FieldPathByValue,
  type UseFormRegister,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Input } from "@lootlog/ui/components/input";
import {
  scoringNumberSchema,
  type ScoringNumberBounds,
} from "../../utils/scoring-number-validation";
import type { ScoringRulesFormValues } from "./scoring-rules-editor";

interface ScoringNumberInputProps {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  /** A numeric field; a condition's `value` is numeric for the types using this. */
  name:
    | FieldPathByValue<ScoringRulesFormValues, number>
    | `scoringRules.rules.${number}.conditions.${number}.value`;
  label: string;
  id?: string;
  bounds?: ScoringNumberBounds;
  step?: number;
  /** A unit shown inside the field's end, such as "%" or "pkt". */
  unit?: string;
  /** An extra error for the field, such as an inverted range. */
  error?: string;
  className?: string;
}

export const ScoringNumberInput = ({
  control,
  register,
  name,
  label,
  id,
  bounds,
  step = bounds?.integer ? 1 : 0.01,
  unit,
  error: extraError,
  className,
}: ScoringNumberInputProps) => {
  const { t } = useTranslation();
  const errorId = useId();

  const error =
    scoringNumberSchema(bounds).safeParse(useWatch({ control, name })).error
      ?.issues[0]?.message ?? extraError;

  return (
    <div className="min-w-0 flex-1">
      <div className="relative">
        <Input
          {...register(name, { valueAsNumber: true })}
          id={id}
          type="number"
          inputMode={bounds?.integer ? "numeric" : "decimal"}
          min={bounds?.min ?? 0}
          max={bounds?.max}
          step={step}
          className={className ?? "tabular-nums"}
          style={unit ? { paddingRight: `${unit.length + 2}ch` } : undefined}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
        />
        {unit ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
          >
            {unit}
          </span>
        ) : null}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-destructive">
          {t(error)}
        </p>
      )}
    </div>
  );
};
