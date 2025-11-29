import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { API_URL } from "@/config/api";
import { NpcType } from "@/hooks/api/use-npcs";
import type {
  CustomTimerColor,
  TimersDisplayConfig,
  TimersFilters as ApiTimersFilters,
  TimersGeneralConfig,
  UserGuildTimerSettings,
  UserTimerSettings,
} from "@lootlog/types";

export type HiddenTimers = Record<string, string[]>;
export type PinnedTimers = Record<string, string[]>;
export type SoundEnabledTimers = Record<string, string[]>;

export type SettingsSyncMode = "cloud" | "local";

export type TimersFilters = Omit<ApiTimersFilters, "selectedNpcTypes"> & {
  selectedNpcTypes: NpcType[];
};

export type UserSettings = {
  generalConfig: TimersGeneralConfig;
  displayConfig: TimersDisplayConfig;
  customColors: Record<string, CustomTimerColor>;
  timersColors: Record<string, string | undefined>;
  defaultColorNames: Record<string, string>;
  overriddenDefaultColors: Record<
    string,
    { borderColor: string; backgroundColor: string }
  >;
  hiddenDefaultColors: string[];
  timerFiltersEnabled: boolean;
  colorFiltersEnabled: boolean;
  timersSortOrder: "asc" | "desc";
  syncEnabled: boolean;
  hiddenTimers: HiddenTimers;
  pinnedTimers: PinnedTimers;
  soundEnabledTimers: SoundEnabledTimers;
  timersFilters: Record<string, TimersFilters>;
  timerFiltersSearchText: string;
  updatedAt?: number;
};

const STORAGE_KEY = "lootlog:user-settings";
const SYNC_MODE_STORAGE_KEY = "lootlog:settings-sync-mode";
const LEGACY_STORAGE_KEY = "ll-timers-state";

const DEFAULT_REMOVE_TIMER_AFTER_MS = 30000;

export const DEFAULT_SELECTED_NPC_TYPES = [
  NpcType.ELITE3,
  NpcType.ELITE2,
  NpcType.HERO,
  NpcType.TITAN,
];

export const DEFAULT_TIMERS_FILTERS: TimersFilters = {
  minLvl: 0,
  maxLvl: 300,
  selectedNpcTypes: DEFAULT_SELECTED_NPC_TYPES,
  selectedColors: [],
};

const DEFAULT_SETTINGS: UserSettings = {
  generalConfig: {
    removeTimerAfterMs: DEFAULT_REMOVE_TIMER_AFTER_MS,
    timersGrouping: false,
    timersUnderBag: false,
    countdownMode: "max",
  },
  displayConfig: {
    showType: true,
    showLevel: false,
    fontSize: 11,
    minColumnWidth: 120,
    singleTimerDisplayMode: "row",
  },
  customColors: {},
  timersColors: {},
  defaultColorNames: {},
  overriddenDefaultColors: {},
  hiddenDefaultColors: [],
  timerFiltersEnabled: false,
  colorFiltersEnabled: false,
  timersSortOrder: "asc",
  syncEnabled: true,
  hiddenTimers: {},
  pinnedTimers: {},
  soundEnabledTimers: {},
  timersFilters: {},
  timerFiltersSearchText: "",
  updatedAt: undefined,
};

const TIMER_SETTINGS_PATH = "/timer-settings";
const GUILD_TIMER_SETTINGS_PATH = (guildId: string) =>
  `/timer-settings/guilds/${guildId}`;

const syncModeSubscribers = new Set<(mode: SettingsSyncMode) => void>();

const createApiClient = () =>
  axios.create({
    baseURL: API_URL,
    withCredentials: true,
  });

const notifySyncModeSubscribers = (mode: SettingsSyncMode) => {
  syncModeSubscribers.forEach((cb) => cb(mode));
};

export const subscribeToSyncMode = (cb: (mode: SettingsSyncMode) => void) => {
  syncModeSubscribers.add(cb);
  return () => {
    syncModeSubscribers.delete(cb);
  };
};

export const getSyncMode = (): SettingsSyncMode => {
  const stored = localStorage.getItem(SYNC_MODE_STORAGE_KEY);
  return stored === "local" || stored === "cloud" ? stored : "cloud";
};

