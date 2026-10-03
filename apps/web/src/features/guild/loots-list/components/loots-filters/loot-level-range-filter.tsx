import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { Label } from "@lootlog/ui/components/label";
import { useTranslation } from "react-i18next";
import { toLevelFilterValue } from "./use-loot-filters-sidebar";

type LootLevelRangeFilterProps = {
  min: number | undefined;
  max: number | undefined;
  onChange: (range: { min?: string; max?: string }) => void;
};

export const LootLevelRangeFilter = ({
  min,
  max,
  onChange,
}: LootLevelRangeFilterProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">
        {t("loots.filtersPanel.common.levelRange")}
      </Label>
      <LevelRangeFilter
        size="sm"
        minLevel={min}
        maxLevel={max}
        onMinLevelChange={(value) =>
          onChange({ min: toLevelFilterValue(value) })
        }
        onMaxLevelChange={(value) =>
          onChange({ max: toLevelFilterValue(value) })
        }
      />
    </div>
  );
};
