import { useState } from "react";
import {
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { Label } from "@lootlog/ui/components/label";
import { Separator } from "@lootlog/ui/components/separator";
import { Plus, ListChecks, FlaskConical } from "lucide-react";
import type { EventScoringRules } from "../../types/scoring-rules";
import {
  createDefaultScoringAction,
  createDefaultScoringCondition,
} from "../../utils/scoring-condition-defaults";
import { ScoringGlobalSettings } from "./scoring-global-settings";
import { ScoringRuleCard } from "./scoring-rule-card";
import { ScoringRuleTemplatesMenu } from "./scoring-rule-templates-menu";
import { ScoringSimulatorDialog } from "./scoring-simulator-dialog";

type ScoringRulesFormValues = {
  scoringRules: EventScoringRules;
};

interface ScoringRulesEditorProps<TFieldValues extends ScoringRulesFormValues> {
  control: Control<TFieldValues>;
  register: UseFormRegister<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
}

const makeRuleId = () =>
  `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const defaultRule = () => ({
  id: makeRuleId(),
  name: "",
  enabled: true,
  conditions: [createDefaultScoringCondition()],
  action: createDefaultScoringAction(),
});

export const ScoringRulesEditor = <
  TFieldValues extends ScoringRulesFormValues,
>({
  control,
  register,
  setValue,
}: ScoringRulesEditorProps<TFieldValues>) => {
  const { t } = useTranslation();
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const scopedControl = control as unknown as Control<ScoringRulesFormValues>;
  const scopedRegister =
    register as unknown as UseFormRegister<ScoringRulesFormValues>;
  const scopedSetValue =
    setValue as unknown as UseFormSetValue<ScoringRulesFormValues>;

  const { fields, append, remove } = useFieldArray({
    control: scopedControl,
    name: "scoringRules.rules",
  });

  const currentRules = useWatch({
    control: scopedControl,
    name: "scoringRules",
  });

  return (
    <div className="space-y-4 rounded-lg">
      <ScoringGlobalSettings register={scopedRegister} />

      <Separator className="opacity-50" />

      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5">
          <ListChecks className="size-3.5 text-muted-foreground/50" />
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("events.scoring.rules")}
          </Label>
          <span className="text-[10px] text-muted-foreground/40 font-mono ml-1">
            ({fields.length})
          </span>
        </div>

        {fields.map((field, ruleIndex) => (
          <ScoringRuleCard
            key={field.id}
            control={scopedControl}
            register={scopedRegister}
            setValue={scopedSetValue}
            ruleIndex={ruleIndex}
            canRemove={fields.length > 1}
            onRemove={() => remove(ruleIndex)}
          />
        ))}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => append(defaultRule())}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("events.scoring.addRule")}
          </Button>
          <ScoringRuleTemplatesMenu onSelectTemplate={(rule) => append(rule)} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setSimulatorOpen(true)}
          >
            <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
            {t("events.scoring.simulator.buttonLabel")}
          </Button>
        </div>
      </div>

      <input
        type="hidden"
        {...scopedRegister("scoringRules.version", { value: 1 })}
      />

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
