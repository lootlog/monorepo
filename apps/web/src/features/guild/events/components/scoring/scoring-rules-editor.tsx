import {
  applyGroupRulebook,
  makeRuleId,
} from "../../utils/scoring-rule-templates";
import {
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import { isEqual } from "es-toolkit";
import { useFieldArray, useWatch, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { Plus, FlaskConical } from "lucide-react";
import type { EventScoringRules } from "@lootlog/domain/scoring";
import {
  createDefaultScoringAction,
  createDefaultScoringCondition,
} from "../../utils/scoring-condition-defaults";
import { ScoringGlobalSettings } from "./scoring-global-settings";
import { ScoringHowItWorks } from "./scoring-how-it-works";
import { ScoringRuleCard } from "./scoring-rule-card";
import { ScoringRuleTemplatesMenu } from "./scoring-rule-templates-menu";
import { ScoringSimulatorDialog } from "./scoring-simulator-dialog";

export type ScoringRulesFormValues = {
  scoringRules: EventScoringRules;
};

interface ScoringRulesEditorProps {
  value: EventScoringRules;
  onChange: (value: EventScoringRules) => void;
  error?: string;
  ref?: Ref<{ focus: () => void }>;
}

const defaultRule = () => ({
  id: makeRuleId(),
  name: "",
  enabled: true,
  conditions: [createDefaultScoringCondition()],
  action: createDefaultScoringAction(),
});

export const ScoringRulesEditor = ({
  value,
  onChange,
  error,
  ref,
}: ScoringRulesEditorProps) => {
  const { t } = useTranslation();
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const headingId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () =>
      containerRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus(),
  }));

  const form = useForm<ScoringRulesFormValues>({
    defaultValues: { scoringRules: value },
  });

  const notifyChange = useEffectEvent(onChange);

  useEffect(() => {
    if (!isEqual(form.getValues("scoringRules"), value)) {
      form.setValue("scoringRules", value);
    }
  }, [form, value]);

  useEffect(() => {
    const subscription = form.watch((_values, { name }) => {
      if (name) notifyChange(form.getValues("scoringRules"));
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const {
    control: scopedControl,
    register: scopedRegister,
    setValue: scopedSetValue,
  } = form;

  const { fields, append, remove, move } = useFieldArray({
    control: scopedControl,
    name: "scoringRules.rules",
  });

  const currentRules = useWatch({
    control: scopedControl,
    name: "scoringRules",
  });

  const applyRulebook = () => {
    const next = applyGroupRulebook(form.getValues("scoringRules"));

    form.setValue("scoringRules.hardCapPoints", next.hardCapPoints, {
      shouldDirty: true,
    });
    form.setValue("scoringRules.rules", next.rules, { shouldDirty: true });
  };

  return (
    <div ref={containerRef} className="grid gap-5">
      <ScoringGlobalSettings
        control={scopedControl}
        register={scopedRegister}
      />

      <section className="grid gap-3" aria-labelledby={`${headingId}-rules`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3
            id={`${headingId}-rules`}
            className="flex items-baseline gap-2 text-sm font-semibold"
          >
            {t("events.scoring.rules")}
            <span className="text-xs font-normal tabular-nums text-muted-foreground">
              {fields.length}
            </span>
          </h3>
          <div className="flex flex-wrap gap-2">
            <ScoringRuleTemplatesMenu
              onSelectTemplate={(rule) => append(rule)}
              onApplyGroupRulebook={applyRulebook}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSimulatorOpen(true)}
            >
              <FlaskConical className="size-4" />
              {t("events.scoring.simulator.buttonLabel")}
            </Button>
          </div>
        </div>

        <ScoringHowItWorks
          hardCapPoints={currentRules?.hardCapPoints ?? Number.NaN}
          minTrackingPercentForBonuses={
            currentRules?.minTrackingPercentForBonuses ?? Number.NaN
          }
        />

        <ol className="grid gap-2">
          {fields.map((field, ruleIndex) => (
            <li key={field.id}>
              <ScoringRuleCard
                control={scopedControl}
                register={scopedRegister}
                setValue={scopedSetValue}
                ruleIndex={ruleIndex}
                canRemove={fields.length > 1}
                onRemove={() => remove(ruleIndex)}
                onMoveUp={
                  ruleIndex > 0
                    ? () => move(ruleIndex, ruleIndex - 1)
                    : undefined
                }
                onMoveDown={
                  ruleIndex < fields.length - 1
                    ? () => move(ruleIndex, ruleIndex + 1)
                    : undefined
                }
              />
            </li>
          ))}
        </ol>

        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(defaultRule())}
          >
            <Plus className="size-4" />
            {t("events.scoring.addRule")}
          </Button>
        </div>
      </section>

      <input
        type="hidden"
        {...scopedRegister("scoringRules.version", { value: 1 })}
      />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      {currentRules && (
        <ScoringSimulatorDialog
          open={simulatorOpen}
          onOpenChange={setSimulatorOpen}
          scoringRules={currentRules}
        />
      )}
    </div>
  );
};
