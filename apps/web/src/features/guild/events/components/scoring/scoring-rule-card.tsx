import { Button } from "@lootlog/ui/components/button";
import { useState } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { Switch } from "@lootlog/ui/components/switch";
import { Input } from "@lootlog/ui/components/input";
import { ArrowDown, ArrowUp, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "cn";
import { ScoringActionBadge } from "./scoring-action-badge";
import { ScoringRuleSummary } from "./scoring-rule-summary";
import { ScoringConditionsEditor } from "./scoring-conditions-editor";
import { ScoringActionEditor } from "./scoring-action-editor";
import { ScoringField } from "./scoring-field";

import type { ScoringRulesFormValues } from "./scoring-rules-editor";

interface ScoringRuleCardProps {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  setValue: UseFormSetValue<ScoringRulesFormValues>;
  ruleIndex: number;
  canRemove: boolean;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  defaultOpen?: boolean;
}

export const ScoringRuleCard = ({
  control,
  register,
  setValue,
  ruleIndex,
  canRemove,
  onRemove,
  onMoveUp,
  onMoveDown,
  defaultOpen = false,
}: ScoringRuleCardProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);

  const rule = useWatch({
    control,
    name: `scoringRules.rules.${ruleIndex}`,
  });

  const isEnabled = rule?.enabled !== false;
  const ruleNumber = ruleIndex + 1;
  const ruleName = rule?.name || t("events.scoring.unnamedRule");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card transition-colors",
          open && "border-input",
        )}
      >
        <div className="flex items-stretch">
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 p-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums text-muted-foreground",
                    !isEnabled && "opacity-50",
                  )}
                >
                  {ruleNumber}
                </span>

                <span
                  className={cn(
                    "grid min-w-0 flex-1 gap-0.5",
                    !isEnabled && "opacity-60",
                  )}
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-medium">
                      {ruleName}
                    </span>
                    {rule?.action ? (
                      <ScoringActionBadge
                        action={rule.action}
                        muted={!isEnabled}
                      />
                    ) : null}
                    {!isEnabled && (
                      <span className="text-xs text-muted-foreground">
                        {t("events.scoring.ruleDisabled")}
                      </span>
                    )}
                  </span>
                  {rule && <ScoringRuleSummary rule={rule} />}
                </span>

                <ChevronDown
                  aria-hidden
                  className={cn(
                    "mt-1 size-4 shrink-0 text-muted-foreground transition-[rotate] duration-200 ease-emphasized motion-reduce:transition-none",
                    open && "rotate-180",
                  )}
                />
              </button>
            }
          />

          <div className="flex shrink-0 flex-col justify-center border-l border-border/60 px-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              disabled={!onMoveUp}
              onClick={onMoveUp}
              aria-label={t("events.scoring.moveRuleUp", { rule: ruleNumber })}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              disabled={!onMoveDown}
              onClick={onMoveDown}
              aria-label={t("events.scoring.moveRuleDown", {
                rule: ruleNumber,
              })}
            >
              <ArrowDown className="size-3.5" />
            </Button>
          </div>
        </div>

        <CollapsibleContent keepMounted className={cn(!open && "hidden")}>
          <div className="grid gap-4 border-t border-border p-3 sm:p-4">
            <div className="flex flex-wrap items-end gap-3">
              <ScoringField
                label={t("events.scoring.ruleName")}
                htmlFor={`rule-${ruleIndex}-name`}
                hint={t("events.scoring.ruleNameHint")}
                className="min-w-48 flex-1"
              >
                <Input
                  id={`rule-${ruleIndex}-name`}
                  {...register(`scoringRules.rules.${ruleIndex}.name`)}
                  placeholder={t("events.scoring.unnamedRule")}
                />
              </ScoringField>
              <Controller
                control={control}
                name={`scoringRules.rules.${ruleIndex}.enabled`}
                render={({ field }) => (
                  <label className="mb-6 flex shrink-0 cursor-pointer items-center gap-2 text-sm">
                    <Switch
                      checked={field.value !== false}
                      onCheckedChange={field.onChange}
                    />
                    {t("events.scoring.ruleEnabled")}
                  </label>
                )}
              />
            </div>

            <input
              type="hidden"
              {...register(`scoringRules.rules.${ruleIndex}.id`)}
            />

            <section className="grid gap-2">
              <h4 className="text-sm font-semibold">
                {t("events.scoring.ifLabel")}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {t("events.scoring.conditionAndHint")}
                </span>
              </h4>
              <ScoringConditionsEditor
                control={control}
                register={register}
                setValue={setValue}
                ruleIndex={ruleIndex}
              />
            </section>

            <section className="grid gap-2">
              <h4 className="text-sm font-semibold">
                {t("events.scoring.thenLabel")}
              </h4>
              <ScoringActionEditor
                control={control}
                register={register}
                ruleIndex={ruleIndex}
              />
            </section>

            {canRemove && (
              <div className="flex justify-end border-t border-border pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={onRemove}
                >
                  <Trash2 className="size-4" />
                  {t("events.scoring.deleteRule")}
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
