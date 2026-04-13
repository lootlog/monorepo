import { useTranslation } from "react-i18next";
import { Card } from "@lootlog/ui/components/card";
import { Zap, Settings } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import type { EventScoringMode } from "@lootlog/types";

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
    shadowColor: "shadow-blue-500/10",
    activeRing: "ring-blue-500/30 border-blue-500",
  },
  {
    value: "ADVANCED" as const,
    icon: Settings,
    titleKey: "events.scoring.modeAdvancedTitle",
    descKey: "events.scoring.modeAdvancedDescription",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    shadowColor: "shadow-amber-500/10",
    activeRing: "ring-amber-500/30 border-amber-500",
  },
];

export const ScoringModeSelector = ({
  value,
  onChange,
}: ScoringModeSelectorProps) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {modes.map((mode) => {
        const isActive = value === mode.value;
        const Icon = mode.icon;
        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className="text-left"
          >
            <Card
              className={cn(
                "p-3 transition-all cursor-pointer",
                isActive
                  ? `ring-1 ${mode.activeRing} bg-card/60`
                  : "border-border bg-card/40 opacity-70 hover:opacity-90",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "rounded-xl p-2 shadow-inner",
                    mode.bgColor,
                    mode.shadowColor,
                  )}
                >
                  <Icon className={cn("size-4", mode.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t(mode.titleKey)}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {t(mode.descKey)}
                  </p>
                </div>
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
};
