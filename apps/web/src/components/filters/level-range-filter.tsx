import { useInFilterBar } from "@lootlog/ui/components/filter-bar-context";
import { LevelRangeChip } from "./level-range-chip";
import {
  LevelRangeInputs,
  type LevelRangeInputsProps,
} from "./level-range-inputs";

/** In a filter bar the range is one chip that opens the bounds. */
export function LevelRangeFilter(props: LevelRangeInputsProps) {
  return useInFilterBar() ? (
    <LevelRangeChip {...props} />
  ) : (
    <LevelRangeInputs {...props} />
  );
}