export const setSyncMode = (mode: SettingsSyncMode) => {
  localStorage.setItem(SYNC_MODE_STORAGE_KEY, mode);
  notifySyncModeSubscribers(mode);
};

const withDefaults = (
  raw: Partial<UserSettings> | null | undefined,
): UserSettings => {
  const base = raw ?? {};

  return {
    ...DEFAULT_SETTINGS,
    ...base,
    generalConfig: {
      ...DEFAULT_SETTINGS.generalConfig,
      ...base.generalConfig,
    },
    displayConfig: {
      ...DEFAULT_SETTINGS.displayConfig,
      ...base.displayConfig,
    },
    customColors: base.customColors ?? {},
    timersColors: base.timersColors ?? {},
    defaultColorNames: base.defaultColorNames ?? {},
    overriddenDefaultColors: base.overriddenDefaultColors ?? {},
    hiddenDefaultColors: base.hiddenDefaultColors ?? [],
    timerFiltersEnabled:
      base.timerFiltersEnabled ?? DEFAULT_SETTINGS.timerFiltersEnabled,
    colorFiltersEnabled:
      base.colorFiltersEnabled ?? DEFAULT_SETTINGS.colorFiltersEnabled,
    timersSortOrder: base.timersSortOrder ?? DEFAULT_SETTINGS.timersSortOrder,
    syncEnabled: base.syncEnabled ?? DEFAULT_SETTINGS.syncEnabled,
    hiddenTimers: base.hiddenTimers ?? {},
    pinnedTimers: base.pinnedTimers ?? {},
    soundEnabledTimers: base.soundEnabledTimers ?? {},
    timersFilters: base.timersFilters ?? {},
    timerFiltersSearchText:
      base.timerFiltersSearchText ?? DEFAULT_SETTINGS.timerFiltersSearchText,
    updatedAt: base.updatedAt ?? DEFAULT_SETTINGS.updatedAt,
  };
};

const readLegacySettings = (): Partial<UserSettings> | null => {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { state?: Partial<UserSettings> };
    return parsed.state ?? null;
  } catch {
    return null;
  }
};

export const loadLocalSettings = (): UserSettings => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<UserSettings>;
      return withDefaults(parsed);
    } catch {
      // fall through to legacy/default
    }
  }

  const legacy = readLegacySettings();
  const fallback = withDefaults(legacy);
  saveLocalSettings(fallback);
  return fallback;
};

