import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Plus, Trash2 } from "lucide-react";
import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import type { TFunction } from "i18next";
import {
  EVENT_SCORING_ACTION_TYPES,
  EVENT_SCORING_BOOLEAN_FACTORS,
  EVENT_SCORING_CONDITION_TYPES,
  EVENT_SCORING_NUMERIC_FACTORS,
  EVENT_SCORING_NUMERIC_OPERATORS,
  type EventScoringCondition,
} from "../../types/scoring-rules";
import {
  getScoringActionTypeLabel,
  getScoringConditionTypeLabel,
  getScoringFactorLabel,
} from "../../utils/scoring-rule-labels";
import type { EventScoringRules } from "../../types/scoring-rules";
import {
  createDefaultScoringAction,
  createDefaultScoringCondition,
} from "../../utils/scoring-condition-defaults";

type ScoringRulesFormValues = {
  scoringRules: EventScoringRules;
};

interface ScoringRulesEditorProps<TFieldValues extends ScoringRulesFormValues> {
  control: Control<TFieldValues>;
  register: UseFormRegister<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  t: TFunction;
}

const makeRuleId = () =>
  `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const defaultCondition = () => createDefaultScoringCondition();

const defaultRule = () => ({
  id: makeRuleId(),
  name: "",
  enabled: true,
  conditions: [defaultCondition()],
  action: createDefaultScoringAction(),
});

const RuleConditionsEditor = ({
  control,
  register,
  setValue,
  ruleIndex,
  t,
}: {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  setValue: UseFormSetValue<ScoringRulesFormValues>;
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
          setValue={setValue}
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
  setValue,
  ruleIndex,
  conditionIndex,
  canRemove,
  onRemove,
  t,
}: {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  setValue: UseFormSetValue<ScoringRulesFormValues>;
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
  const conditionPath =
    `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}` as const;

  return (
    <div className="rounded-md border p-2 space-y-2">
      <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
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
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  },
                );
              }}
            >
              <SelectTrigger size="sm">
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
          <Controller
            control={control}
            name={`scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.factor`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_SCORING_NUMERIC_FACTORS.map((factor) => (
                    <SelectItem key={factor} value={factor}>
                      {getScoringFactorLabel(factor, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <Controller
            control={control}
            name={`scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.operator`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_SCORING_NUMERIC_OPERATORS.map((operator) => (
                    <SelectItem key={operator} value={operator}>
                      {operator}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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
          <Controller
            control={control}
            name={`scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.factor`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_SCORING_BOOLEAN_FACTORS.map((factor) => (
                    <SelectItem key={factor} value={factor}>
                      {getScoringFactorLabel(factor, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <Controller
            control={control}
            name={`scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.value`}
            render={({ field }) => (
              <Select
                value={String(field.value)}
                onValueChange={(v) => field.onChange(v === "true")}
              >
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">
                    {t("events.scoring.booleanValue.true", "tak")}
                  </SelectItem>
                  <SelectItem value="false">
                    {t("events.scoring.booleanValue.false", "nie")}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
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
          <Controller
            control={control}
            name={`scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.operator`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_SCORING_NUMERIC_OPERATORS.map((operator) => (
                    <SelectItem key={operator} value={operator}>
                      {operator}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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
          'Warunki w regule są łączone spójnikiem "i"',
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
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  ruleIndex: number;
  t: TFunction;
}) => {
  const actionType = useWatch({
    control,
    name: `scoringRules.rules.${ruleIndex}.action.type`,
  });

  return (
    <div className="space-y-2">
      <Controller
        control={control}
        name={`scoringRules.rules.${ruleIndex}.action.type`}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger size="sm" className="w-full">
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

export const ScoringRulesEditor = <
  TFieldValues extends ScoringRulesFormValues,
>({
  control,
  register,
  setValue,
  t,
}: ScoringRulesEditorProps<TFieldValues>) => {
  const scopedControl = control as unknown as Control<ScoringRulesFormValues>;
  const scopedRegister =
    register as unknown as UseFormRegister<ScoringRulesFormValues>;
  const scopedSetValue =
    setValue as unknown as UseFormSetValue<ScoringRulesFormValues>;

  const { fields, append, remove } = useFieldArray({
    control: scopedControl,
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
            {...scopedRegister("scoringRules.hardCapPoints", {
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
            {...scopedRegister("scoringRules.minTrackingPercentForBonuses", {
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
            {...scopedRegister("scoringRules.timezone")}
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
          <div
            key={field.id}
            className="rounded-lg border bg-background/70 p-3 space-y-3"
          >
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <Input
                {...scopedRegister(`scoringRules.rules.${ruleIndex}.name`)}
                placeholder={t(
                  "events.scoring.ruleName",
                  "Nazwa reguły / bonusu",
                )}
                className="h-9 text-sm"
              />
              <Input
                {...scopedRegister(`scoringRules.rules.${ruleIndex}.id`)}
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
                {...scopedRegister(`scoringRules.rules.${ruleIndex}.enabled`)}
              />
              {t("events.scoring.ruleEnabled", "Reguła aktywna")}
            </label>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {t("events.scoring.ifLabel", "JEŻELI")}
              </Label>
              <RuleConditionsEditor
                control={scopedControl}
                register={scopedRegister}
                setValue={scopedSetValue}
                ruleIndex={ruleIndex}
                t={t}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {t("events.scoring.thenLabel", "WTEDY")}
              </Label>
              <RuleActionEditor
                control={scopedControl}
                register={scopedRegister}
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

      <input
        type="hidden"
        {...scopedRegister("scoringRules.version", { value: 1 })}
      />
    </div>
  );
};
