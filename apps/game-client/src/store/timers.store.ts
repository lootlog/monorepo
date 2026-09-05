import type { UpdateTimerSettingsPayload } from "@lootlog/schema/timer-settings";
import { NpcType } from "@/api/npcs.api";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";
import {
  debouncedSyncGlobalSettings,
  debouncedSyncGuildSettings,
} from "./timer-settings-sync";

export const TIMERS_STORAGE_KEY = storageKey("ll-timers-state");

const DEFAULT_REMOVE_TIMER_AFTER_MS = 30000;

type TimersFilters = {
  minLvl: number;
  maxLvl: number;
  selectedNpcTypes: NpcType[];
  selectedColors: string[];
};

type TimersGeneralConfig = {
  removeTimerAfterMs: number;
  timersGrouping: boolean;
  timersUnderBag: boolean;
  countdownMode: "min" | "max";
  compactView: boolean;
};

const DEFAULT_GENERAL_CONFIG = {
  removeTimerAfterMs: DEFAULT_REMOVE_TIMER_AFTER_MS,
  timersGrouping: false,
  timersUnderBag: false,
  countdownMode: "max",
  compactView: false,
} satisfies TimersGeneralConfig;

type TimersDisplayConfig = {
  showType: boolean;
  showLevel: boolean;
  fontSize: number;
  minColumnWidth: number;
  singleTimerDisplayMode: "column" | "row";
};

type HiddenTimers = Record<string, string[]>;
type PinnedTimers = Record<string, string[]>;

export type CustomTimerColor = {
  id: string;
  name: string;
  borderColor: string;
  backgroundColor: string;
};

interface TimersState {
  updatedAt?: number;
  hiddenTimers: HiddenTimers;
  pinnedTimers: PinnedTimers;
  alwaysVisibleExpiredTimers: Record<string, string[]>;
  timersColors: Record<string, string | undefined>;
  customColors: Record<string, CustomTimerColor>;
  defaultColorNames: Record<string, string>;
  overriddenDefaultColors: Record<
    string,
    { borderColor: string; backgroundColor: string }
  >;
  hiddenDefaultColors: string[];
  timersFilters: Record<string, TimersFilters>;
  timerFiltersEnabled?: boolean;
  colorFiltersEnabled?: boolean;
  timerFiltersSearchText?: string;
  timersSortOrder?: "asc" | "desc";
  syncEnabled?: boolean;
  generalConfig: TimersGeneralConfig;
  setGeneralConfig: (config: TimersGeneralConfig) => void;
  displayConfig: TimersDisplayConfig;
  setDisplayConfig: (config: TimersDisplayConfig) => void;
  setTimersFilters: (guildId: string, filters: TimersFilters) => void;
  setTimersSortOrder: (order: "asc" | "desc") => void;
  toggleTimerFiltersEnabled: () => void;
  toggleColorFiltersEnabled: () => void;
  setTimerFiltersSearchText: (text: string) => void;
  setSyncEnabled: (enabled: boolean) => void;
  hideTimer: (guildId: string, timerId: string) => void;
  revealTimer: (guildId: string, timerId: string) => void;
  showExpiredTimerAlways: (world: string, timerKey: string) => void;
  hideExpiredTimerAlways: (world: string, timerKey: string) => void;
  pinTimer: (guildId: string, timerId: string) => void;
  unpinTimer: (guildId: string, timerId: string) => void;
  setTimerColor: (npcName: string, color?: string) => void;
  addCustomColor: (color: CustomTimerColor) => void;
  updateCustomColor: (id: string, color: CustomTimerColor) => void;
  deleteCustomColor: (id: string) => void;
  setDefaultColorName: (colorId: string, name: string) => void;
  updateDefaultColor: (
    colorId: string,
    borderColor: string,
    backgroundColor: string,
  ) => void;
  resetDefaultColor: (colorId: string) => void;
  deleteDefaultColor: (colorId: string) => void;
  restoreDefaultColor: (colorId: string) => void;
}

