import { useState, useEffect } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { Input } from "@lootlog/ui/components/input";
import { cn } from "cn";

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

const parseLevel = (value: string) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 && parsed <= 500
    ? parsed
    : undefined;
};

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
  const [localMinLevel, setLocalMinLevel] = useState(minLevel);
  const [localMaxLevel, setLocalMaxLevel] = useState(maxLevel);

  // Follow outside changes (a reset, a saved filter) without remounting, so
  // one bound committing never cancels the other bound's pending edit.
  const [syncedLevels, setSyncedLevels] = useState({ minLevel, maxLevel });

  if (
    syncedLevels.minLevel !== minLevel ||
    syncedLevels.maxLevel !== maxLevel
  ) {
    setSyncedLevels({ minLevel, maxLevel });

    if (syncedLevels.minLevel !== minLevel) setLocalMinLevel(minLevel);

    if (syncedLevels.maxLevel !== maxLevel) setLocalMaxLevel(maxLevel);
  }

  const commitMinLevel = useDebounceCallback((value: number | undefined) => {
    if (value !== minLevel) onMinLevelChange(value);
  }, debounceMs);

  const commitMaxLevel = useDebounceCallback((value: number | undefined) => {
    if (value !== maxLevel) onMaxLevelChange(value);
  }, debounceMs);

  useEffect(
    () => () => {
      commitMinLevel.cancel();
      commitMaxLevel.cancel();
    },
    [commitMinLevel, commitMaxLevel],
  );

  const handleMinLevelChange = (value: string) => {
    const level = value === "" ? undefined : parseLevel(value);

    if (value !== "" && level === undefined) return;

    setLocalMinLevel(level);
    commitMinLevel(level);
  };

  const handleMaxLevelChange = (value: string) => {
    const level = value === "" ? undefined : parseLevel(value);

    if (value !== "" && level === undefined) return;

    setLocalMaxLevel(level);
    commitMaxLevel(level);
  };

  return (
    <>
      <div className={containerClassName}>
        <Input
          type="number"
          min="1"
          max="500"
          placeholder={minLevelPlaceholder}
          value={localMinLevel ?? ""}
          onChange={(e) => handleMinLevelChange(e.target.value)}
          className={cn("w-[80px] h-10", inputClassName)}
        />
      </div>

      {separator}

      <div className={containerClassName}>
        <Input
          type="number"
          min="1"
          max="500"
          placeholder={maxLevelPlaceholder}
          value={localMaxLevel ?? ""}
          onChange={(e) => handleMaxLevelChange(e.target.value)}
          className={cn("w-[80px] h-10", inputClassName)}
        />
      </div>
    </>
  );
}
