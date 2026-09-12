import type { FC } from "react";
import type {
  TimersSurfaceKind,
  TimersWindowModel,
} from "@/features/timers/hooks/use-timers-window-model";
import { LegacyTimersSurface } from "./legacy/legacy-timers-surface";
import { ModernTimersSurface } from "./modern/modern-timers-surface";

export type TimersLayoutProps = {
  model: TimersWindowModel;
  surface: TimersSurfaceKind;
};

/** The layout switch; the only place that knows both layouts exist. */
export const TimersSurface: FC<TimersLayoutProps> = ({ model, surface }) =>
  model.layout === "legacy" ? (
    <LegacyTimersSurface model={model} surface={surface} />
  ) : (
    <ModernTimersSurface model={model} surface={surface} />
  );
