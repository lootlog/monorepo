import { useState, useEffect, useRef } from "react";
import { Input } from "@lootlog/ui/components/input";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
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

function LevelRangeFilterFields({
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
  const onMinLevelChangeRef = useRef(onMinLevelChange);
  const onMaxLevelChangeRef = useRef(onMaxLevelChange);

  const debouncedMinLevel = useDebounce(localMinLevel, debounceMs);
  const debouncedMaxLevel = useDebounce(localMaxLevel, debounceMs);

  useEffect(() => {
    onMinLevelChangeRef.current = onMinLevelChange;
  }, [onMinLevelChange]);

  useEffect(() => {
    onMaxLevelChangeRef.current = onMaxLevelChange;
  }, [onMaxLevelChange]);

  useEffect(() => {
    if (debouncedMinLevel === minLevel) {
      return;
    }

    onMinLevelChangeRef.current(debouncedMinLevel);
  }, [debouncedMinLevel, minLevel]);

  useEffect(() => {
    if (debouncedMaxLevel === maxLevel) {
      return;
    }

    onMaxLevelChangeRef.current(debouncedMaxLevel);
  }, [debouncedMaxLevel, maxLevel]);

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
