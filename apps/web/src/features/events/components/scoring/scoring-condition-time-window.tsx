import type { UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { ArrowRight } from "lucide-react";

type ScoringRulesFormValues = {
  scoringRules: { rules: { conditions: unknown[] }[] };
};

interface ScoringConditionTimeWindowProps {
  register: UseFormRegister<ScoringRulesFormValues>;
  ruleIndex: number;
  conditionIndex: number;
}

export const ScoringConditionTimeWindow = ({
  register,
  ruleIndex,
  conditionIndex,
}: ScoringConditionTimeWindowProps) => {
  const { t } = useTranslation();

  return (
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
  );
};
