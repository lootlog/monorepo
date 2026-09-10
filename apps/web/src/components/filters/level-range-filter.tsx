import { LevelRangeFilterFields } from "./level-range-filter-fields";

export interface LevelRangeFilterProps {
  minLevel?: number;
  maxLevel?: number;
  onMinLevelChange: (value: number | undefined) => void;
  onMaxLevelChange: (value: number | undefined) => void;
  debounceMs?: number;
  minLevelPlaceholder?: string;
  maxLevelPlaceholder?: string;
  inputClassName?: string;
  containerClassName?: string;
  separator?: React.ReactNode;
}

export function LevelRangeFilter({
  minLevel,
  maxLevel,
  onMinLevelChange,
  onMaxLevelChange,
  debounceMs = 500,
  minLevelPlaceholder = "Min. poziom",
  maxLevelPlaceholder = "Max. poziom",
  inputClassName,
  containerClassName,
  separator,
}: LevelRangeFilterProps) {
  return (
    <LevelRangeFilterFields
      key={`${minLevel ?? ""}:${maxLevel ?? ""}`}
      minLevel={minLevel}
      maxLevel={maxLevel}
      onMinLevelChange={onMinLevelChange}
      onMaxLevelChange={onMaxLevelChange}
      debounceMs={debounceMs}
      minLevelPlaceholder={minLevelPlaceholder}
      maxLevelPlaceholder={maxLevelPlaceholder}
      inputClassName={inputClassName}
      containerClassName={containerClassName}
      separator={separator}
    />
  );
}
