import { LevelRangeFilter, PeriodSelector } from "@/components/filters";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import { Button } from "@lootlog/ui/components/button";
import { Label } from "@lootlog/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { ArrowRight, Filter, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

type PlayerVsPlayerFilterToolbarProps = {
  isMobile: boolean;
  maxLevel?: number;
  minLevel?: number;
  onMaxLevelChange: (value: number | undefined) => void;
  onMinLevelChange: (value: number | undefined) => void;
  onMobileFiltersOpen: () => void;
  onPeriodChange: (period: Period) => void;
  period: Period;
};

export const PlayerVsPlayerFilterToolbar = ({
  isMobile,
  maxLevel,
  minLevel,
  onMaxLevelChange,
  onMinLevelChange,
  onMobileFiltersOpen,
  onPeriodChange,
  period,
}: PlayerVsPlayerFilterToolbarProps) => {
  const { t } = useTranslation();
  const isLevelFiltered = (minLevel ?? 1) !== 1 || (maxLevel ?? 500) !== 500;
  const extraFiltersCount = isLevelFiltered ? 1 : 0;
  let moreLabel = t("battlePanel.filters.more");

  if (extraFiltersCount > 0) {
    moreLabel = t("battlePanel.filters.moreWithCount", {
      count: extraFiltersCount,
    });
  }

  if (isMobile) {
    return (
      <div className="flex min-w-0 items-center justify-between gap-2">
        <PeriodSelector
          value={period}
          onValueChange={onPeriodChange}
          width="w-full"
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2"
          onClick={onMobileFiltersOpen}
        >
          <Filter className="size-4" aria-hidden="true" />
          {t("battlePanel.filters.title")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <PeriodSelector
        value={period}
        onValueChange={onPeriodChange}
        width="w-[190px]"
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="h-10 gap-2">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {moreLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[300px] p-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              {t("battlePanel.filters.levelRange")}
            </Label>
            <div className="flex items-center gap-2">
              <LevelRangeFilter
                minLevel={minLevel}
                maxLevel={maxLevel}
                onMinLevelChange={onMinLevelChange}
                onMaxLevelChange={onMaxLevelChange}
                inputClassName="w-full"
                containerClassName="flex-1"
                separator={
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                }
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
