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
import { cn } from "cn";
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
  },
  {
    value: "ADVANCED" as const,
    icon: Settings,
    titleKey: "events.scoring.modeAdvancedTitle",
    descKey: "events.scoring.modeAdvancedDescription",
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
      onValueChange={(nextValue) => onChange(nextValue)}
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
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-border bg-card opacity-70 hover:opacity-90",
              )}
            >
              <RadioGroupItem
                value={mode.value}
                aria-label={t(mode.titleKey)}
              />
              <div className="rounded-xl bg-primary/10 p-2">
                <Icon className="size-4 text-primary" />
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
