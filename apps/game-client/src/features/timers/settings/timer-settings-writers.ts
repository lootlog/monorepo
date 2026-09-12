/* oxlint-disable anti-slop/no-unsafe-dictionary-type, anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, anti-slop/no-known-value-widening -- timer settings read and write catalog-validated document JSON; values are typed by the normalizers before they reach the feature. */
import type {
  CustomTimerColor,
  TimersDisplayConfig,
  TimersGeneralConfig,
  TimersLayout,
} from "@lootlog/schema/timer-settings";
import {
  enqueueSettingsPatch,
  readCurrentSettingsDocuments,
} from "@/features/settings/persistence/settings-patch-client";
import {
  GUILD_TIMERS_DOCUMENTS_QUERY_KEY_PREFIX,
  type GuildSettingsDocuments,
} from "@/features/settings/persistence/settings-documents";
import { queryClient } from "@/lib/query-client";
import type { OverriddenTimerColor } from "@/features/timers/model/timer-colors";
import {
  getGuildTimerListsFromDocuments,
  getTimerAppearanceFromDocuments,
  getTimerBehaviorFromDocuments,
  GLOBAL_TIMER_SETTINGS_KEY,
  type GuildTimerLists,
} from "./timer-settings-documents";

const hasTimersQueryKey = (queryKey: readonly unknown[]) =>
  typeof queryKey[0] === "string" && queryKey[0].startsWith("/timers");

/** The timer list API applies always-visible expired timers server-side. */
export const invalidateTimerLists = () =>
  void queryClient.invalidateQueries({
    predicate: ({ queryKey }) => hasTimersQueryKey(queryKey),
  });

/** Behaviour settings from the cached documents, for code outside React. */
export const readTimerBehavior = () =>
  getTimerBehaviorFromDocuments(readCurrentSettingsDocuments());

export const readTimerAppearance = () =>
  getTimerAppearanceFromDocuments(readCurrentSettingsDocuments());

/** Current hidden/pinned lists of a settings key from the cached documents. */
export const readGuildTimerLists = (settingsKey: string): GuildTimerLists => {
  if (settingsKey === GLOBAL_TIMER_SETTINGS_KEY) {
    return getGuildTimerListsFromDocuments(readCurrentSettingsDocuments());
  }

  const entries = queryClient.getQueriesData<GuildSettingsDocuments>({
    queryKey: GUILD_TIMERS_DOCUMENTS_QUERY_KEY_PREFIX,
  });

  for (const [, documents] of entries) {
    const guildDocuments = documents?.guilds[settingsKey];

    if (guildDocuments) return getGuildTimerListsFromDocuments(guildDocuments);
  }

  return getGuildTimerListsFromDocuments(undefined);
};

const writeBehavior = (
  set: Record<string, unknown>,
  unset: string[] = [],
  afterSave?: () => void,
) => enqueueSettingsPatch({ domain: "timers", set, unset, afterSave });

const writeAppearance = (set: Record<string, unknown>, unset: string[] = []) =>
  enqueueSettingsPatch({
    domain: "appearance",
    set: Object.keys(set).length > 0 ? { timers: set } : {},
    unset: unset.map((path) => `timers.${path}`),
  });

const writeGuildList = (
  settingsKey: string,
  field: keyof GuildTimerLists,
  list: string[],
) =>
  settingsKey === GLOBAL_TIMER_SETTINGS_KEY
    ? enqueueSettingsPatch({ domain: "timers", set: { [field]: list } })
    : enqueueSettingsPatch({
        domain: "timers",
        set: { [field]: list },
        scopeType: "GUILD",
        guildId: settingsKey,
      });

const toggleListEntry = (list: string[], entry: string, present: boolean) =>
  present
    ? [...new Set([...list, entry])]
    : list.filter((item) => item !== entry);

export const setTimerHidden = (
  settingsKey: string,
  npcName: string,
  hidden: boolean,
) =>
  writeGuildList(
    settingsKey,
    "hiddenTimers",
    toggleListEntry(
      readGuildTimerLists(settingsKey).hiddenTimers,
      npcName,
      hidden,
    ),
  );

