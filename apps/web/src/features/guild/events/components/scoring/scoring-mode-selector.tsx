import { useTranslation } from "react-i18next";
import { Zap, Settings } from "lucide-react";
import type { EventScoringMode } from "@lootlog/domain/scoring";
import { OptionCardGroup } from "@/components/common/option-card-group";

interface ScoringModeSelectorProps {
  value: EventScoringMode;
  onChange: (mode: EventScoringMode) => void;
  "aria-labelledby"?: string;
}

export const ScoringModeSelector = ({
  value,
  onChange,
  "aria-labelledby": ariaLabelledBy,
}: ScoringModeSelectorProps) => {
  const { t } = useTranslation();

  return (
    <OptionCardGroup
      aria-labelledby={ariaLabelledBy}
      value={value}
      onChange={onChange}
      options={[
        {
          value: "SIMPLE",
          icon: Zap,
          title: t("events.scoring.modeSimpleTitle"),
          description: t("events.scoring.modeSimpleDescription"),
          iconClassName: "text-blue-500",
          iconBackgroundClassName: "bg-blue-500/10",
        },
        {
          value: "ADVANCED",
          icon: Settings,
          title: t("events.scoring.modeAdvancedTitle"),
          description: t("events.scoring.modeAdvancedDescription"),
          iconClassName: "text-amber-500",
          iconBackgroundClassName: "bg-amber-500/10",
        },
      ]}
    />
  );
};
