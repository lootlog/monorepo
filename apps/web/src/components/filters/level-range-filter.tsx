import { useEffect, useEffectEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@lootlog/ui/components/input";
import { ArrowRight } from "lucide-react";
import { cn } from "cn";

export interface LevelRangeFilterProps {
  minLevel?: number;
  maxLevel?: number;
  onMinLevelChange: (value: number | undefined) => void;
  onMaxLevelChange: (value: number | undefined) => void;
  /** Delay before a typed bound is committed. */
  debounceMs?: number;
  /**
   * `inline` sits in a filter bar row: the bounds stretch on mobile and are
   * 72px wide from `md`. `fill` spans a side panel, popover, or drawer.
   */
  layout?: "inline" | "fill";
  size?: "default" | "lg";
  className?: string;
}

/**
 * Commits the last scheduled value once typing pauses, or at once on `flush`
 * (leaving the field, e.g. before a popover closes). The commit reads the
 * latest props, so a caller that passes new callbacks on every render never
 * cancels or delays a pending edit; unmounting drops it.
 */
const useDebouncedCommit = <T,>(
  onCommit: (value: T) => void,
  delayMs: number,
) => {
  const [draft, setDraft] = useState<{ value: T } | null>(null);
  const commit = useEffectEvent(onCommit);

  useEffect(() => {
    if (!draft) return;

    const timer = setTimeout(() => commit(draft.value), delayMs);

    return () => clearTimeout(timer);
  }, [draft, delayMs]);

  return {
    schedule: (value: T) => setDraft({ value }),
    flush: () => {
      if (!draft) return;
      setDraft(null);
      onCommit(draft.value);
    },
  };
};

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
  layout = "fill",
  size = "lg",
  className,
}: LevelRangeFilterProps) {
  const { t } = useTranslation();
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

  const commitMinLevel = useDebouncedCommit((value: number | undefined) => {
    if (value !== minLevel) onMinLevelChange(value);
  }, debounceMs);

  const commitMaxLevel = useDebouncedCommit((value: number | undefined) => {
    if (value !== maxLevel) onMaxLevelChange(value);
  }, debounceMs);

  const handleMinLevelChange = (value: string) => {
    const level = value === "" ? undefined : parseLevel(value);

    if (value !== "" && level === undefined) return;

    setLocalMinLevel(level);
    commitMinLevel.schedule(level);
  };

  const handleMaxLevelChange = (value: string) => {
    const level = value === "" ? undefined : parseLevel(value);

    if (value !== "" && level === undefined) return;

    setLocalMaxLevel(level);
    commitMaxLevel.schedule(level);
  };

  const inputClassName = cn(
    "min-w-0 flex-1",
    layout === "inline" && "md:w-[72px] md:flex-none",
  );

  return (
    <div
      role="group"
      aria-label={t("ui.levelRange.label")}
      className={cn(
        "flex w-full min-w-0 items-center gap-2",
        layout === "inline" && "md:w-auto",
        className,
      )}
    >
      <Input
        type="number"
        min="1"
        max="500"
        aria-label={t("ui.levelRange.min")}
        placeholder={t("ui.levelRange.minPlaceholder")}
        value={localMinLevel ?? ""}
        onChange={(e) => handleMinLevelChange(e.target.value)}
        onBlur={commitMinLevel.flush}
        size={size}
        className={inputClassName}
      />
      <ArrowRight
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="number"
        min="1"
        max="500"
        aria-label={t("ui.levelRange.max")}
        placeholder={t("ui.levelRange.maxPlaceholder")}
        value={localMaxLevel ?? ""}
        onChange={(e) => handleMaxLevelChange(e.target.value)}
        onBlur={commitMaxLevel.flush}
        size={size}
        className={inputClassName}
      />
    </div>
  );
}
