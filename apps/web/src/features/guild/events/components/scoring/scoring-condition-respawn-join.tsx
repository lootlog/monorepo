import { useId, useState } from "react";
import { useController, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Input } from "@lootlog/ui/components/input";
import {
  SECONDS_BOUNDS,
  scoringNumberSchema,
} from "../../utils/scoring-number-validation";
import { ScoringField } from "./scoring-field";
import type { ScoringRulesFormValues } from "./scoring-rules-editor";

interface ScoringConditionRespawnJoinProps {
  control: Control<ScoringRulesFormValues>;
  ruleIndex: number;
  conditionIndex: number;
}

const toParts = (total: number) =>
  Number.isFinite(total)
    ? { minutes: String(Math.floor(total / 60)), seconds: String(total % 60) }
    : { minutes: "", seconds: "" };

const toTotal = (parts: { minutes: string; seconds: string }) => {
  const minutes = parts.minutes.trim() === "" ? 0 : Number(parts.minutes);
  const seconds = parts.seconds.trim() === "" ? 0 : Number(parts.seconds);

  return parts.minutes.trim() === "" && parts.seconds.trim() === ""
    ? Number.NaN
    : minutes * 60 + seconds;
};

/**
 * The allowed lateness, edited as minutes and seconds and stored as whole
 * seconds on the condition.
 */
export const ScoringConditionRespawnJoin = ({
  control,
  ruleIndex,
  conditionIndex,
}: ScoringConditionRespawnJoinProps) => {
  const { t } = useTranslation();
  const idPrefix = useId();
  const errorId = useId();
  const hintId = useId();

  const { field } = useController({
    control,
    name: `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.toleranceSeconds`,
  });

  const [parts, setParts] = useState(() => toParts(field.value));

  // A form reset replaces the value from outside; show it instead of the
  // typed text.
  if (
    Number.isFinite(field.value) &&
    toTotal(parts) !== field.value &&
    !Number.isNaN(toTotal(parts))
  ) {
    setParts(toParts(field.value));
  }

  const error = scoringNumberSchema(SECONDS_BOUNDS).safeParse(field.value).error
    ?.issues[0]?.message;

  const change = (next: typeof parts) => {
    setParts(next);
    field.onChange(toTotal(next));
  };

  const labels = { rule: ruleIndex + 1, condition: conditionIndex + 1 };

  const inputs = [
    {
      key: "minutes" as const,
      max: undefined,
      unit: t("events.scoring.unit.minutes"),
      label: t("events.scoring.fieldLabel.toleranceMinutes", labels),
    },
    {
      key: "seconds" as const,
      max: 59,
      unit: t("events.scoring.unit.seconds"),
      label: t("events.scoring.fieldLabel.toleranceSeconds", labels),
    },
  ];

  return (
    <ScoringField
      label={t("events.scoring.conditionLabel.tolerance")}
      htmlFor={`${idPrefix}-minutes`}
    >
      <div className="grid grid-cols-2 gap-2 sm:max-w-72">
        {inputs.map((input) => (
          <div key={input.key} className="relative">
            <Input
              id={`${idPrefix}-${input.key}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={input.max}
              step={1}
              value={parts[input.key]}
              onBlur={field.onBlur}
              onChange={(event) =>
                change({ ...parts, [input.key]: event.target.value })
              }
              className="pr-10 tabular-nums"
              aria-label={input.label}
              aria-invalid={!!error}
              aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
            >
              {input.unit}
            </span>
          </div>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {t(error)}
        </p>
      ) : null}
      <p id={hintId} className="text-xs leading-snug text-muted-foreground">
        {t("events.scoring.hint.respawnJoin")}
      </p>
    </ScoringField>
  );
};
