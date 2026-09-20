import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { Label } from "@lootlog/ui/components/label";
import { ArrowRight } from "lucide-react";
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
      <div className="flex items-center gap-2">
        <LevelRangeFilter
          minLevel={min}
          maxLevel={max}
          onMinLevelChange={(value) =>
            onChange({ min: toLevelFilterValue(value) })
          }
          onMaxLevelChange={(value) =>
            onChange({ max: toLevelFilterValue(value) })
          }
          minLevelPlaceholder={t("loots.filtersPanel.common.minLevel")}
          maxLevelPlaceholder={t("loots.filtersPanel.common.maxLevel")}
          inputClassName="h-9 w-full"
          containerClassName="min-w-0 flex-1"
          separator=<ArrowRight
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        />
      </div>
    </div>
  );
};
