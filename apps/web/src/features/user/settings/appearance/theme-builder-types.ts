import type { ThemeConfigV1 } from "@lootlog/types";

export type ThemeBuilderAxis =
  | "colors"
  | "interactions"
  | "components"
  | "surfaces"
  | "typography"
  | "navigation"
  | "charts"
  | "motion";

export interface ThemeBuilderControlGroupProps {
  config: ThemeConfigV1;
  lockedAxes: Set<ThemeBuilderAxis>;
  onConfigChange: (config: ThemeConfigV1) => void;
  onResetGroup: (axis: ThemeBuilderAxis) => void;
  onToggleLock: (axis: ThemeBuilderAxis) => void;
}
