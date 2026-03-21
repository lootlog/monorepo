import { NpcType } from "@/hooks/api/use-npcs";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  debouncedSyncGlobalSettings,
  debouncedSyncGuildSettings,
} from "./timer-settings-sync";

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
  deleteDefaultColor: (colorId: string) => void;
  restoreDefaultColor: (colorId: string) => void;
}

const DEFAULT_REMOVE_TIMER_AFTER_MS = 30000;

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

const getGuildTimerIds = (
  timersByGuild: Record<string, string[]>,
  guildId: string,
) => {
  return timersByGuild[guildId] ?? [];
};

const addTimerId = (timerIds: string[], timerId: string) => {
  return [...new Set([...timerIds, timerId])];
};

const removeTimerId = (timerIds: string[], timerId: string) => {
  return timerIds.filter((id) => id !== timerId);
};

export const useTimersStore = create<TimersState>()(
  persist(
    (set, get) => {
      const setWithTimestamp = updateTimestamp(set);

      return {
        hiddenTimers: {},
        pinnedTimers: {},
        timersColors: {},
        customColors: {},
        defaultColorNames: {},
        overriddenDefaultColors: {},
        hiddenDefaultColors: [],
        generalConfig: {
          removeTimerAfterMs: DEFAULT_REMOVE_TIMER_AFTER_MS,
          timersGrouping: false,
          timersUnderBag: false,
          countdownMode: "max",
          compactView: false,
        },
        setGeneralConfig: (config: TimersGeneralConfig) => {
          setWithTimestamp({ generalConfig: config });
          debouncedSyncGlobalSettings({
            generalConfig: config,
          });
        },
        displayConfig: {
          showType: true,
          showLevel: false,
          fontSize: 11,
          minColumnWidth: 120,
          singleTimerDisplayMode: "row",
        },
        setDisplayConfig: (config: TimersDisplayConfig) => {
          setWithTimestamp({ displayConfig: config });
          debouncedSyncGlobalSettings({
            displayConfig: config,
          });
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
          setWithTimestamp({ timersSortOrder: order });
          debouncedSyncGlobalSettings({
            timersSortOrder: order,
          });
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
          setWithTimestamp({ syncEnabled: enabled });
          debouncedSyncGlobalSettings({
            syncEnabled: enabled,
          });
        },
        hideTimer: (guildId: string, timerId: string) => {
          const updatedHidden = addTimerId(
            getGuildTimerIds(get().hiddenTimers, guildId),
            timerId,
          );

          setWithTimestamp({
            hiddenTimers: {
              ...get().hiddenTimers,
              [guildId]: updatedHidden,
            },
          });

          debouncedSyncGuildSettings(guildId, {
            hiddenTimers: updatedHidden,
          });
        },
        revealTimer: (guildId: string, timerId: string) => {
          const updatedHidden = removeTimerId(
            getGuildTimerIds(get().hiddenTimers, guildId),
            timerId,
          );

          setWithTimestamp({
            hiddenTimers: {
              ...get().hiddenTimers,
              [guildId]: updatedHidden,
            },
          });

          debouncedSyncGuildSettings(guildId, {
            hiddenTimers: updatedHidden,
          });
        },
        pinTimer: (guildId: string, timerId: string) => {
          const updatedPinned = addTimerId(
            getGuildTimerIds(get().pinnedTimers, guildId),
            timerId,
          );

          setWithTimestamp({
            pinnedTimers: {
              ...get().pinnedTimers,
              [guildId]: updatedPinned,
            },
          });

          debouncedSyncGuildSettings(guildId, {
            pinnedTimers: updatedPinned,
          });
        },
        unpinTimer: (guildId: string, timerId: string) => {
          const updatedPinned = removeTimerId(
            getGuildTimerIds(get().pinnedTimers, guildId),
            timerId,
          );

          setWithTimestamp({
            pinnedTimers: {
              ...get().pinnedTimers,
              [guildId]: updatedPinned,
            },
          });

          debouncedSyncGuildSettings(guildId, {
            pinnedTimers: updatedPinned,
          });
        },
        setTimerColor: (npcName: string, color?: string) => {
          const updatedTimersColors = {
            ...get().timersColors,
            [npcName]: color,
          };
          setWithTimestamp({ timersColors: updatedTimersColors });

          debouncedSyncGlobalSettings({
            timersColors: updatedTimersColors,
          });
        },
        addCustomColor: (color: CustomTimerColor) => {
          const updatedCustomColors = {
            ...get().customColors,
            [color.id]: color,
          };
          setWithTimestamp({ customColors: updatedCustomColors });

          debouncedSyncGlobalSettings({
            customColors: updatedCustomColors,
          });
        },
        updateCustomColor: (id: string, color: CustomTimerColor) => {
          const updatedCustomColors = {
            ...get().customColors,
            [id]: color,
          };
          setWithTimestamp({ customColors: updatedCustomColors });

          debouncedSyncGlobalSettings({
            customColors: updatedCustomColors,
          });
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

          setWithTimestamp({
            customColors: newCustomColors,
            timersColors: newTimersColors,
          });

          debouncedSyncGlobalSettings({
            customColors: newCustomColors,
            timersColors: newTimersColors,
          });
        },
        setDefaultColorName: (colorId: string, name: string) => {
          const updatedDefaultColorNames = {
            ...get().defaultColorNames,
            [colorId]: name,
          };
          setWithTimestamp({ defaultColorNames: updatedDefaultColorNames });

          debouncedSyncGlobalSettings({
            defaultColorNames: updatedDefaultColorNames,
          });
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
          setWithTimestamp({
            overriddenDefaultColors: updatedOverriddenDefaultColors,
          });

          debouncedSyncGlobalSettings({
            overriddenDefaultColors: updatedOverriddenDefaultColors,
          });
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

          setWithTimestamp({
            hiddenDefaultColors: updatedHiddenDefaultColors,
            timersColors: updatedTimersColors,
          });

          debouncedSyncGlobalSettings({
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

          setWithTimestamp({
            hiddenDefaultColors: updatedHiddenDefaultColors,
            overriddenDefaultColors: newOverriddenColors,
            defaultColorNames: newDefaultColorNames,
          });

          debouncedSyncGlobalSettings({
            hiddenDefaultColors: updatedHiddenDefaultColors,
            overriddenDefaultColors: newOverriddenColors,
            defaultColorNames: newDefaultColorNames,
          });
        },
      };
    },
    {
      name: "ll-timers-state",
      partialize: (state) => ({
        updatedAt: state.updatedAt,
        hiddenTimers: state.hiddenTimers,
        pinnedTimers: state.pinnedTimers,
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
      version: 6,
    },
  ),
);