export const saveLocalSettings = (settings: UserSettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

const collectGuildIds = (settings: UserSettings): string[] => {
  return Array.from(
    new Set([
      ...Object.keys(settings.hiddenTimers ?? {}),
      ...Object.keys(settings.pinnedTimers ?? {}),
      ...Object.keys(settings.soundEnabledTimers ?? {}),
    ]),
  );
};

export const fetchCloudSettings = async (options?: {
  guildIds?: string[];
}): Promise<UserSettings> => {
  const client = createApiClient();
  const local = loadLocalSettings();
  const globalResponse =
    await client.get<UserTimerSettings>(TIMER_SETTINGS_PATH);

  const guildIds = new Set([
    ...(options?.guildIds ?? []),
    ...collectGuildIds(local),
  ]);

  const guildResponses = await Promise.all(
    Array.from(guildIds).map(async (guildId) => {
      const res = await client.get<UserGuildTimerSettings>(
        GUILD_TIMER_SETTINGS_PATH(guildId),
      );
      return [guildId, res.data] as const;
    }),
  );

  const hiddenTimers: HiddenTimers = {};
  const pinnedTimers: PinnedTimers = {};
  const soundEnabledTimers: SoundEnabledTimers = {};

  for (const [guildId, data] of guildResponses) {
    hiddenTimers[guildId] = data.hiddenTimers ?? [];
    pinnedTimers[guildId] = data.pinnedTimers ?? [];
    soundEnabledTimers[guildId] = data.soundEnabledTimers ?? [];
  }

  const merged = withDefaults({
    ...local,
    generalConfig: globalResponse.data.generalConfig,
    displayConfig: globalResponse.data.displayConfig,
    customColors: globalResponse.data.customColors,
    timersColors: globalResponse.data.timersColors,
    defaultColorNames: globalResponse.data.defaultColorNames,
    overriddenDefaultColors: globalResponse.data.overriddenDefaultColors,
    hiddenDefaultColors: globalResponse.data.hiddenDefaultColors,
    timerFiltersEnabled: globalResponse.data.timerFiltersEnabled,
    colorFiltersEnabled: globalResponse.data.colorFiltersEnabled,
    timersSortOrder: globalResponse.data.timersSortOrder,
    syncEnabled: globalResponse.data.syncEnabled,
    hiddenTimers: {
      ...local.hiddenTimers,
      ...hiddenTimers,
    },
    pinnedTimers: {
      ...local.pinnedTimers,
      ...pinnedTimers,
    },
    soundEnabledTimers: {
      ...local.soundEnabledTimers,
      ...soundEnabledTimers,
    },
    updatedAt: globalResponse.data.updatedAt
      ? new Date(globalResponse.data.updatedAt).getTime()
      : Date.now(),
  });

  saveLocalSettings(merged);
  return merged;
};

export const saveCloudSettings = async (
  settings: UserSettings,
  options?: { guildIds?: string[] },
): Promise<UserSettings> => {
  const client = createApiClient();

  const {
    hiddenTimers,
    pinnedTimers,
    soundEnabledTimers,
    timersFilters,
    timerFiltersSearchText,
    ...globalSettings
  } = settings;

  const globalPayload: Partial<UserTimerSettings> = {
    generalConfig: globalSettings.generalConfig,
    displayConfig: globalSettings.displayConfig,
    customColors: globalSettings.customColors,
    timersColors: globalSettings.timersColors,
    defaultColorNames: globalSettings.defaultColorNames,
    overriddenDefaultColors: globalSettings.overriddenDefaultColors,
    hiddenDefaultColors: globalSettings.hiddenDefaultColors,
    timerFiltersEnabled: globalSettings.timerFiltersEnabled,
    colorFiltersEnabled: globalSettings.colorFiltersEnabled,
    timersSortOrder: globalSettings.timersSortOrder,
    syncEnabled: globalSettings.syncEnabled,
  };

  const globalResponse = await client.patch<UserTimerSettings>(
    TIMER_SETTINGS_PATH,
    globalPayload,
  );

  const guildIds =
    options?.guildIds && options.guildIds.length > 0
      ? options.guildIds
      : collectGuildIds(settings);

  const guildResponses = await Promise.all(
    guildIds.map(async (guildId) => {
      const payload = {
        hiddenTimers: hiddenTimers[guildId] ?? [],
        pinnedTimers: pinnedTimers[guildId] ?? [],
        soundEnabledTimers: soundEnabledTimers[guildId] ?? [],
      };
      const res = await client.patch<UserGuildTimerSettings>(
        GUILD_TIMER_SETTINGS_PATH(guildId),
        payload,
      );
      return [guildId, res.data] as const;
    }),
  );

  const nextHidden: HiddenTimers = { ...hiddenTimers };
  const nextPinned: PinnedTimers = { ...pinnedTimers };
  const nextSound: SoundEnabledTimers = { ...soundEnabledTimers };

  for (const [guildId, data] of guildResponses) {
    nextHidden[guildId] = data.hiddenTimers ?? [];
    nextPinned[guildId] = data.pinnedTimers ?? [];
    nextSound[guildId] = data.soundEnabledTimers ?? [];
  }

  const merged = withDefaults({
    ...settings,
    generalConfig: globalResponse.data.generalConfig,
    displayConfig: globalResponse.data.displayConfig,
    customColors: globalResponse.data.customColors,
    timersColors: globalResponse.data.timersColors,
    defaultColorNames: globalResponse.data.defaultColorNames,
    overriddenDefaultColors: globalResponse.data.overriddenDefaultColors,
    hiddenDefaultColors: globalResponse.data.hiddenDefaultColors,
    timerFiltersEnabled: globalResponse.data.timerFiltersEnabled,
    colorFiltersEnabled: globalResponse.data.colorFiltersEnabled,
    timersSortOrder: globalResponse.data.timersSortOrder,
    syncEnabled: globalResponse.data.syncEnabled,
    hiddenTimers: nextHidden,
    pinnedTimers: nextPinned,
    soundEnabledTimers: nextSound,
    timersFilters,
    timerFiltersSearchText,
    updatedAt: globalResponse.data.updatedAt
      ? new Date(globalResponse.data.updatedAt).getTime()
      : Date.now(),
  });

  saveLocalSettings(merged);
  return merged;
};

const mergeSettings = (
  current: UserSettings,
  patch: Partial<UserSettings>,
): UserSettings => {
  return {
    ...current,
    ...patch,
    generalConfig: {
      ...current.generalConfig,
      ...patch.generalConfig,
    },
    displayConfig: {
      ...current.displayConfig,
      ...patch.displayConfig,
    },
    customColors: {
      ...current.customColors,
      ...patch.customColors,
    },
    timersColors: {
      ...current.timersColors,
      ...patch.timersColors,
    },
    defaultColorNames: {
      ...current.defaultColorNames,
      ...patch.defaultColorNames,
    },
    overriddenDefaultColors: {
      ...current.overriddenDefaultColors,
      ...patch.overriddenDefaultColors,
    },
    hiddenDefaultColors:
      patch.hiddenDefaultColors ?? current.hiddenDefaultColors,
    hiddenTimers: {
      ...current.hiddenTimers,
      ...patch.hiddenTimers,
    },
    pinnedTimers: {
      ...current.pinnedTimers,
      ...patch.pinnedTimers,
    },
    soundEnabledTimers: {
      ...current.soundEnabledTimers,
      ...patch.soundEnabledTimers,
    },
    timersFilters: {
      ...current.timersFilters,
      ...patch.timersFilters,
    },
    timerFiltersSearchText:
      patch.timerFiltersSearchText ?? current.timerFiltersSearchText,
    timerFiltersEnabled:
      patch.timerFiltersEnabled ?? current.timerFiltersEnabled,
    colorFiltersEnabled:
      patch.colorFiltersEnabled ?? current.colorFiltersEnabled,
    timersSortOrder: patch.timersSortOrder ?? current.timersSortOrder,
    syncEnabled: patch.syncEnabled ?? current.syncEnabled,
    updatedAt: Date.now(),
  };
};

const extractGuildIdsFromPatch = (
  patch: Partial<UserSettings>,
): string[] | undefined => {
  const guildIds = new Set<string>();
  if (patch.hiddenTimers) {
    Object.keys(patch.hiddenTimers).forEach((id) => guildIds.add(id));
  }
  if (patch.pinnedTimers) {
    Object.keys(patch.pinnedTimers).forEach((id) => guildIds.add(id));
  }
  if (patch.soundEnabledTimers) {
    Object.keys(patch.soundEnabledTimers).forEach((id) => guildIds.add(id));
  }

  return guildIds.size ? Array.from(guildIds) : undefined;
};

export const disableCloudSync = (queryClient: QueryClient) => {
  const current = loadLocalSettings();
  saveLocalSettings({ ...current, syncEnabled: false });
  setSyncMode("local");
  queryClient.invalidateQueries({ queryKey: ["user-settings"] });
};

export const enableCloudSync = async (
  queryClient: QueryClient,
  options?: { guildIds?: string[] },
) => {
  const local = loadLocalSettings();
  await saveCloudSettings({ ...local, syncEnabled: true }, options);
  setSyncMode("cloud");
  queryClient.invalidateQueries({ queryKey: ["user-settings"] });
};

export type UseUserSettingsOptions = {
  guildIds?: string[];
};

export const useUserSettings = (options?: UseUserSettingsOptions) => {
  const queryClient = useQueryClient();
  const [mode, setModeState] = useState<SettingsSyncMode>(() => getSyncMode());

  useEffect(() => {
    const unsubscribe = subscribeToSyncMode(setModeState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handler = () => setModeState(getSyncMode());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["user-settings"] });
  }, [mode, options?.guildIds?.join("|"), queryClient]);

  const query = useQuery<UserSettings>({
    queryKey: ["user-settings", mode],
    queryFn: () =>
      mode === "cloud"
        ? fetchCloudSettings({ guildIds: options?.guildIds })
        : Promise.resolve(loadLocalSettings()),
    initialData: () => loadLocalSettings(),
  });

  const mutation = useMutation<UserSettings, unknown, Partial<UserSettings>>({
    mutationFn: async (patch) => {
      const current = query.data ?? loadLocalSettings();
      const next = mergeSettings(current, patch);
      const guildIds = extractGuildIdsFromPatch(patch);

      if (mode === "cloud") {
        return saveCloudSettings(next, { guildIds });
      }

      saveLocalSettings(next);
      return next;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["user-settings", mode], data);
    },
  });

  const updateSettings = useCallback(
    (patch: Partial<UserSettings>) => mutation.mutate(patch),
    [mutation],
  );

  const updateSettingsAsync = useCallback(
    (patch: Partial<UserSettings>) => mutation.mutateAsync(patch),
    [mutation],
  );

  const settings = useMemo(
    () => query.data ?? loadLocalSettings(),
    [query.data],
  );

  const setMode = useCallback(
    (nextMode: SettingsSyncMode) => {
      setSyncMode(nextMode);
      setModeState(nextMode);
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
    [queryClient],
  );

  const setGeneralConfig = useCallback(
    (config: TimersGeneralConfig) => {
      updateSettings({ generalConfig: config });
    },
    [updateSettings],
  );

  const setDisplayConfig = useCallback(
    (config: TimersDisplayConfig) => {
      updateSettings({ displayConfig: config });
    },
    [updateSettings],
  );

  const setTimersFilters = useCallback(
    (guildId: string, filters: TimersFilters) => {
      updateSettings({
        timersFilters: {
          [guildId]: filters,
        },
      });
    },
    [updateSettings],
  );

  const setTimersSortOrder = useCallback(
    (order: "asc" | "desc") => {
      updateSettings({ timersSortOrder: order });
    },
    [updateSettings],
  );

  const toggleTimerFiltersEnabled = useCallback(() => {
    updateSettings({ timerFiltersEnabled: !settings.timerFiltersEnabled });
  }, [settings.timerFiltersEnabled, updateSettings]);

  const toggleColorFiltersEnabled = useCallback(() => {
    updateSettings({ colorFiltersEnabled: !settings.colorFiltersEnabled });
  }, [settings.colorFiltersEnabled, updateSettings]);

  const setTimerFiltersSearchText = useCallback(
    (text: string) => {
      updateSettings({ timerFiltersSearchText: text });
    },
    [updateSettings],
  );

  const hideTimer = useCallback(
    (guildId: string, timerId: string) => {
      if (!guildId) return;
      const currentHidden = settings.hiddenTimers[guildId] ?? [];
      const updatedHidden = [...new Set([...currentHidden, timerId])];
      updateSettings({
        hiddenTimers: { [guildId]: updatedHidden },
      });
    },
    [settings.hiddenTimers, updateSettings],
  );

  const revealTimer = useCallback(
    (guildId: string, timerId: string) => {
      if (!guildId) return;
      const currentHidden = settings.hiddenTimers[guildId] ?? [];
      const updatedHidden = currentHidden.filter((id) => id !== timerId);
      updateSettings({
        hiddenTimers: { [guildId]: updatedHidden },
      });
    },
    [settings.hiddenTimers, updateSettings],
  );

  const pinTimer = useCallback(
    (guildId: string, timerId: string) => {
      if (!guildId) return;
      const currentPinned = settings.pinnedTimers[guildId] ?? [];
      const updatedPinned = [...new Set([...currentPinned, timerId])];
      updateSettings({
        pinnedTimers: { [guildId]: updatedPinned },
      });
    },
    [settings.pinnedTimers, updateSettings],
  );

  const unpinTimer = useCallback(
    (guildId: string, timerId: string) => {
      if (!guildId) return;
      const currentPinned = settings.pinnedTimers[guildId] ?? [];
      const updatedPinned = currentPinned.filter((id) => id !== timerId);
      updateSettings({
        pinnedTimers: { [guildId]: updatedPinned },
      });
    },
    [settings.pinnedTimers, updateSettings],
  );

  const enableTimerSound = useCallback(
    (guildId: string, timerName: string) => {
      if (!guildId) return;
      const current = settings.soundEnabledTimers[guildId] ?? [];
      const updated = [...new Set([...current, timerName])];
      updateSettings({
        soundEnabledTimers: { [guildId]: updated },
      });
    },
    [settings.soundEnabledTimers, updateSettings],
  );

  const disableTimerSound = useCallback(
    (guildId: string, timerName: string) => {
      if (!guildId) return;
      const current = settings.soundEnabledTimers[guildId] ?? [];
      const updated = current.filter((name) => name !== timerName);
      updateSettings({
        soundEnabledTimers: { [guildId]: updated },
      });
    },
    [settings.soundEnabledTimers, updateSettings],
  );

  const setTimerColor = useCallback(
    (npcName: string, color?: string) => {
      updateSettings({
        timersColors: {
          [npcName]: color,
        },
      });
    },
    [updateSettings],
  );

  const addCustomColor = useCallback(
    (color: CustomTimerColor) => {
      updateSettings({
        customColors: {
          ...settings.customColors,
          [color.id]: color,
        },
      });
    },
    [settings.customColors, updateSettings],
  );

  const updateCustomColor = useCallback(
    (id: string, color: CustomTimerColor) => {
      updateSettings({
        customColors: {
          ...settings.customColors,
          [id]: color,
        },
      });
    },
    [settings.customColors, updateSettings],
  );

  const deleteCustomColor = useCallback(
    (id: string) => {
      const updatedCustomColors = { ...settings.customColors };
      delete updatedCustomColors[id];

      const updatedTimersColors = { ...settings.timersColors };
      Object.keys(updatedTimersColors).forEach((npcName) => {
        if (updatedTimersColors[npcName] === id) {
          updatedTimersColors[npcName] = undefined;
        }
      });

      updateSettings({
        customColors: updatedCustomColors,
        timersColors: updatedTimersColors,
      });
    },
    [settings.customColors, settings.timersColors, updateSettings],
  );

  const setDefaultColorName = useCallback(
    (colorId: string, name: string) => {
      updateSettings({
        defaultColorNames: {
          ...settings.defaultColorNames,
          [colorId]: name,
        },
      });
    },
    [settings.defaultColorNames, updateSettings],
  );

  const updateDefaultColor = useCallback(
    (colorId: string, borderColor: string, backgroundColor: string) => {
      updateSettings({
        overriddenDefaultColors: {
          ...settings.overriddenDefaultColors,
          [colorId]: { borderColor, backgroundColor },
        },
      });
    },
    [settings.overriddenDefaultColors, updateSettings],
  );

  const deleteDefaultColor = useCallback(
    (colorId: string) => {
      const updatedHiddenDefaultColors = [
        ...settings.hiddenDefaultColors,
        colorId,
      ];
      const updatedTimersColors = Object.fromEntries(
        Object.entries(settings.timersColors).map(([key, value]) =>
          value === colorId ? [key, undefined] : [key, value],
        ),
      );

      updateSettings({
        hiddenDefaultColors: updatedHiddenDefaultColors,
        timersColors: updatedTimersColors,
      });
    },
    [settings.hiddenDefaultColors, settings.timersColors, updateSettings],
  );

  const restoreDefaultColor = useCallback(
    (colorId: string) => {
      const updatedHiddenDefaultColors = settings.hiddenDefaultColors.filter(
        (id) => id !== colorId,
      );
      const newOverriddenColors = { ...settings.overriddenDefaultColors };
      delete newOverriddenColors[colorId];
      const newDefaultColorNames = { ...settings.defaultColorNames };
      delete newDefaultColorNames[colorId];

      updateSettings({
        hiddenDefaultColors: updatedHiddenDefaultColors,
        overriddenDefaultColors: newOverriddenColors,
        defaultColorNames: newDefaultColorNames,
      });
    },
    [
      settings.hiddenDefaultColors,
      settings.overriddenDefaultColors,
      settings.defaultColorNames,
      updateSettings,
    ],
  );

  return {
    data: settings,
    isLoading: query.isLoading || query.isFetching,
    isError: query.isError,
    updateSettings,
    updateSettingsAsync,
    mode,
    setMode,
    ...settings,
    setGeneralConfig,
    setDisplayConfig,
    setTimersFilters,
    setTimersSortOrder,
    toggleTimerFiltersEnabled,
    toggleColorFiltersEnabled,
    setTimerFiltersSearchText,
    hideTimer,
    revealTimer,
    pinTimer,
    unpinTimer,
    enableTimerSound,
    disableTimerSound,
    setTimerColor,
    addCustomColor,
    updateCustomColor,
    deleteCustomColor,
    setDefaultColorName,
    updateDefaultColor,
    deleteDefaultColor,
    restoreDefaultColor,
  };
};
