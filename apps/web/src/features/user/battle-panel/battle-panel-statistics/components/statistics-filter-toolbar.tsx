import { MoreFiltersPopover } from "@/components/filters/more-filters-popover";
import { PeriodSelector } from "@/components/filters/period-selector";
import { Period } from "@lootlog/schema/http-scalars";
import { useId } from "react";

export type StatisticsFiltersProps = {
  period: Period;
  onPeriodChange: (period: Period) => void;
  minLevel?: number;
  maxLevel?: number;
  onMinLevelChange: (minLevel: number | undefined) => void;
  onMaxLevelChange: (maxLevel: number | undefined) => void;
  ph?: boolean;
  onPhChange?: (ph: boolean) => void;
};

export const StatisticsFilterToolbar = ({
  period,
  onPeriodChange,
  minLevel,
  maxLevel,
  onMinLevelChange,
  onMaxLevelChange,
  ph,
  onPhChange,
}: StatisticsFiltersProps) => {
  const phCheckboxId = useId();

  return (
    <>
      <PeriodSelector
        options={Period.literals}
        value={period}
        onValueChange={onPeriodChange}
        width="w-[170px]"
        active={period !== "30d"}
      />
      <MoreFiltersPopover
        minLevel={minLevel}
        maxLevel={maxLevel}
        onMinLevelChange={onMinLevelChange}
        onMaxLevelChange={onMaxLevelChange}
        ph={ph}
        onPhChange={onPhChange}
        phCheckboxId={phCheckboxId}
      />
    </>
  );
};
