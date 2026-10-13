import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Label } from "@lootlog/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { Award, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

type MoreFiltersPopoverProps = {
  /** Delay before a typed level bound is committed. */
  levelDebounceMs?: number;
  maxLevel?: number;
  minLevel?: number;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  /** Omit to offer only the level range. */
  onPhChange?: (ph: boolean) => void;
  ph?: boolean;
  phCheckboxId?: string;
  showPhFilter?: boolean;
};

export const MoreFiltersPopover = ({
  levelDebounceMs,
  maxLevel,
  minLevel,
  onMaxLevelChange,
  onMinLevelChange,
  onPhChange,
  ph,
  phCheckboxId,
  showPhFilter: showPhFilterProp = true,
}: MoreFiltersPopoverProps) => {
  const { t } = useTranslation();
  const showPhFilter = showPhFilterProp && onPhChange !== undefined;

  const extraFiltersCount =
    ((minLevel ?? 1) !== 1 || (maxLevel ?? 500) !== 500 ? 1 : 0) +
    (showPhFilter && ph ? 1 : 0);

  let moreLabel = t("battlePanel.filters.more");

  if (extraFiltersCount > 0) {
    moreLabel = t("battlePanel.filters.moreWithCount", {
      count: extraFiltersCount,
    });
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" size="lg" className="gap-2">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {moreLabel}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-[300px] p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">
              {t("battlePanel.filters.levelRange")}
            </Label>
            <LevelRangeFilter
              debounceMs={levelDebounceMs}
              minLevel={minLevel}
              maxLevel={maxLevel}
              onMinLevelChange={onMinLevelChange}
              onMaxLevelChange={onMaxLevelChange}
            />
          </div>
          {showPhFilter && (
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background p-3">
              <div className="flex items-center gap-2">
                <Award className="size-4" aria-hidden="true" />
                <Label htmlFor={phCheckboxId} className="cursor-pointer">
                  {t("battlePanel.filters.honorPoints")}
                </Label>
              </div>
              <Checkbox
                id={phCheckboxId}
                checked={ph === true}
                onCheckedChange={(checked) => onPhChange?.(checked === true)}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
