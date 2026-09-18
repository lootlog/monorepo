import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { useTranslation } from "react-i18next";

type BattlePanelLevelRangeProps = {
  maxLevel?: number;
  minLevel?: number;
  onMaxLevelChange: (value: number | undefined) => void;
  onMinLevelChange: (value: number | undefined) => void;
};

export const BattlePanelLevelRange = ({
  maxLevel,
  minLevel,
  onMaxLevelChange,
  onMinLevelChange,
}: BattlePanelLevelRangeProps) => {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t("battlePanel.filters.levelRange")}
      className="flex w-full min-w-0 items-center gap-2 md:w-auto"
    >
      <LevelRangeFilter
        minLevel={minLevel}
        maxLevel={maxLevel}
        onMinLevelChange={onMinLevelChange}
        onMaxLevelChange={onMaxLevelChange}
        minLevelPlaceholder={t("battlePanel.filters.minPlaceholder")}
        maxLevelPlaceholder={t("battlePanel.filters.maxPlaceholder")}
        containerClassName="min-w-0 flex-1 md:flex-none"
        inputClassName="w-full md:w-[72px]"
        separator={
          <span className="text-xs text-muted-foreground" aria-hidden="true">
            –
          </span>
        }
      />
    </div>
  );
};
