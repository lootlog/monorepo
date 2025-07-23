import { NpcType } from "@/hooks/api/use-npcs";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type TimersFilters = {
  minLvl: number;
  maxLvl: number;
  selectedNpcTypes: NpcType[];
};

type HiddenTimers = Record<string, string[]>;
type PinnedTimers = Record<string, string[]>;

interface TimersState {
  hiddenTimers: HiddenTimers;
  pinnedTimers: PinnedTimers;
  timersColors: Record<string, string | undefined>;
  removeTimerAfterMs: number;
  compactMode?: boolean;
  timersUnderBag?: boolean;
  timersGrouping?: boolean;
  timersFilters: Record<string, TimersFilters>;
  timerFiltersEnabled?: boolean;
  timerFiltersSearchText?: string;
  timersSortOrder?: "asc" | "desc";
  setTimersFilters: (guildId: string, filters: TimersFilters) => void;
  setTimersSortOrder: (order: "asc" | "desc") => void;
  toggleCompactMode: () => void;
  toggleTimersUnderBag: () => void;
  toggleTimersGrouping: () => void;
  toggleTimerFiltersEnabled: () => void;
  setRemoveTimerAfterMs: (ms: number) => void;
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
      removeTimerAfterMs: DEFAULT_REMOVE_TIMER_AFTER_MS,
      compactMode: false,
      timersGrouping: false,
      timersUnderBag: false,
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
      setRemoveTimerAfterMs: (ms: number) => {
        set({ removeTimerAfterMs: ms });
      },
      toggleCompactMode: () => {
        set((state) => ({ compactMode: !state.compactMode }));
      },
      toggleTimersUnderBag: () => {
        set((state) => ({ timersUnderBag: !state.timersUnderBag }));
      },
      toggleTimersGrouping: () => {
        set((state) => ({ timersGrouping: !state.timersGrouping }));
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
        removeTimerAfterMs: state.removeTimerAfterMs,
        compactMode: state.compactMode,
        timersGrouping: state.timersGrouping,
        timersUnderBag: state.timersUnderBag,
        timerFiltersEnabled: state.timerFiltersEnabled,
        timersSortOrder: state.timersSortOrder,
        timersFilters: state.timersFilters,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 2,
    }
  )
);
