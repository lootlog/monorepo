/* oxlint-disable anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, anti-slop/no-known-value-widening -- the settings persistence layer is the I/O boundary for catalog-validated document JSON; values are typed by the catalog when read through selectors. */
import { enqueueSettingsPatch } from "@/features/settings/persistence/settings-patch-client";
import { queryClient } from "@/lib/query-client";
import type { UpdateTimerSettingsPayload } from "@lootlog/schema/timer-settings";

/** Timer settings whose documents live under `appearance.timers.*`. */
const APPEARANCE_FIELDS = [
  "displayConfig",
  "customColors",
  "timersColors",
  "defaultColorNames",
  "overriddenDefaultColors",
  "hiddenDefaultColors",
] as const;

/** Timer settings stored in the `timers` domain at user scope. */
const BEHAVIOR_FIELDS = [
  "generalConfig",
  "alwaysVisibleExpiredTimers",
  "timerFiltersEnabled",
  "colorFiltersEnabled",
  "timersSortOrder",
] as const;

/** Settings key used by the timers feature when timers are grouped across guilds. */
export const GLOBAL_TIMER_SETTINGS_KEY = "global";

const hasTimersQueryKey = (queryKey: readonly unknown[]) =>
  typeof queryKey[0] === "string" && queryKey[0].startsWith("/timers");

/** The timer list API applies always-visible expired timers server-side. */
export const invalidateTimerLists = () =>
  void queryClient.invalidateQueries({
    predicate: ({ queryKey }) => hasTimersQueryKey(queryKey),
  });

/**
 * Writes a timers store payload to the settings documents. Cleared timer
 * colors become `unset` paths so the server removes them instead of keeping
 * a stale assignment.
 */
export const syncTimerSettings = (payload: UpdateTimerSettingsPayload) => {
  const appearance: Record<string, unknown> = {};
  const unsetAppearance: string[] = [];
  const behavior: Record<string, unknown> = {};

  for (const field of APPEARANCE_FIELDS) {
    const value = payload[field];

    if (value === undefined) continue;

    if (field === "timersColors") {
      const assigned: Record<string, string> = {};

      for (const [npcName, colorId] of Object.entries(value)) {
        if (colorId === undefined) {
          unsetAppearance.push(`timers.timersColors.${npcName}`);
        } else {
          assigned[npcName] = colorId;
        }
      }

      appearance[field] = assigned;
      continue;
    }

    appearance[field] = value;
  }

  for (const field of BEHAVIOR_FIELDS) {
    if (payload[field] !== undefined) behavior[field] = payload[field];
  }

  if (Object.keys(appearance).length > 0 || unsetAppearance.length > 0) {
    enqueueSettingsPatch({
      domain: "appearance",
      set: Object.keys(appearance).length > 0 ? { timers: appearance } : {},
      unset: unsetAppearance,
    });
  }

  if (Object.keys(behavior).length > 0) {
    enqueueSettingsPatch({
      domain: "timers",
      set: behavior,
      afterSave: invalidateTimerLists,
    });
  }
};

/**
 * Hidden and pinned timers are stored per guild document; the grouped
 * ("global") list lives on the user document.
 */
export const syncGuildTimerList = (
  settingsKey: string,
  field: "hiddenTimers" | "pinnedTimers",
  timerIds: string[],
) => {
  if (settingsKey === GLOBAL_TIMER_SETTINGS_KEY) {
    return enqueueSettingsPatch({
      domain: "timers",
      set: { [field]: timerIds },
    });
  }

  return enqueueSettingsPatch({
    domain: "timers",
    set: { [field]: timerIds },
    scopeType: "GUILD",
    guildId: settingsKey,
  });
};
