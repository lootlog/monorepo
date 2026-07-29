import {
  Controller,
  useFieldArray,
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
import { Plus, X } from "lucide-react";
import {
  EVENT_SCORING_CONDITION_TYPES,
  type EventScoringCondition,
  type EventScoringRules,
} from "@lootlog/scoring";
import { getScoringConditionTypeLabel } from "../../utils/scoring-rule-labels";
import { createDefaultScoringCondition } from "../../utils/scoring-condition-defaults";
import { ScoringConditionNumeric } from "./scoring-condition-numeric";
import { ScoringConditionBoolean } from "./scoring-condition-boolean";
import { ScoringConditionTimeWindow } from "./scoring-condition-time-window";
import { ScoringConditionRespawn } from "./scoring-condition-respawn";

type ScoringRulesFormValues = {
  scoringRules: EventScoringRules;
};

interface ScoringConditionsEditorProps {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  setValue: UseFormSetValue<ScoringRulesFormValues>;
  ruleIndex: number;
}

const CONDITION_COLORS: Record<
  EventScoringCondition["type"],
  { border: string; bg: string; dot: string }
> = {
  NUMERIC: {
    border: "border-violet-500/25",
    bg: "bg-violet-500/[0.02]",
    dot: "bg-violet-500/60",
  },
  BOOLEAN: {
    border: "border-sky-500/25",
    bg: "bg-sky-500/[0.02]",
    dot: "bg-sky-500/60",
  },
  KILL_TIME_IN_WINDOW: {
    border: "border-amber-500/25",
    bg: "bg-amber-500/[0.02]",
    dot: "bg-amber-500/60",
  },
  RESPAWN_WINDOW_COVERAGE: {
    border: "border-teal-500/25",
    bg: "bg-teal-500/[0.02]",
    dot: "bg-teal-500/60",
  },
};

export const ScoringConditionsEditor = ({
  control,
  register,
  setValue,
  ruleIndex,
}: ScoringConditionsEditorProps) => {
  const { t } = useTranslation();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `scoringRules.rules.${ruleIndex}.conditions`,
  });

  return (
    <div className="space-y-0">
      {fields.map((field, conditionIndex) => (
        <ConditionRow
          key={field.id}
          control={control}
          register={register}
          setValue={setValue}
          ruleIndex={ruleIndex}
          conditionIndex={conditionIndex}
          canRemove={fields.length > 1}
          onRemove={() => remove(conditionIndex)}
          showAndConnector={conditionIndex > 0}
        />
      ))}
      <div className="pt-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => append(createDefaultScoringCondition())}
        >
          <Plus className="h-3 w-3 mr-1" />
          {t("events.scoring.addCondition")}
        </Button>
      </div>
    </div>
  );
};

const ConditionRow = ({
  control,
  register,
  setValue,
  ruleIndex,
  conditionIndex,
  canRemove,
  onRemove,
  showAndConnector,
}: {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  setValue: UseFormSetValue<ScoringRulesFormValues>;
  ruleIndex: number;
  conditionIndex: number;
  canRemove: boolean;
  onRemove: () => void;
  showAndConnector: boolean;
}) => {
  const { t } = useTranslation();

  const conditionType = useWatch({
    control,
    name: `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.type`,
  });

  const conditionPath =
    `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}` as const;

  const conditionControl = control as unknown as Control<{
    scoringRules: { rules: { conditions: unknown[] }[] };
  }>;
  const conditionRegister = register as unknown as UseFormRegister<{
    scoringRules: { rules: { conditions: unknown[] }[] };
  }>;

  const colors =
    CONDITION_COLORS[conditionType as EventScoringCondition["type"]] ??
    CONDITION_COLORS.NUMERIC;

  return (
    <>
      {showAndConnector && (
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50 font-semibold px-1">
            {t("events.scoring.andLabel")}
          </span>
          <div className="flex-1 h-px bg-border/40" />
        </div>
      )}
      <div
        className={`rounded-md border ${colors.border} ${colors.bg} p-2.5 space-y-2`}
      >
        {/* Condition type + remove in a compact header */}
        <div className="flex items-center gap-2">
          <div className={`size-1.5 rounded-full ${colors.dot} shrink-0`} />
          <Controller
            control={control}
            name={`scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.type`}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(nextConditionType) => {
                  setValue(
                    conditionPath,
                    createDefaultScoringCondition(
                      nextConditionType as EventScoringCondition["type"],
                    ),
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="h-7 text-[11px] bg-transparent border-0 shadow-none px-1 w-auto max-w-[200px] hover:bg-muted/40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_SCORING_CONDITION_TYPES.map((conditionTypeOption) => (
                    <SelectItem
                      key={conditionTypeOption}
                      value={conditionTypeOption}
                    >
                      {getScoringConditionTypeLabel(conditionTypeOption, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <div className="flex-1" />
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="size-5 rounded flex items-center justify-center text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Condition fields */}
        {conditionType === "NUMERIC" && (
          <ScoringConditionNumeric
            control={conditionControl}
            register={conditionRegister}
            ruleIndex={ruleIndex}
            conditionIndex={conditionIndex}
          />
        )}

        {conditionType === "BOOLEAN" && (
          <ScoringConditionBoolean
            control={conditionControl}
            ruleIndex={ruleIndex}
            conditionIndex={conditionIndex}
          />
        )}

        {conditionType === "KILL_TIME_IN_WINDOW" && (
          <ScoringConditionTimeWindow
            register={conditionRegister}
            ruleIndex={ruleIndex}
            conditionIndex={conditionIndex}
          />
        )}

        {conditionType === "RESPAWN_WINDOW_COVERAGE" && (
          <ScoringConditionRespawn
            control={conditionControl}
            register={conditionRegister}
            ruleIndex={ruleIndex}
            conditionIndex={conditionIndex}
          />
        )}
      </div>
    </>
  );
};