export const setTimerPinned = (
  settingsKey: string,
  npcName: string,
  pinned: boolean,
) =>
  writeGuildList(
    settingsKey,
    "pinnedTimers",
    toggleListEntry(
      readGuildTimerLists(settingsKey).pinnedTimers,
      npcName,
      pinned,
    ),
  );

export const setTimerGeneralConfig = (config: TimersGeneralConfig) =>
  writeBehavior({ generalConfig: config });

export const setTimersLayout = (layout: TimersLayout) =>
  writeBehavior({ layout });

export const setTimersSortOrder = (order: "asc" | "desc") =>
  writeBehavior({ timersSortOrder: order });

export const setTimerFiltersEnabled = (enabled: boolean) =>
  writeBehavior({ timerFiltersEnabled: enabled });

export const setColorFiltersEnabled = (enabled: boolean) =>
  writeBehavior({ colorFiltersEnabled: enabled });

/** Expired timers kept on the list per world; an emptied world is unset so the leaf disappears. */
export const setExpiredTimerAlwaysVisible = (
  world: string,
  timerKey: string,
  visible: boolean,
) => {
  const current = readTimerBehavior().alwaysVisibleExpiredTimers[world] ?? [];
  const next = toggleListEntry(current, timerKey, visible);

  return next.length > 0
    ? writeBehavior(
        { alwaysVisibleExpiredTimers: { [world]: next } },
        [],
        invalidateTimerLists,
      )
    : writeBehavior(
        {},
        [`alwaysVisibleExpiredTimers.${world}`],
        invalidateTimerLists,
      );
};

export const setTimerDisplayConfig = (config: TimersDisplayConfig) =>
  writeAppearance({ displayConfig: config });

/** Assigns a colour to an NPC name; clearing sends an unset so no stale id survives. */
export const setTimerColor = (npcName: string, colorId?: string) =>
  colorId
    ? writeAppearance({ timersColors: { [npcName]: colorId } })
    : writeAppearance({}, [`timersColors.${npcName}`]);

const assignmentsOf = (colorId: string) =>
  Object.entries(readTimerAppearance().timersColors)
    .filter(([, assigned]) => assigned === colorId)
    .map(([npcName]) => `timersColors.${npcName}`);

export const saveCustomColor = (color: CustomTimerColor) =>
  writeAppearance({ customColors: { [color.id]: color } });

/** Removes a custom colour together with every NPC assignment pointing at it. */
export const deleteCustomColor = (colorId: string) =>
  writeAppearance({}, [`customColors.${colorId}`, ...assignmentsOf(colorId)]);

export const setDefaultColorName = (colorId: string, name: string) =>
  writeAppearance({ defaultColorNames: { [colorId]: name } });

export const overrideDefaultColor = (
  colorId: string,
  color: OverriddenTimerColor,
) => writeAppearance({ overriddenDefaultColors: { [colorId]: color } });

export const resetDefaultColor = (colorId: string) =>
  writeAppearance({}, [
    `overriddenDefaultColors.${colorId}`,
    `defaultColorNames.${colorId}`,
  ]);

export const resetAllDefaultColors = () =>
  writeAppearance({}, ["overriddenDefaultColors", "defaultColorNames"]);

/** Hides a stock colour from pickers and clears the NPCs that used it. */
export const hideDefaultColor = (colorId: string) =>
  writeAppearance(
    {
      hiddenDefaultColors: toggleListEntry(
        readTimerAppearance().hiddenDefaultColors,
        colorId,
        true,
      ),
    },
    assignmentsOf(colorId),
  );

export const restoreDefaultColor = (colorId: string) =>
  writeAppearance(
    {
      hiddenDefaultColors: toggleListEntry(
        readTimerAppearance().hiddenDefaultColors,
        colorId,
        false,
      ),
    },
    [`overriddenDefaultColors.${colorId}`, `defaultColorNames.${colorId}`],
  );
