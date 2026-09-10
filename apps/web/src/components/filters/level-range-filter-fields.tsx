import { useState, useEffect } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { Input } from "@lootlog/ui/components/input";
import { cn } from "cn";
import type { LevelRangeFilterProps } from "./level-range-filter";

export function LevelRangeFilterFields({
  minLevel,
  maxLevel,
  onMinLevelChange,
  onMaxLevelChange,
  debounceMs,
  minLevelPlaceholder,
  maxLevelPlaceholder,
  inputClassName,
  containerClassName,
  separator,
}: LevelRangeFilterProps) {
  const [localMinLevel, setLocalMinLevel] = useState<number | undefined>(
    minLevel,
  );

  const [localMaxLevel, setLocalMaxLevel] = useState<number | undefined>(
    maxLevel,
  );

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
    if (value === "") {
      setLocalMinLevel(undefined);
      commitMinLevel(undefined);
    } else {
      const parsed = Number.parseInt(value, 10);

      if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 500) {
        setLocalMinLevel(parsed);
        commitMinLevel(parsed);
      }
    }
  };

  const handleMaxLevelChange = (value: string) => {
    if (value === "") {
      setLocalMaxLevel(undefined);
      commitMaxLevel(undefined);
    } else {
      const parsed = Number.parseInt(value, 10);

      if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 500) {
        setLocalMaxLevel(parsed);
        commitMaxLevel(parsed);
      }
    }
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
