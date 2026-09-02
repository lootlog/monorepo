import { useTranslation } from "react-i18next";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@lootlog/ui/components/field";
import { RadioGroup, RadioGroupItem } from "@lootlog/ui/components/radio-group";
import { Zap, Settings } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import type { EventScoringMode } from "@lootlog/domain/scoring";

interface ScoringModeSelectorProps {
  value: EventScoringMode;
  onChange: (mode: EventScoringMode) => void;
}

const modes = [
  {
    value: "SIMPLE" as const,
    icon: Zap,
    titleKey: "events.scoring.modeSimpleTitle",
    descKey: "events.scoring.modeSimpleDescription",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    activeRing: "ring-blue-500/30 border-blue-500",
  },
  {
    value: "ADVANCED" as const,
    icon: Settings,
    titleKey: "events.scoring.modeAdvancedTitle",
    descKey: "events.scoring.modeAdvancedDescription",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    activeRing: "ring-amber-500/30 border-amber-500",
  },
];

export const ScoringModeSelector = ({
  value,
  onChange,
}: ScoringModeSelectorProps) => {
  const { t } = useTranslation();

  return (
    <RadioGroup
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as EventScoringMode)}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {modes.map((mode) => {
        const isActive = value === mode.value;
        const Icon = mode.icon;
        return (
          <FieldLabel key={mode.value} className="cursor-pointer">
            <Field
              orientation="horizontal"
              className={cn(
                "items-center rounded-lg border bg-card p-3 transition-all",
                isActive
                  ? `ring-1 ${mode.activeRing}`
                  : "border-border bg-card opacity-70 hover:opacity-90",
              )}
            >
              <RadioGroupItem
                value={mode.value}
                aria-label={t(mode.titleKey)}
              />
              <div className={cn("rounded-xl p-2", mode.bgColor)}>
                <Icon className={cn("size-4", mode.color)} />
              </div>
              <FieldContent>
                <FieldTitle>{t(mode.titleKey)}</FieldTitle>
                <FieldDescription className="text-xs leading-tight">
                  {t(mode.descKey)}
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
        );
      })}
    </RadioGroup>
  );
};
