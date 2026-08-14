import {
  Controller,
  useWatch,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import {
  EVENT_SCORING_ACTION_TYPES,
  type EventScoringRules,
} from "@lootlog/scoring";
import { getScoringActionTypeLabel } from "../../utils/scoring-rule-labels";

type ScoringRulesFormValues = {
  scoringRules: EventScoringRules;
};

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

  const actionType = useWatch({
    control,
    name: `scoringRules.rules.${ruleIndex}.action.type`,
  });

  const showPoints = actionType === "SET_BASE" || actionType === "ADD_BONUS";

  return (
    <div className={showPoints ? "grid grid-cols-[1fr_120px] gap-2" : ""}>
      <div className="space-y-0.5">
        <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
          {t("events.scoring.conditionLabel.action")}
        </Label>
        <Controller
          control={control}
          name={`scoringRules.rules.${ruleIndex}.action.type`}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              items={[
                ...EVENT_SCORING_ACTION_TYPES.map((actionTypeOption) => ({
                  value: actionTypeOption,
                  label: <>{getScoringActionTypeLabel(actionTypeOption, t)}</>,
                })),
              ]}
            >
              <SelectTrigger size="sm" className="h-8 text-[12px]">
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
      </div>

      {showPoints && (
        <div className="space-y-0.5">
          <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
            {t("events.scoring.conditionLabel.points")}
          </Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              step={0.01}
              className="h-8 text-[12px] font-mono"
              {...register(`scoringRules.rules.${ruleIndex}.action.points`, {
                valueAsNumber: true,
              })}
            />
            <span className="text-[11px] text-muted-foreground/50 shrink-0">
              pkt
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
