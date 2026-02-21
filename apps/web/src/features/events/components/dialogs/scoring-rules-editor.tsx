import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Plus, Trash2 } from "lucide-react";
import {
  useFieldArray,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import type { TFunction } from "i18next";

interface ScoringRulesEditorProps {
  control: Control<any>;
  register: UseFormRegister<any>;
  t: TFunction;
}

export const ScoringRulesEditor = ({
  control,
  register,
  t,
}: ScoringRulesEditorProps) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "scoringRules.baseThresholds",
  });

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-3">
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("events.scoring.baseThresholdsLabel", "Progi podstawy")}
        </Label>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                {...register(
                  `scoringRules.baseThresholds.${index}.percentage` as const,
                  {
                    valueAsNumber: true,
                  },
                )}
                placeholder={t("events.scoring.thresholdPercentage", "Procent")}
                className="h-9 text-sm"
              />
              <Input
                type="number"
                min={0}
                step={0.01}
                {...register(
                  `scoringRules.baseThresholds.${index}.points` as const,
                  {
                    valueAsNumber: true,
                  },
                )}
                placeholder={t("events.scoring.thresholdPoints", "Punkty")}
                className="h-9 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => remove(index)}
                disabled={fields.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => append({ percentage: 0, points: 0 })}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t("events.scoring.addThreshold", "Dodaj próg")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t("events.scoring.leaveGraceMinutes", "Zasada zejścia (min)")}
          </Label>
          <Input
            type="number"
            min={0}
            {...register("scoringRules.leaveGraceMinutes", {
              valueAsNumber: true,
            })}
            className="h-9 text-sm"
          />
        </div>
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
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("events.scoring.groupBonusTitle", "Bonus: mała grupa")}
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Input
            type="number"
            min={0}
            {...register("scoringRules.groupBonus.minAssignedMembers", {
              valueAsNumber: true,
            })}
            placeholder={t("events.scoring.minMembers", "Min osób")}
            className="h-9 text-sm"
          />
          <Input
            type="number"
            min={0}
            {...register("scoringRules.groupBonus.maxAssignedMembers", {
              valueAsNumber: true,
            })}
            placeholder={t("events.scoring.maxMembers", "Max osób")}
            className="h-9 text-sm"
          />
          <Input
            type="number"
            min={0}
            step={0.01}
            {...register("scoringRules.groupBonus.points", {
              valueAsNumber: true,
            })}
            placeholder={t("events.scoring.bonusPoints", "Bonus pkt")}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("events.scoring.nightBonusTitle", "Bonus: nocna warta")}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="time"
            {...register("scoringRules.nightBonus.windowStart")}
            className="h-9 text-sm"
          />
          <Input
            type="time"
            {...register("scoringRules.nightBonus.windowEnd")}
            className="h-9 text-sm"
          />
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            {...register("scoringRules.nightBonus.requiredCoveragePercentage", {
              valueAsNumber: true,
            })}
            placeholder={t(
              "events.scoring.requiredCoverage",
              "Wymagane pokrycie %",
            )}
            className="h-9 text-sm"
          />
          <Input
            type="number"
            min={0}
            step={0.01}
            {...register("scoringRules.nightBonus.points", {
              valueAsNumber: true,
            })}
            placeholder={t("events.scoring.bonusPoints", "Bonus pkt")}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("events.scoring.pvpBonusTitle", "Bonus: żółta mapa / PvP")}
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Input
            type="time"
            {...register("scoringRules.pvpBonus.windowStart")}
            className="h-9 text-sm"
          />
          <Input
            type="time"
            {...register("scoringRules.pvpBonus.windowEnd")}
            className="h-9 text-sm"
          />
          <Input
            type="number"
            min={0}
            step={0.01}
            {...register("scoringRules.pvpBonus.points", {
              valueAsNumber: true,
            })}
            placeholder={t("events.scoring.bonusPoints", "Bonus pkt")}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t(
          "events.scoring.timezoneFixedHint",
          "Strefa czasowa dla bonusów godzinowych: Europe/Warsaw",
        )}
      </p>
      <input type="hidden" {...register("scoringRules.timezone")} />
    </div>
  );
};
