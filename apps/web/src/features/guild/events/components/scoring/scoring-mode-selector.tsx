import { useTranslation } from "react-i18next";
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
          title: t("events.scoring.modeSimpleTitle"),
          description: t("events.scoring.modeSimpleDescription"),
        },
        {
          value: "ADVANCED",
          title: t("events.scoring.modeAdvancedTitle"),
          description: t("events.scoring.modeAdvancedDescription"),
        },
      ]}
    />
  );
};
