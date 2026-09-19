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
  maxLevel?: number;
  minLevel?: number;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onPhChange: (ph: boolean) => void;
  ph?: boolean;
  phCheckboxId: string;
  showPhFilter?: boolean;
};

export const MoreFiltersPopover = ({
  maxLevel,
  minLevel,
  onMaxLevelChange,
  onMinLevelChange,
  onPhChange,
  ph,
  phCheckboxId,
  showPhFilter = true,
}: MoreFiltersPopoverProps) => {
  const { t } = useTranslation();

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
          <Button type="button" variant="outline" className="h-10 gap-2">
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
            <div className="flex items-center gap-2">
              <LevelRangeFilter
                minLevel={minLevel}
                maxLevel={maxLevel}
                onMinLevelChange={onMinLevelChange}
                onMaxLevelChange={onMaxLevelChange}
                inputClassName="w-full"
                containerClassName="flex-1"
                separator={
                  <span className="text-xs text-muted-foreground">-</span>
                }
              />
            </div>
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
                onCheckedChange={(checked) => onPhChange(checked === true)}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
