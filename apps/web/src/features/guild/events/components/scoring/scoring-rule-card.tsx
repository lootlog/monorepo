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
import { Badge } from "@lootlog/ui/components/badge";
import { Input } from "@lootlog/ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { ChevronDown, GripVertical, Trash2, Info } from "lucide-react";
import { cn } from "cn";
import type { EventScoringRules } from "@lootlog/domain/scoring";
import { ScoringRuleSummary } from "./scoring-rule-summary";
import { ScoringConditionsEditor } from "./scoring-conditions-editor";
import { ScoringActionEditor } from "./scoring-action-editor";

type ScoringRulesFormValues = {
  scoringRules: EventScoringRules;
};

interface ScoringRuleCardProps {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  setValue: UseFormSetValue<ScoringRulesFormValues>;
  ruleIndex: number;
  canRemove: boolean;
  onRemove: () => void;
  defaultOpen?: boolean;
}

export const ScoringRuleCard = ({
  control,
  register,
  setValue,
  ruleIndex,
  canRemove,
  onRemove,
  defaultOpen = false,
}: ScoringRuleCardProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);

  const rule = useWatch({
    control,
    name: `scoringRules.rules.${ruleIndex}`,
  });

  const isEnabled = rule?.enabled !== false;
  const conditionCount = rule?.conditions?.length ?? 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "rounded-lg border bg-background transition-all overflow-hidden",
          !isEnabled && "opacity-40",
          open && "ring-1 ring-border/80",
        )}
      >
        {/* Collapsed header / trigger */}
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2.5 p-3 text-left transition-colors cursor-pointer",
                "hover:bg-muted/30",
              )}
            >
              <GripVertical className="size-3.5 text-muted-foreground/40 shrink-0" />

              <span className="flex items-center justify-center size-5 rounded-md bg-muted/60 text-[10px] font-mono font-bold text-muted-foreground shrink-0">
                {ruleIndex + 1}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {rule?.name || t("events.scoring.unnamedRule")}
                  </p>
                  {!open && conditionCount > 1 && (
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">
                      {conditionCount}{" "}
                      {t("events.scoring.conditionsCount", "war.")}
                    </span>
                  )}
                </div>
                {!open && rule && (
                  <div className="mt-0.5">
                    <ScoringRuleSummary rule={rule} />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!isEnabled && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {t("events.scoring.ruleDisabledSuffix")}
                  </Badge>
                )}
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform duration-200",
                    open && "rotate-180",
                  )}
                />
              </div>
            </button>
          }
        />

        {/* Expanded editor */}
        <CollapsibleContent keepMounted className={cn(!open && "hidden")}>
          <div className="border-t border-border/60">
            {/* Rule name & enabled toggle */}
            <div className="px-3 pt-3 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Input
                    {...register(`scoringRules.rules.${ruleIndex}.name`)}
                    placeholder={t("events.scoring.ruleName")}
                    className="h-8 text-sm bg-muted/30 border-border/40"
                  />
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 pl-0.5">
                    {t("events.scoring.ruleNameHint")}
                  </p>
                </div>
                <Controller
                  control={control}
                  name={`scoringRules.rules.${ruleIndex}.enabled`}
                  render={({ field }) => (
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer shrink-0">
                      <Switch
                        checked={field.value !== false}
                        onCheckedChange={field.onChange}
                      />
                      {t("events.scoring.ruleEnabled")}
                    </label>
                  )}
                />
              </div>
            </div>

            <input
              type="hidden"
              {...register(`scoringRules.rules.${ruleIndex}.id`)}
            />

            {/* IF section — blue accent */}
            <div className="mx-3 mb-2 rounded-lg border border-blue-500/15 bg-blue-500/[0.03] overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-blue-500/10 bg-blue-500/[0.04]">
                <div className="size-1.5 rounded-full bg-blue-500/60" />
                <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-blue-400">
                  {t("events.scoring.ifLabel")}
                </span>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Info className="size-3 text-blue-400/50 cursor-help" />
                    }
                  />
                  <TooltipContent>
                    <p>{t("events.scoring.conditionAndHint")}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="p-2.5">
                <ScoringConditionsEditor
                  control={control}
                  register={register}
                  setValue={setValue}
                  ruleIndex={ruleIndex}
                />
              </div>
            </div>

            {/* Flow connector */}
            <div className="flex justify-center -my-0.5 relative z-10">
              <div className="flex flex-col items-center">
                <div className="w-px h-2 bg-gradient-to-b from-blue-500/20 to-green-500/20" />
                <div className="size-4 rounded-full border border-border/60 bg-background flex items-center justify-center">
                  <div className="size-1.5 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="w-px h-2 bg-gradient-to-b from-green-500/20 to-green-500/30" />
              </div>
            </div>

            {/* THEN section — green accent */}
            <div className="mx-3 mt-0 mb-2 rounded-lg border border-green-500/15 bg-green-500/[0.03] overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-green-500/10 bg-green-500/[0.04]">
                <div className="size-1.5 rounded-full bg-green-500/60" />
                <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-green-400">
                  {t("events.scoring.thenLabel")}
                </span>
              </div>
              <div className="p-2.5">
                <ScoringActionEditor
                  control={control}
                  register={register}
                  ruleIndex={ruleIndex}
                />
              </div>
            </div>

            {canRemove && (
              <div className="flex justify-end px-3 py-4">
                <button
                  type="button"
                  onClick={onRemove}
                  className="flex items-center gap-1 text-[11px] text-destructive/70 hover:text-destructive cursor-pointer transition-colors"
                >
                  <Trash2 className="size-4" />
                  {t("events.scoring.deleteRule")}
                </button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
