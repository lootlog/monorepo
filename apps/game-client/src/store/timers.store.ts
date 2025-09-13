import { NpcType } from "@/hooks/api/use-npcs";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type TimersFilters = {
  minLvl: number;
  maxLvl: number;
  selectedNpcTypes: NpcType[];
};

type TimersGeneralConfig = {
  removeTimerAfterMs: number;
  timersGrouping: boolean;
  timersUnderBag: boolean;
  countdownMode: "min" | "max";
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

interface TimersState {
  hiddenTimers: HiddenTimers;
  pinnedTimers: PinnedTimers;
  timersColors: Record<string, string | undefined>;
  timersFilters: Record<string, TimersFilters>;
  timerFiltersEnabled?: boolean;
  timerFiltersSearchText?: string;
  timersSortOrder?: "asc" | "desc";
  generalConfig: TimersGeneralConfig;
  setGeneralConfig: (config: TimersGeneralConfig) => void;
  displayConfig: TimersDisplayConfig;
  setDisplayConfig: (config: TimersDisplayConfig) => void;
  setTimersFilters: (guildId: string, filters: TimersFilters) => void;
  setTimersSortOrder: (order: "asc" | "desc") => void;
  toggleTimerFiltersEnabled: () => void;
  setTimerFiltersSearchText: (text: string) => void;
  hideTimer: (guildId: string, timerId: string) => void;
  revealTimer: (guildId: string, timerId: string) => void;
  pinTimer: (guildId: string, timerId: string) => void;
  unpinTimer: (guildId: string, timerId: string) => void;
  setTimerColor: (npcName: string, color?: string) => void;
}

const DEFAULT_REMOVE_TIMER_AFTER_MS = 30000;

const DEFAULT_SELECTED_NPC_TYPES = [
  NpcType.ELITE2,
  NpcType.HERO,
  NpcType.TITAN,
];

export const DEFAULT_TIMERS_FILTERS: TimersFilters = {
  minLvl: 0,
  maxLvl: 300,
  selectedNpcTypes: DEFAULT_SELECTED_NPC_TYPES,
};

export const useTimersStore = create<TimersState>()(
  persist(
    (set, get) => ({
      hiddenTimers: {},
      pinnedTimers: {},
      timersColors: {},
      generalConfig: {
        removeTimerAfterMs: DEFAULT_REMOVE_TIMER_AFTER_MS,
        timersGrouping: false,
        timersUnderBag: false,
        countdownMode: "max",
      },
      setGeneralConfig: (config: TimersGeneralConfig) => {
        set({ generalConfig: config });
      },
      displayConfig: {
        showType: false,
        showLevel: false,
        fontSize: 11,
        minColumnWidth: 120,
        singleTimerDisplayMode: "row",
      },
      setDisplayConfig: (config: TimersDisplayConfig) => {
        set({ displayConfig: config });
      },
      timerFiltersEnabled: false,
      timerFiltersSearchText: "",
      timersSortOrder: "asc",
      timersFilters: {},
      setTimersFilters: (guildId: string, filters: TimersFilters) => {
        set((state) => ({
          timersFilters: {
            ...state.timersFilters,
            [guildId]: filters,
          },
        }));
      },
      setTimersSortOrder: (order: "asc" | "desc") => {
        set({ timersSortOrder: order });
      },
      toggleTimerFiltersEnabled: () => {
        set((state) => ({ timerFiltersEnabled: !state.timerFiltersEnabled }));
      },
      setTimerFiltersSearchText: (text: string) => {
        set({ timerFiltersSearchText: text });
      },
      hideTimer: (guildId: string, timerId: string) => {
        const currentHidden = get().hiddenTimers[guildId] || [];

        set({
          hiddenTimers: {
            ...get().hiddenTimers,
            [guildId]: [...new Set([...currentHidden, timerId])],
          },
        });
      },
      revealTimer: (guildId: string, timerId: string) => {
        const currentHidden = get().hiddenTimers[guildId] || [];
        const updatedHidden = currentHidden.filter((id) => id !== timerId);

        set({
          hiddenTimers: {
            ...get().hiddenTimers,
            [guildId]: updatedHidden,
          },
        });
      },
      pinTimer: (guildId: string, timerId: string) => {
        const currentPinned = get().pinnedTimers[guildId] || [];

        set({
          pinnedTimers: {
            ...get().pinnedTimers,
            [guildId]: [...new Set([...currentPinned, timerId])],
          },
        });
      },
      unpinTimer: (guildId: string, timerId: string) => {
        const currentPinned = get().pinnedTimers[guildId] || [];
        const updatedPinned = currentPinned.filter((id) => id !== timerId);

        set({
          pinnedTimers: {
            ...get().pinnedTimers,
            [guildId]: updatedPinned,
          },
        });
      },
      setTimerColor: (npcName: string, color?: string) => {
        set((state) => ({
          timersColors: {
            ...state.timersColors,
            [npcName]: color,
          },
        }));
      },
    }),
    {
      name: "ll-timers-state",
      partialize: (state) => ({
        hiddenTimers: state.hiddenTimers,
        pinnedTimers: state.pinnedTimers,
        timersColors: state.timersColors,
        timerFiltersEnabled: state.timerFiltersEnabled,
        timersSortOrder: state.timersSortOrder,
        timersFilters: state.timersFilters,
        generalConfig: state.generalConfig,
        displayConfig: state.displayConfig,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 2,
    }
  )
);
