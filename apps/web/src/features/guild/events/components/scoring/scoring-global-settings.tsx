import type { UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Shield, Percent, Globe, HelpCircle } from "lucide-react";
import type { EventScoringRules } from "@lootlog/types";

type ScoringRulesFormValues = {
  scoringRules: EventScoringRules;
};

interface ScoringGlobalSettingsProps {
  register: UseFormRegister<ScoringRulesFormValues>;
}

export const ScoringGlobalSettings = ({
  register,
}: ScoringGlobalSettingsProps) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Shield className="size-3 text-muted-foreground/50" />
          <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("events.scoring.hardCapPoints")}
          </Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="size-3 text-muted-foreground/30 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {t("events.scoring.summary.cap", { points: "X" })}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          type="number"
          min={0}
          step={0.01}
          {...register("scoringRules.hardCapPoints", {
            valueAsNumber: true,
          })}
          className="h-8 text-sm font-mono"
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Percent className="size-3 text-muted-foreground/50" />
          <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("events.scoring.minTrackingPercentForBonuses")}
          </Label>
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            {...register("scoringRules.minTrackingPercentForBonuses", {
              valueAsNumber: true,
            })}
            className="h-8 text-sm font-mono"
          />
          <span className="text-[11px] text-muted-foreground/50 shrink-0 font-mono">
            %
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Globe className="size-3 text-muted-foreground/50" />
          <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("events.scoring.timezoneLabel")}
          </Label>
        </div>
        <Input
          {...register("scoringRules.timezone")}
          className="h-8 text-sm"
          placeholder="Europe/Warsaw"
        />
      </div>
    </div>
  );
};
