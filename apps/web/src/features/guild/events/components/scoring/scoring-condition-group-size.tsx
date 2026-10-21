import { useId } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import {
  GROUP_COUNTINGS,
  GROUP_SIZE_COMPARISONS,
  type GroupSizeRange,
} from "@lootlog/domain/scoring-presence";
import {
  GROUP_SIZE_BOUNDS,
  PERCENTAGE_BOUNDS,
  getGroupSizeRangeError,
} from "../../utils/scoring-number-validation";
import { ScoringField } from "./scoring-field";
import { ScoringNumberInput } from "./scoring-number-input";
import type { ScoringRulesFormValues } from "./scoring-rules-editor";

interface ScoringConditionGroupSizeProps {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  setValue: UseFormSetValue<ScoringRulesFormValues>;
  ruleIndex: number;
  conditionIndex: number;
}

const SHORTCUTS = [
  { id: "solo", size: { comparison: "EXACT", value: 1, to: 1 } },
  { id: "smallGroup", size: { comparison: "AT_MOST", value: 4, to: 4 } },
] satisfies Array<{ id: string; size: GroupSizeRange }>;

export const ScoringConditionGroupSize = ({
  control,
  register,
  setValue,
  ruleIndex,
  conditionIndex,
}: ScoringConditionGroupSizeProps) => {
  const { t } = useTranslation();
  const idPrefix = useId();

  const path =
    `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}` as const;

  const labels = { rule: ruleIndex + 1, condition: conditionIndex + 1 };

  const counting = useWatch({ control, name: `${path}.counting` });
  const size = useWatch({ control, name: `${path}.size` });

  const people = t("events.scoring.unit.people");

  return (
    <div className="grid gap-3">
      <ScoringField
        label={t("events.scoring.conditionLabel.countingMode")}
        htmlFor={`${idPrefix}-counting`}
        hint={t(`events.scoring.groupCountingHint.${counting}`)}
      >
        <Controller
          control={control}
          name={`${path}.counting`}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => {
                const next = GROUP_COUNTINGS.find((option) => option === value);

                if (next) field.onChange(next);
              }}
              items={GROUP_COUNTINGS.map((option) => ({
                value: option,
                label: <>{t(`events.scoring.groupCountingTitle.${option}`)}</>,
              }))}
            >
              <SelectTrigger
                id={`${idPrefix}-counting`}
                className="w-full font-medium sm:max-w-md"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_COUNTINGS.map((option) => (
                  <SelectItem key={option} value={option}>
                    <span className="grid gap-0.5 py-0.5">
                      <span className="font-medium">
                        {t(`events.scoring.groupCountingTitle.${option}`)}
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {t(`events.scoring.groupCountingHint.${option}`)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </ScoringField>

      <ScoringField
        label={t("events.scoring.conditionLabel.groupSize")}
        htmlFor={`${idPrefix}-comparison`}
        hint={t("events.scoring.hint.groupIncludesPlayer")}
      >
        <div className="flex flex-wrap items-start gap-2">
          <Controller
            control={control}
            name={`${path}.size.comparison`}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  const next = GROUP_SIZE_COMPARISONS.find(
                    (option) => option === value,
                  );

                  if (next) field.onChange(next);
                }}
                items={GROUP_SIZE_COMPARISONS.map((option) => ({
                  value: option,
                  label: (
                    <>{t(`events.scoring.groupSizeComparison.${option}`)}</>
                  ),
                }))}
              >
                <SelectTrigger
                  id={`${idPrefix}-comparison`}
                  className="w-40 font-medium"
                  aria-label={t(
                    "events.scoring.fieldLabel.groupSizeComparison",
                    labels,
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_SIZE_COMPARISONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`events.scoring.groupSizeComparison.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <div className="w-28">
            <ScoringNumberInput
              control={control}
              register={register}
              name={`${path}.size.value`}
              bounds={GROUP_SIZE_BOUNDS}
              unit={people}
              label={t("events.scoring.fieldLabel.groupSizeValue", labels)}
            />
          </div>
          {size?.comparison === "BETWEEN" ? (
            <>
              <span className="flex h-9 items-center text-sm text-muted-foreground">
                {t("events.scoring.conditionLabel.groupSizeTo")}
              </span>
              <div className="w-28">
                <ScoringNumberInput
                  control={control}
                  register={register}
                  name={`${path}.size.to`}
                  bounds={GROUP_SIZE_BOUNDS}
                  unit={people}
                  error={size ? getGroupSizeRangeError(size) : undefined}
                  label={t("events.scoring.fieldLabel.groupSizeTo", labels)}
                />
              </div>
            </>
          ) : null}
        </div>
        {counting === "TIMELINE" ? (
          <div className="flex flex-wrap gap-1.5">
            {SHORTCUTS.map((shortcut) => {
              const active =
                size?.comparison === shortcut.size.comparison &&
                size.value === shortcut.size.value;

              return (
                <Button
                  key={shortcut.id}
                  type="button"
                  size="sm"
                  variant={active ? "secondary" : "outline"}
                  aria-pressed={active}
                  onClick={() =>
                    setValue(`${path}.size`, shortcut.size, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  {t(`events.scoring.groupShortcut.${shortcut.id}`)}
                </Button>
              );
            })}
          </div>
        ) : null}
      </ScoringField>

      {counting === "TIMELINE" ? (
        <ScoringField
          label={t("events.scoring.conditionLabel.minTime")}
          htmlFor={`${idPrefix}-minTime`}
          hint={t("events.scoring.hint.minTime")}
        >
          <div className="w-28">
            <ScoringNumberInput
              id={`${idPrefix}-minTime`}
              control={control}
              register={register}
              name={`${path}.minTimePercentage`}
              bounds={PERCENTAGE_BOUNDS}
              unit="%"
              label={t("events.scoring.fieldLabel.minTime", labels)}
            />
          </div>
        </ScoringField>
      ) : null}

      {counting === "MIN_SHARE" ? (
        <ScoringField
          label={t("events.scoring.conditionLabel.minShare")}
          htmlFor={`${idPrefix}-minShare`}
          hint={t("events.scoring.hint.minShare")}
        >
          <div className="w-28">
            <ScoringNumberInput
              id={`${idPrefix}-minShare`}
              control={control}
              register={register}
              name={`${path}.minSharePercentage`}
              bounds={PERCENTAGE_BOUNDS}
              unit="%"
              label={t("events.scoring.fieldLabel.minShare", labels)}
            />
          </div>
        </ScoringField>
      ) : null}
    </div>
  );
};
