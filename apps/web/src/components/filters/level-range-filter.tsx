import { useState, useEffect } from "react";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@lootlog/ui/lib/utils";

interface LevelRangeFilterProps {
  minLevel?: number;
  maxLevel?: number;
  onMinLevelChange: (value: number | undefined) => void;
  onMaxLevelChange: (value: number | undefined) => void;
  debounceMs?: number;
  minLevelLabel?: string;
  maxLevelLabel?: string;
  minLevelId?: string;
  maxLevelId?: string;
  inputClassName?: string;
  containerClassName?: string;
}

export function LevelRangeFilter({
  minLevel,
  maxLevel,
  onMinLevelChange,
  onMaxLevelChange,
  debounceMs = 500,
  minLevelLabel = "Min. poziom przeciwnika",
  maxLevelLabel = "Max. poziom przeciwnika",
  minLevelId = "min-level",
  maxLevelId = "max-level",
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
      <div className={cn("space-y-1", containerClassName)}>
        <Label htmlFor={minLevelId} className="text-xs">
          {minLevelLabel}
        </Label>
        <Input
          id={minLevelId}
          type="number"
          min="1"
          max="500"
          value={localMinLevel ?? ""}
          onChange={(e) => handleMinLevelChange(e.target.value)}
          className={cn("w-[140px] h-10", inputClassName)}
        />
      </div>

      <div className={cn("space-y-1", containerClassName)}>
        <Label htmlFor={maxLevelId} className="text-xs">
          {maxLevelLabel}
        </Label>
        <Input
          id={maxLevelId}
          type="number"
          min="1"
          max="500"
          value={localMaxLevel ?? ""}
          onChange={(e) => handleMaxLevelChange(e.target.value)}
          className={cn("w-[140px] h-10", inputClassName)}
        />
      </div>
    </>
  );
}
