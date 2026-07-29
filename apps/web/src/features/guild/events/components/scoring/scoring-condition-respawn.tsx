import {
  Controller,
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
import { ArrowRight } from "lucide-react";
import { EVENT_SCORING_NUMERIC_OPERATORS } from "@lootlog/scoring";

type ScoringRulesFormValues = {
  scoringRules: { rules: { conditions: unknown[] }[] };
};

interface ScoringConditionRespawnProps {
  control: Control<ScoringRulesFormValues>;
  register: UseFormRegister<ScoringRulesFormValues>;
  ruleIndex: number;
  conditionIndex: number;
}

export const ScoringConditionRespawn = ({
  control,
  register,
  ruleIndex,
  conditionIndex,
}: ScoringConditionRespawnProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      {/* Time range row */}
      <div className="flex items-end gap-1.5">
        <div className="space-y-0.5 flex-1">
          <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
            {t("events.scoring.conditionLabel.from")}
          </Label>
          <Input
            type="time"
            className="h-8 text-[12px] font-mono"
            {...register(
              `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.from` as `scoringRules.rules.${number}.conditions.${number}`,
            )}
          />
        </div>
        <ArrowRight className="size-3.5 text-muted-foreground/30 mb-2 shrink-0" />
        <div className="space-y-0.5 flex-1">
          <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
            {t("events.scoring.conditionLabel.to")}
          </Label>
          <Input
            type="time"
            className="h-8 text-[12px] font-mono"
            {...register(
              `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.to` as `scoringRules.rules.${number}.conditions.${number}`,
            )}
          />
        </div>
      </div>
      {/* Coverage threshold row */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="space-y-0.5">
          <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
            {t("events.scoring.conditionLabel.coverage")}
          </Label>
          <Controller
            control={control}
            name={
              `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.operator` as `scoringRules.rules.${number}.conditions.${number}`
            }
            render={({ field }) => (
              <Select
                value={field.value as string}
                onValueChange={field.onChange}
              >
                <SelectTrigger size="sm" className="h-8 text-[12px] font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_SCORING_NUMERIC_OPERATORS.map((operator) => (
                    <SelectItem
                      key={operator}
                      value={operator}
                      className="font-mono"
                    >
                      {operator}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">
            {t("events.scoring.conditionLabel.value")}
          </Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              className="h-8 text-[12px] font-mono"
              {...register(
                `scoringRules.rules.${ruleIndex}.conditions.${conditionIndex}.value` as `scoringRules.rules.${number}.conditions.${number}`,
                { valueAsNumber: true },
              )}
            />
            <span className="text-[11px] text-muted-foreground/50 shrink-0 font-mono">
              %
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
