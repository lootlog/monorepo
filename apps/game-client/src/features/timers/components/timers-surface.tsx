import type { FC } from "react";
import type { TimersLayout } from "@lootlog/schema/timer-settings";
import { useSettingField } from "@/features/settings/persistence/use-setting-field";
import type {
  TimersSurfaceKind,
  TimersWindowModel,
} from "@/features/timers/hooks/use-timers-window-model";
import { LegacyTimersSurface } from "./legacy/legacy-timers-surface";

export type TimersLayoutProps = {
  model: TimersWindowModel;
  surface: TimersSurfaceKind;
};

/** The layout switch; the only place that knows both layouts exist. */
export const useTimersLayout = (): TimersLayout =>
  useSettingField("timers.layout").value;

export const TimersSurface: FC<TimersLayoutProps> = ({ model, surface }) => {
  const layout = useTimersLayout();

  if (layout === "legacy") {
    return <LegacyTimersSurface model={model} surface={surface} />;
  }

  // The modern layout lands in a follow-up; until then both values render legacy.
  return <LegacyTimersSurface model={model} surface={surface} />;
};
