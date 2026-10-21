import { useId } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { TriangleAlert } from "lucide-react";
import { EVENT_SCORING_ACTION_TYPES } from "@lootlog/domain/scoring";
import { formatPoints } from "../../utils/format-points";
import { getScoringActionTypeLabel } from "../../utils/scoring-rule-labels";
import { ScoringField } from "./scoring-field";
import { ScoringNumberInput } from "./scoring-number-input";
import type { ScoringRulesFormValues } from "./scoring-rules-editor";

interface ScoringActionEditorProps {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  ruleIndex: number;
}

export const ScoringActionEditor = ({
  control,
  register,
  ruleIndex,
}: ScoringActionEditorProps) => {
  const { t } = useTranslation();
  const idPrefix = useId();

  const action = useWatch({
    control,
    name: `scoringRules.rules.${ruleIndex}.action`,
  });

  const hardCapPoints = useWatch({
    control,
    name: "scoringRules.hardCapPoints",
  });

  const minTrackingPercentage = useWatch({
    control,
    name: "scoringRules.minTrackingPercentForBonuses",
  });

  const showPoints =
    action?.type === "SET_BASE" || action?.type === "ADD_BONUS";

  const exceedsCap =
    action?.type === "SET_BASE" &&
    Number.isFinite(action.points) &&
    Number.isFinite(hardCapPoints) &&
    action.points > hardCapPoints;

  return (
    <div className="grid gap-2">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <ScoringField
          label={t("events.scoring.conditionLabel.action")}
          htmlFor={`${idPrefix}-action`}
          hint={
            action
              ? t(`events.scoring.actionHint.${action.type}`, {
                  percentage: minTrackingPercentage,
                })
              : undefined
          }
        >
          <Controller
            control={control}
            name={`scoringRules.rules.${ruleIndex}.action.type`}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                items={EVENT_SCORING_ACTION_TYPES.map((actionTypeOption) => ({
                  value: actionTypeOption,
                  label: <>{getScoringActionTypeLabel(actionTypeOption, t)}</>,
                }))}
              >
                <SelectTrigger id={`${idPrefix}-action`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_SCORING_ACTION_TYPES.map((actionTypeOption) => (
                    <SelectItem key={actionTypeOption} value={actionTypeOption}>
                      {getScoringActionTypeLabel(actionTypeOption, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </ScoringField>

        {showPoints && (
          <ScoringField
            label={t("events.scoring.conditionLabel.points")}
            htmlFor={`${idPrefix}-points`}
          >
            <ScoringNumberInput
              id={`${idPrefix}-points`}
              control={control}
              register={register}
              name={`scoringRules.rules.${ruleIndex}.action.points`}
              unit={t("events.common.pointsShort")}
              label={t("events.scoring.fieldLabel.actionPoints", {
                rule: ruleIndex + 1,
              })}
            />
          </ScoringField>
        )}
      </div>

      {exceedsCap ? (
        <p className="flex items-start gap-1.5 text-xs leading-snug text-amber-400">
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {t("events.scoring.capWarning", {
            points: formatPoints(action.points),
            cap: formatPoints(hardCapPoints),
          })}
        </p>
      ) : null}
    </div>
  );
};
