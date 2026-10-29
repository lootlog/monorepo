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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Plus, X } from "lucide-react";
import {
  EVENT_SCORING_CONDITION_TYPES,
  type EventScoringCondition,
} from "@lootlog/domain/scoring";
import {
  getScoringConditionTypeDescription,
  getScoringConditionTypeLabel,
} from "../../utils/scoring-rule-labels";
import { createDefaultScoringCondition } from "../../utils/scoring-condition-defaults";
import { ScoringConditionNumeric } from "./scoring-condition-numeric";
import { ScoringConditionBoolean } from "./scoring-condition-boolean";
import { ScoringConditionTimeWindow } from "./scoring-condition-time-window";
import { ScoringConditionRespawn } from "./scoring-condition-respawn";
import { ScoringConditionRespawnJoin } from "./scoring-condition-respawn-join";
import { ScoringConditionGroupSize } from "./scoring-condition-group-size";

import type { ScoringRulesFormValues } from "./scoring-rules-editor";

interface ScoringConditionsEditorProps {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  setValue: UseFormSetValue<ScoringRulesFormValues>;
  ruleIndex: number;
}

/** Condition types grouped by what they look at, in picker order. */
const CONDITION_GROUPS = [
  {
    id: "presence",
    types: ["RESPAWN_JOIN", "GROUP_SIZE", "NUMERIC"],
  },
  {
    id: "time",
    types: ["KILL_TIME_IN_WINDOW", "RESPAWN_WINDOW_COVERAGE"],
  },
  { id: "other", types: ["BOOLEAN"] },
] satisfies Array<{ id: string; types: EventScoringCondition["type"][] }>;

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
    <div className="grid gap-2">
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
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => append(createDefaultScoringCondition())}
        >
          <Plus className="size-4" />
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

  const conditionPath =
    `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}` as const;

  const conditionType = useWatch({ control, name: `${conditionPath}.type` });

  return (
    <>
      {showAndConnector && (
        <div className="flex items-center gap-2 px-1" aria-hidden>
          <span className="text-xs font-medium text-muted-foreground">
            {t("events.scoring.andLabel")}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}
      <div className="grid gap-3 rounded-lg border border-border bg-background/40 p-3">
        <div className="flex items-start justify-between gap-2">
          <Controller
            control={control}
            name={`${conditionPath}.type`}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(nextConditionType) => {
                  const selectedType = EVENT_SCORING_CONDITION_TYPES.find(
                    (type) => type === nextConditionType,
                  );

                  if (!selectedType || selectedType === field.value) return;
                  setValue(
                    conditionPath,
                    createDefaultScoringCondition(selectedType),
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
                items={EVENT_SCORING_CONDITION_TYPES.map((type) => ({
                  value: type,
                  label: <>{getScoringConditionTypeLabel(type, t)}</>,
                }))}
              >
                <SelectTrigger
                  className="min-w-0 flex-1 font-medium sm:max-w-80"
                  aria-label={t("events.scoring.fieldLabel.conditionType", {
                    rule: ruleIndex + 1,
                    condition: conditionIndex + 1,
                  })}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_GROUPS.map((group) => (
                    <SelectGroup key={group.id}>
                      <SelectLabel>
                        {t(`events.scoring.conditionGroup.${group.id}`)}
                      </SelectLabel>
                      {group.types.map((type) => (
                        <SelectItem key={type} value={type}>
                          <span className="grid gap-0.5 py-0.5">
                            <span className="font-medium">
                              {getScoringConditionTypeLabel(type, t)}
                            </span>
                            <span className="text-xs font-normal text-muted-foreground">
                              {getScoringConditionTypeDescription(type, t)}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              aria-label={t("events.scoring.removeCondition", {
                condition: conditionIndex + 1,
              })}
              onClick={onRemove}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        {conditionType === "NUMERIC" && (
          <ScoringConditionNumeric
            control={control}
            register={register}
            ruleIndex={ruleIndex}
            conditionIndex={conditionIndex}
          />
        )}

        {conditionType === "BOOLEAN" && (
          <ScoringConditionBoolean
            control={control}
            ruleIndex={ruleIndex}
            conditionIndex={conditionIndex}
          />
        )}

        {conditionType === "KILL_TIME_IN_WINDOW" && (
          <ScoringConditionTimeWindow
            register={register}
            ruleIndex={ruleIndex}
            conditionIndex={conditionIndex}
          />
        )}

        {conditionType === "RESPAWN_WINDOW_COVERAGE" && (
          <ScoringConditionRespawn
            control={control}
            register={register}
            ruleIndex={ruleIndex}
            conditionIndex={conditionIndex}
          />
        )}

        {conditionType === "RESPAWN_JOIN" && (
          <ScoringConditionRespawnJoin
            control={control}
            ruleIndex={ruleIndex}
            conditionIndex={conditionIndex}
          />
        )}

        {conditionType === "GROUP_SIZE" && (
          <ScoringConditionGroupSize
            control={control}
            register={register}
            setValue={setValue}
            ruleIndex={ruleIndex}
            conditionIndex={conditionIndex}
          />
        )}
      </div>
    </>
  );
};
