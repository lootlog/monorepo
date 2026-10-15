import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { parseKillStatsLevel } from "@/features/kills/parse-kill-stats-level";

/** Bounds are kept as the persisted strings ("" when unset). */
export type KillStatsLevelRangeValue = {
  minLvl: string;
  maxLvl: string;
  onMinLvlChange: (value: string) => void;
  onMaxLvlChange: (value: string) => void;
};

type KillStatsLevelRangeProps = {
  level: KillStatsLevelRangeValue;
  layout: "inline" | "fill";
};

// Callers debounce the request on their own, so the inputs commit sooner than
// the level range's default.
const LEVEL_COMMIT_DELAY_MS = 300;

const toLevelParam = (value: number | undefined) =>
  value === undefined ? "" : String(value);

/** The kill statistics level range, over the bounds as persisted strings. */
export const KillStatsLevelRange = ({
  level,
  layout,
}: KillStatsLevelRangeProps) => (
  <LevelRangeFilter
    layout={layout}
    debounceMs={LEVEL_COMMIT_DELAY_MS}
    minLevel={parseKillStatsLevel(level.minLvl)}
    maxLevel={parseKillStatsLevel(level.maxLvl)}
    onMinLevelChange={(value) => level.onMinLvlChange(toLevelParam(value))}
    onMaxLevelChange={(value) => level.onMaxLvlChange(toLevelParam(value))}
  />
);