const DEFAULT_SELECTED_NPC_TYPES = [
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

const updateTimestamp = (
  set: (
    partial:
      | Partial<TimersState>
      | ((state: TimersState) => Partial<TimersState>),
  ) => void,
) => {
  return (
    partial:
      | Partial<TimersState>
      | ((state: TimersState) => Partial<TimersState>),
  ) => {
    if (typeof partial === "function") {
      set((state) => ({ ...partial(state), updatedAt: Date.now() }));
    } else {
      set({ ...partial, updatedAt: Date.now() });
    }
  };
};

export const useTimersStore = create<TimersState>()(
  persist(
    (set, get) => {
      const setWithTimestamp = updateTimestamp(set);
      const setGlobalSettings = (
        payload: UpdateTimerSettingsPayload & Partial<TimersState>,
      ) => {
        setWithTimestamp(payload);
        debouncedSyncGlobalSettings(payload);
      };

      const updateGuildTimerList = (
        field: "hiddenTimers" | "pinnedTimers",
        guildId: string,
        timerId: string,
        selected: boolean,
      ) => {
        const current = get()[field][guildId] ?? [];
        const next = selected
          ? [...new Set([...current, timerId])]
          : current.filter((id) => id !== timerId);
        setWithTimestamp({ [field]: { ...get()[field], [guildId]: next } });
        debouncedSyncGuildSettings(guildId, { [field]: next });
      };

      return {
        hiddenTimers: {},
        pinnedTimers: {},
        alwaysVisibleExpiredTimers: {},
        timersColors: {},
        customColors: {},
        defaultColorNames: {},
        overriddenDefaultColors: {},
        hiddenDefaultColors: [],
        generalConfig: DEFAULT_GENERAL_CONFIG,
        setGeneralConfig: (config: TimersGeneralConfig) => {
          setGlobalSettings({ generalConfig: config });
        },
        displayConfig: {
          showType: true,
          showLevel: false,
          fontSize: 11,
          minColumnWidth: 120,
          singleTimerDisplayMode: "row",
        },
        setDisplayConfig: (config: TimersDisplayConfig) => {
          setGlobalSettings({ displayConfig: config });
        },
        timerFiltersEnabled: false,
        colorFiltersEnabled: false,
        timerFiltersSearchText: "",
        timersSortOrder: "asc",
        syncEnabled: true,
        timersFilters: {},
        setTimersFilters: (guildId: string, filters: TimersFilters) => {
          setWithTimestamp((state) => ({
            timersFilters: {
              ...state.timersFilters,
              [guildId]: filters,
            },
          }));
        },
        setTimersSortOrder: (order: "asc" | "desc") => {
          setGlobalSettings({ timersSortOrder: order });
        },
        toggleTimerFiltersEnabled: () => {
          setWithTimestamp((state) => ({
            timerFiltersEnabled: !state.timerFiltersEnabled,
          }));
          const state = get();
          debouncedSyncGlobalSettings({
            timerFiltersEnabled: state.timerFiltersEnabled,
          });
        },
        toggleColorFiltersEnabled: () => {
          setWithTimestamp((state) => ({
            colorFiltersEnabled: !state.colorFiltersEnabled,
          }));
          const state = get();
          debouncedSyncGlobalSettings({
            colorFiltersEnabled: state.colorFiltersEnabled,
          });
        },
        setTimerFiltersSearchText: (text: string) => {
          set({ timerFiltersSearchText: text });
        },
        setSyncEnabled: (enabled: boolean) => {
          setGlobalSettings({ syncEnabled: enabled });
        },
        hideTimer: (guildId: string, timerId: string) =>
          updateGuildTimerList("hiddenTimers", guildId, timerId, true),
        revealTimer: (guildId: string, timerId: string) =>
          updateGuildTimerList("hiddenTimers", guildId, timerId, false),
        showExpiredTimerAlways: (world: string, timerKey: string) => {
          const currentTimerKeys =
            get().alwaysVisibleExpiredTimers[world] ?? [];
          const updatedTimerKeys = [
            ...new Set([...currentTimerKeys, timerKey]),
          ];
          const updatedAlwaysVisibleExpiredTimers = {
            ...get().alwaysVisibleExpiredTimers,
            [world]: updatedTimerKeys,
          };

          setGlobalSettings({
            alwaysVisibleExpiredTimers: updatedAlwaysVisibleExpiredTimers,
          });
        },
        hideExpiredTimerAlways: (world: string, timerKey: string) => {
          const currentTimerKeys =
            get().alwaysVisibleExpiredTimers[world] ?? [];
          const updatedTimerKeys = currentTimerKeys.filter(
            (key) => key !== timerKey,
          );
          const updatedAlwaysVisibleExpiredTimers = {
            ...get().alwaysVisibleExpiredTimers,
            [world]: updatedTimerKeys,
          };

          setGlobalSettings({
            alwaysVisibleExpiredTimers: updatedAlwaysVisibleExpiredTimers,
          });
        },
        pinTimer: (guildId: string, timerId: string) =>
          updateGuildTimerList("pinnedTimers", guildId, timerId, true),
        unpinTimer: (guildId: string, timerId: string) =>
          updateGuildTimerList("pinnedTimers", guildId, timerId, false),
        setTimerColor: (npcName: string, color?: string) => {
          const updatedTimersColors = {
            ...get().timersColors,
            [npcName]: color,
          };
          setGlobalSettings({ timersColors: updatedTimersColors });
        },
        addCustomColor: (color: CustomTimerColor) => {
          const updatedCustomColors = {
            ...get().customColors,
            [color.id]: color,
          };
          setGlobalSettings({ customColors: updatedCustomColors });
        },
        updateCustomColor: (id: string, color: CustomTimerColor) => {
          const updatedCustomColors = {
            ...get().customColors,
            [id]: color,
          };
          setGlobalSettings({ customColors: updatedCustomColors });
        },
        deleteCustomColor: (id: string) => {
          const state = get();
          const newCustomColors = { ...state.customColors };
          delete newCustomColors[id];

          const newTimersColors = { ...state.timersColors };
          Object.keys(newTimersColors).forEach((npcName) => {
            if (newTimersColors[npcName] === id) {
              newTimersColors[npcName] = undefined;
            }
          });

          setGlobalSettings({
            customColors: newCustomColors,
            timersColors: newTimersColors,
          });
        },
        setDefaultColorName: (colorId: string, name: string) => {
          const updatedDefaultColorNames = {
            ...get().defaultColorNames,
            [colorId]: name,
          };
          setGlobalSettings({ defaultColorNames: updatedDefaultColorNames });
        },
        updateDefaultColor: (
          colorId: string,
          borderColor: string,
          backgroundColor: string,
        ) => {
          const updatedOverriddenDefaultColors = {
            ...get().overriddenDefaultColors,
            [colorId]: { borderColor, backgroundColor },
          };
          setGlobalSettings({
            overriddenDefaultColors: updatedOverriddenDefaultColors,
          });
        },
        resetDefaultColor: (colorId: string) => {
          const state = get();
          const overriddenDefaultColors = {
            ...state.overriddenDefaultColors,
          };
          const defaultColorNames = { ...state.defaultColorNames };
          delete overriddenDefaultColors[colorId];
          delete defaultColorNames[colorId];
          setGlobalSettings({ overriddenDefaultColors, defaultColorNames });
        },
        deleteDefaultColor: (colorId: string) => {
          const state = get();
          const updatedHiddenDefaultColors = [
            ...state.hiddenDefaultColors,
            colorId,
          ];
          const updatedTimersColors = Object.fromEntries(
            Object.entries(state.timersColors).map(([key, value]) =>
              value === colorId ? [key, undefined] : [key, value],
            ),
          );

          setGlobalSettings({
            hiddenDefaultColors: updatedHiddenDefaultColors,
            timersColors: updatedTimersColors,
          });
        },
        restoreDefaultColor: (colorId: string) => {
          const state = get();
          const updatedHiddenDefaultColors = state.hiddenDefaultColors.filter(
            (id) => id !== colorId,
          );
          const newOverriddenColors = { ...state.overriddenDefaultColors };
          delete newOverriddenColors[colorId];
          const newDefaultColorNames = { ...state.defaultColorNames };
          delete newDefaultColorNames[colorId];

          setGlobalSettings({
            hiddenDefaultColors: updatedHiddenDefaultColors,
            overriddenDefaultColors: newOverriddenColors,
            defaultColorNames: newDefaultColorNames,
          });
        },
      };
    },
    {
      name: TIMERS_STORAGE_KEY,
      partialize: (state) => ({
        updatedAt: state.updatedAt,
        hiddenTimers: state.hiddenTimers,
        pinnedTimers: state.pinnedTimers,
        alwaysVisibleExpiredTimers: state.alwaysVisibleExpiredTimers,
        timersColors: state.timersColors,
        customColors: state.customColors,
        defaultColorNames: state.defaultColorNames,
        overriddenDefaultColors: state.overriddenDefaultColors,
        hiddenDefaultColors: state.hiddenDefaultColors,
        timerFiltersEnabled: state.timerFiltersEnabled,
        colorFiltersEnabled: state.colorFiltersEnabled,
        timersSortOrder: state.timersSortOrder,
        syncEnabled: state.syncEnabled,
        timersFilters: state.timersFilters,
        generalConfig: state.generalConfig,
        displayConfig: state.displayConfig,
      }),
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TimersState> | undefined;

        return {
          ...currentState,
          ...persisted,
          generalConfig: {
            ...DEFAULT_GENERAL_CONFIG,
            ...persisted?.generalConfig,
          },
          alwaysVisibleExpiredTimers:
            persisted?.alwaysVisibleExpiredTimers ?? {},
        };
      },
      version: 6,
    },
  ),
);
