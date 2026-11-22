import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { parseKillStatsLevel } from "@/features/kills/parse-kill-stats-level";

export type KillStatsLevelRangeValue = {
  minLvl: string;
  maxLvl: string;
  onMinLvlChange: (value: string) => void;
  onMaxLvlChange: (value: string) => void;
};

type KillStatsLevelRangeProps = {
  level: KillStatsLevelRangeValue;
};

const LEVEL_COMMIT_DELAY_MS = 300;

const toLevelParam = (value: number | undefined) =>
  value === undefined ? "" : String(value);

export const KillStatsLevelRange = ({ level }: KillStatsLevelRangeProps) => (
  <LevelRangeFilter
    debounceMs={LEVEL_COMMIT_DELAY_MS}
    minLevel={parseKillStatsLevel(level.minLvl)}
    maxLevel={parseKillStatsLevel(level.maxLvl)}
    onMinLevelChange={(value) => level.onMinLvlChange(toLevelParam(value))}
    onMaxLevelChange={(value) => level.onMaxLvlChange(toLevelParam(value))}
  />
);
