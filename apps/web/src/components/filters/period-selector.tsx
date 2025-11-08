import { Calendar } from "lucide-react";
import {
  FilterPopover,
  type FilterPopoverOption,
} from "@lootlog/ui/components/filter-popover";
import type { Period } from "@/store/battle-filters.store";

type PeriodOption = {
  value: Period;
  label: string;
};

const ALL_PERIODS: PeriodOption[] = [
  { value: "24h", label: "Ostatnie 24 godziny" },
  { value: "3d", label: "Ostatnie 3 dni" },
  { value: "7d", label: "Ostatni tydzień" },
  { value: "14d", label: "Ostatnie 2 tygodnie" },
  { value: "30d", label: "Ostatni miesiąc" },
  { value: "90d", label: "Ostatnie 3 miesiące" },
  { value: "180d", label: "Ostatnie pół roku" },
  { value: "all", label: "Wszystko" },
];

interface PeriodSelectorProps {
  value: Period;
  onValueChange: (period: Period) => void;
  excludePeriods?: Period[];
  placeholder?: string;
  width?: string;
  className?: string;
}

export function PeriodSelector({
  value,
  onValueChange,
  excludePeriods = [],
  placeholder = "Okres",
  width = "w-[200px]",
  className,
}: PeriodSelectorProps) {
  const availablePeriods = ALL_PERIODS.filter(
    (period) => !excludePeriods.includes(period.value),
  );

  const options: FilterPopoverOption<Period>[] = availablePeriods.map(
    (period) => ({
      value: period.value,
      label: period.label,
    }),
  );

  return (
    <FilterPopover
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      icon={Calendar}
      width={width}
      triggerClassName={className}
      showSearch={false}
    />
  );
}
