import {
  useFieldArray,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { Plus } from "lucide-react";
import { createDefaultScoringCondition } from "../../utils/scoring-condition-defaults";
import { ConditionRow } from "./condition-row";

import type { ScoringRulesFormValues } from "./scoring-rules-editor";

interface ScoringConditionsEditorProps {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  setValue: UseFormSetValue<ScoringRulesFormValues>;
  ruleIndex: number;
}

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
