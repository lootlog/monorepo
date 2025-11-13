import { useState, useEffect } from "react";
import { Input } from "@lootlog/ui/components/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@lootlog/ui/lib/utils";

interface LevelRangeFilterProps {
  minLevel?: number;
  maxLevel?: number;
  onMinLevelChange: (value: number | undefined) => void;
  onMaxLevelChange: (value: number | undefined) => void;
  debounceMs?: number;
  minLevelPlaceholder?: string;
  maxLevelPlaceholder?: string;
  inputClassName?: string;
  containerClassName?: string;
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
}: LevelRangeFilterProps) {
  const [localMinLevel, setLocalMinLevel] = useState<number | undefined>(
    minLevel,
  );
  const [localMaxLevel, setLocalMaxLevel] = useState<number | undefined>(
    maxLevel,
  );

  const debouncedMinLevel = useDebounce(localMinLevel, debounceMs);
  const debouncedMaxLevel = useDebounce(localMaxLevel, debounceMs);

  useEffect(() => {
    setLocalMinLevel(minLevel);
  }, [minLevel]);

  useEffect(() => {
    setLocalMaxLevel(maxLevel);
  }, [maxLevel]);

  useEffect(() => {
    onMinLevelChange(debouncedMinLevel);
  }, [debouncedMinLevel, onMinLevelChange]);

  useEffect(() => {
    onMaxLevelChange(debouncedMaxLevel);
  }, [debouncedMaxLevel, onMaxLevelChange]);

  const handleMinLevelChange = (value: string) => {
    if (value === "") {
      setLocalMinLevel(undefined);
    } else {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 500) {
        setLocalMinLevel(parsed);
      }
    }
  };

  const handleMaxLevelChange = (value: string) => {
    if (value === "") {
      setLocalMaxLevel(undefined);
    } else {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 500) {
        setLocalMaxLevel(parsed);
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
