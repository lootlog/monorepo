import { isString } from "es-toolkit";
import type { SettingsOperation } from "@/lib/settings-persistence/settings-documents";
import { enqueueSettingsPatch } from "@/lib/settings-persistence/settings-patch-client";
import { queryClient } from "@/lib/query-client";
import type {
  CustomTimerList,
  UpdateTimerSettingsPayload,
} from "@lootlog/schema/timer-settings";

const APPEARANCE_FIELDS = [
  "displayConfig",
  "customColors",
  "timersColors",
  "defaultColorNames",
  "overriddenDefaultColors",
  "hiddenDefaultColors",
] as const;

const APPEARANCE_MAP_FIELDS = [
  "customColors",
  "defaultColorNames",
  "overriddenDefaultColors",
] as const;

type AppearanceMapField = (typeof APPEARANCE_MAP_FIELDS)[number];

const isAppearanceMapField = (field: string): field is AppearanceMapField =>
  APPEARANCE_MAP_FIELDS.some((mapField) => mapField === field);

const BEHAVIOR_FIELDS = [
  "generalConfig",
  "alwaysVisibleExpiredTimers",
  "timerFiltersEnabled",
  "colorFiltersEnabled",
  "timersSortOrder",
] as const;

export const GLOBAL_TIMER_SETTINGS_KEY = "global";

const hasTimersQueryKey = (queryKey: readonly unknown[]) =>
  isString(queryKey[0]) && queryKey[0].startsWith("/timers");

const invalidateTimerLists = () =>
  void queryClient.invalidateQueries({
    predicate: ({ queryKey }) => hasTimersQueryKey(queryKey),
  });

export const syncTimerSettings = (
  payload: UpdateTimerSettingsPayload,
  previous: Pick<UpdateTimerSettingsPayload, AppearanceMapField> = {},
) => {
  const appearance: SettingsOperation["set"] = {};
  const unsetAppearance: string[] = [];
  const behavior: SettingsOperation["set"] = {};

  for (const field of APPEARANCE_FIELDS) {
    if (field === "timersColors") {
      const colors = payload[field];

      if (colors === undefined) continue;
      const assigned: Record<string, string> = {};

      for (const [npcName, colorId] of Object.entries(colors)) {
        if (colorId === undefined) {
          unsetAppearance.push(`timers.timersColors.${npcName}`);
        } else {
          assigned[npcName] = colorId;
        }
      }

      appearance[field] = assigned;
      continue;
    }

    const value = payload[field];

    if (value === undefined) continue;

    if (isAppearanceMapField(field) && Object.keys(value).length > 0) {
      for (const key of Object.keys(previous[field] ?? {})) {
        if (!(key in value)) unsetAppearance.push(`timers.${field}.${key}`);
      }
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

export const syncCustomList = (id: string, list: CustomTimerList | undefined) =>
  enqueueSettingsPatch(
    list
      ? { domain: "timers", set: { customLists: { [id]: list } } }
      : { domain: "timers", unset: [`customLists.${id}`] },
  );
