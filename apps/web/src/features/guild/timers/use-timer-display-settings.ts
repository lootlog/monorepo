import {
  getTimerColorConfig,
  resolveTimerColorPaint,
} from "@lootlog/domain/timer-colors";
import { SETTINGS_CATALOG } from "@lootlog/domain/settings-documents";
import type { TimerCountdownMode } from "@lootlog/domain/timers";
import { isObjectRecord } from "@lootlog/schema/records";
import { decodeTimerSettings } from "@lootlog/schema/timer-settings";
import { useSettingsDocumentsControllerGetPreferences } from "@lootlog/client/main";

const params = { domains: "timers,appearance" };

const GENERAL_DEFAULTS =
  SETTINGS_CATALOG.timers.fields.generalConfig.defaultValue;

/**
 * The player's timer settings from the game client, so the panel removes,
 * keeps, counts down and paints timers the way the game does.
 */
export const useTimerDisplaySettings = () => {
  const { data } = useSettingsDocumentsControllerGetPreferences(params, {
    query: { staleTime: 60_000, retry: false },
  });

  const timers = decodeTimerSettings(data?.domains.timers?.effective);
  const appearance = data?.domains.appearance?.effective;

  const colors = decodeTimerSettings(
    isObjectRecord(appearance?.timers) ? appearance.timers : undefined,
  );

  const countdownMode: TimerCountdownMode =
    timers.generalConfig?.countdownMode ??
    (GENERAL_DEFAULTS.countdownMode === "min" ? "min" : "max");

  const getPaint = (npcName: string) => {
    const { selectedColor, customColor, overriddenColor } = getTimerColorConfig(
      npcName,
      colors.timersColors ?? {},
      colors.customColors ?? {},
      colors.overriddenDefaultColors ?? {},
    );

    return resolveTimerColorPaint(selectedColor, customColor, overriddenColor);
  };

  // Kept on screen after the removal delay, as chosen in the game client.
  const isPinned = (timer: { world: string; timerKey: string }) =>
    timers.alwaysVisibleExpiredTimers?.[timer.world]?.includes(
      timer.timerKey,
    ) ?? false;

  return {
    removeTimerAfterMs:
      timers.generalConfig?.removeTimerAfterMs ??
      GENERAL_DEFAULTS.removeTimerAfterMs,
    countdownMode,
    getPaint,
    isPinned,
  };
};
