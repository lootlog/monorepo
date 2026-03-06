import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Plus, Trash2 } from "lucide-react";
import {
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import type { TFunction } from "i18next";
import {
  EVENT_SCORING_ACTION_TYPES,
  EVENT_SCORING_BOOLEAN_FACTORS,
  EVENT_SCORING_CONDITION_TYPES,
  EVENT_SCORING_NUMERIC_FACTORS,
  EVENT_SCORING_NUMERIC_OPERATORS,
} from "../../types/scoring-rules";
import {
  getScoringActionTypeLabel,
  getScoringConditionTypeLabel,
  getScoringFactorLabel,
} from "../../utils/scoring-rule-labels";

interface ScoringRulesEditorProps {
  control: Control<any>;
  register: UseFormRegister<any>;
  t: TFunction;
}

const makeRuleId = () =>
  `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const defaultCondition = () => ({
  type: "NUMERIC" as const,
  factor: "trackingDurationPercentage" as const,
  operator: ">=" as const,
  value: 0,
});

const defaultRule = () => ({
  id: makeRuleId(),
  name: "",
  enabled: true,
  conditions: [defaultCondition()],
  action: {
    type: "ADD_BONUS" as const,
    points: 0,
  },
});

const RuleConditionsEditor = ({
  control,
  register,
  ruleIndex,
  t,
}: {
  control: Control<any>;
  register: UseFormRegister<any>;
  ruleIndex: number;
  t: TFunction;
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `scoringRules.rules.${ruleIndex}.conditions`,
  });

  return (
    <div className="space-y-2">
      {fields.map((field, conditionIndex) => (
        <RuleConditionRow
          key={field.id}
          control={control}
          register={register}
          ruleIndex={ruleIndex}
          conditionIndex={conditionIndex}
          t={t}
          canRemove={fields.length > 1}
          onRemove={() => remove(conditionIndex)}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append(defaultCondition())}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        {t("events.scoring.addCondition", "Dodaj warunek")}
      </Button>
    </div>
  );
};

const RuleConditionRow = ({
  control,
  register,
  ruleIndex,
  conditionIndex,
  canRemove,
  onRemove,
  t,
}: {
  control: Control<any>;
  register: UseFormRegister<any>;
  ruleIndex: number;
  conditionIndex: number;
  canRemove: boolean;
  onRemove: () => void;
  t: TFunction;
}) => {
  const conditionType = useWatch({
    control,
    name: `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.type`,
  });

  return (
    <div className="rounded-md border p-2 space-y-2">
      <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
        <select
          {...register(
            `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.type`,
          )}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          {EVENT_SCORING_CONDITION_TYPES.map((conditionTypeOption) => (
            <option key={conditionTypeOption} value={conditionTypeOption}>
              {getScoringConditionTypeLabel(conditionTypeOption, t)}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={onRemove}
          disabled={!canRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {conditionType === "NUMERIC" && (
        <div className="grid grid-cols-3 gap-2">
          <select
            {...register(
              `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.factor`,
            )}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {EVENT_SCORING_NUMERIC_FACTORS.map((factor) => (
              <option key={factor} value={factor}>
                {getScoringFactorLabel(factor, t)}
              </option>
            ))}
          </select>
          <select
            {...register(
              `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.operator`,
            )}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {EVENT_SCORING_NUMERIC_OPERATORS.map((operator) => (
              <option key={operator} value={operator}>
                {operator}
              </option>
            ))}
          </select>
          <Input
            type="number"
            step={0.01}
            {...register(
              `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.value`,
              { valueAsNumber: true },
            )}
          />
        </div>
      )}

      {conditionType === "BOOLEAN" && (
        <div className="grid grid-cols-2 gap-2">
          <select
            {...register(
              `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.factor`,
            )}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {EVENT_SCORING_BOOLEAN_FACTORS.map((factor) => (
              <option key={factor} value={factor}>
                {getScoringFactorLabel(factor, t)}
              </option>
            ))}
          </select>
          <select
            {...register(
              `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.value`,
              {
                setValueAs: (value) => value === "true",
              },
            )}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="true">{t("events.scoring.booleanValue.true", "tak")}</option>
            <option value="false">{t("events.scoring.booleanValue.false", "nie")}</option>
          </select>
        </div>
      )}

      {conditionType === "KILL_TIME_IN_WINDOW" && (
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="time"
            {...register(
              `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.from`,
            )}
          />
          <Input
            type="time"
            {...register(
              `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.to`,
            )}
          />
        </div>
      )}

      {conditionType === "RESPAWN_WINDOW_COVERAGE" && (
        <div className="grid grid-cols-4 gap-2">
          <Input
            type="time"
            {...register(
              `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.from`,
            )}
          />
          <Input
            type="time"
            {...register(
              `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.to`,
            )}
          />
          <select
            {...register(
              `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.operator`,
            )}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {EVENT_SCORING_NUMERIC_OPERATORS.map((operator) => (
              <option key={operator} value={operator}>
                {operator}
              </option>
            ))}
          </select>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            {...register(
              `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.value`,
              { valueAsNumber: true },
            )}
          />
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {t(
          "events.scoring.conditionAndHint",
          "Warunki w regule są łączone spójnikiem \"i\"",
        )}
      </p>
    </div>
  );
};

const RuleActionEditor = ({
  control,
  register,
  ruleIndex,
  t,
}: {
  control: Control<any>;
  register: UseFormRegister<any>;
  ruleIndex: number;
  t: TFunction;
}) => {
  const actionType = useWatch({
    control,
    name: `scoringRules.rules.${ruleIndex}.action.type`,
  });

  return (
    <div className="space-y-2">
      <select
        {...register(`scoringRules.rules.${ruleIndex}.action.type`)}
        className="h-9 rounded-md border bg-background px-2 text-sm w-full"
      >
        {EVENT_SCORING_ACTION_TYPES.map((actionTypeOption) => (
          <option key={actionTypeOption} value={actionTypeOption}>
            {getScoringActionTypeLabel(actionTypeOption, t)}
          </option>
        ))}
      </select>

      {(actionType === "SET_BASE" || actionType === "ADD_BONUS") && (
        <div>
          <Input
            type="number"
            min={0}
            step={0.01}
            {...register(`scoringRules.rules.${ruleIndex}.action.points`, {
              valueAsNumber: true,
            })}
          />
        </div>
      )}
    </div>
  );
};

export const ScoringRulesEditor = ({
  control,
  register,
  t,
}: ScoringRulesEditorProps) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "scoringRules.rules",
  });

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t("events.scoring.hardCapPoints", "Maks. punkty (cap)")}
          </Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            {...register("scoringRules.hardCapPoints", {
              valueAsNumber: true,
            })}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t(
              "events.scoring.minTrackingPercentForBonuses",
              "Min. pokrycie dla bonusów (%)",
            )}
          </Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            {...register("scoringRules.minTrackingPercentForBonuses", {
              valueAsNumber: true,
            })}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t("events.scoring.timezoneLabel", "Strefa czasowa")}
          </Label>
          <Input
            {...register("scoringRules.timezone")}
            className="h-9 text-sm"
            placeholder="Europe/Warsaw"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("events.scoring.rules", "Reguły JEŻELI + akcja")}
        </Label>
        {fields.map((field, ruleIndex) => (
          <div key={field.id} className="rounded-lg border bg-background/70 p-3 space-y-3">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <Input
                {...register(`scoringRules.rules.${ruleIndex}.name`)}
                placeholder={t(
                  "events.scoring.ruleName",
                  "Nazwa reguły / bonusu",
                )}
                className="h-9 text-sm"
              />
              <Input
                {...register(`scoringRules.rules.${ruleIndex}.id`)}
                placeholder="rule-id"
                className="h-9 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => remove(ruleIndex)}
                disabled={fields.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t(
                "events.scoring.ruleNameHint",
                "Przy akcji „Dodaj bonus” ta nazwa pojawi się w rozbiciu punktów.",
              )}
            </p>

            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                {...register(`scoringRules.rules.${ruleIndex}.enabled`)}
              />
              {t("events.scoring.ruleEnabled", "Reguła aktywna")}
            </label>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {t("events.scoring.ifLabel", "JEŻELI")}
              </Label>
              <RuleConditionsEditor
                control={control}
                register={register}
                ruleIndex={ruleIndex}
                t={t}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {t("events.scoring.thenLabel", "WTEDY")}
              </Label>
              <RuleActionEditor
                control={control}
                register={register}
                ruleIndex={ruleIndex}
                t={t}
              />
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => append(defaultRule())}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t("events.scoring.addRule", "Dodaj regułę")}
        </Button>
      </div>

      <input type="hidden" {...register("scoringRules.version", { value: 1 })} />
    </div>
  );
};
