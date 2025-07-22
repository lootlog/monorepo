import { NpcType } from "@/hooks/api/use-npcs";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface TimersState {
  hiddenTimers: Record<string, string[]>;
  pinnedTimers: Record<string, string[]>;
  timersColors: Record<string, string | undefined>;
  removeTimerAfterMs: number;
  compactMode?: boolean;
  timersUnderBag?: boolean;
  timersGrouping?: boolean;
  timerFiltersEnabled?: boolean;
  timerFiltersSearchText?: string;
  timerFiltersSelectedNpcTypes: NpcType[];
  timerFiltersMinLvl: number;
  timerFiltersMaxLvl: number;
  timersSortOrder?: "asc" | "desc";
  setTimerFiltersMinLvl: (lvl: number) => void;
  setTimerFiltersMaxLvl: (lvl: number) => void;
  setTimersSortOrder: (order: "asc" | "desc") => void;
  toggleCompactMode: () => void;
  toggleTimersUnderBag: () => void;
  toggleTimersGrouping: () => void;
  toggleFiltersSelectedNpcTypes: (npcType: NpcType) => void;
  toggleTimerFiltersEnabled: () => void;
  setRemoveTimerAfterMs: (ms: number) => void;
  setTimerFiltersSearchText: (text: string) => void;
  addHiddenTimer: (
    accountId: string,
    characterId: string,
    timerId: string
  ) => void;
  removeHiddenTimer: (
    accountId: string,
    characterId: string,
    timerId: string
  ) => void;
  addPinnedTimer: (
    accountId: string,
    characterId: string,
    timerId: string
  ) => void;
  removePinnedTimer: (
    accountId: string,
    characterId: string,
    timerId: string
  ) => void;
  setTimerColor: (npcName: string, color?: string) => void;
}

const DEFAULT_REMOVE_TIMER_AFTER_MS = 30000;

const DEFAULT_SELECTED_NPC_TYPES = [
  NpcType.ELITE2,
  NpcType.HERO,
  NpcType.TITAN,
];
export const useTimersStore = create<TimersState>()(
  persist(
    (set, get) => ({
      hiddenTimers: {},
      pinnedTimers: {},
      timersColors: {},
      removeTimerAfterMs: DEFAULT_REMOVE_TIMER_AFTER_MS,
      compactMode: false,
      timersGrouping: true,
      timersUnderBag: false,
      timerFiltersEnabled: false,
      timerFiltersSearchText: "",
      timerFiltersMinLvl: 0,
      timerFiltersMaxLvl: 300,
      timerFiltersSelectedNpcTypes: DEFAULT_SELECTED_NPC_TYPES,
      timersSortOrder: "asc",
      setTimersSortOrder: (order: "asc" | "desc") => {
        set({ timersSortOrder: order });
      },
      setTimerFiltersMinLvl: (lvl: number) => {
        set({ timerFiltersMinLvl: lvl });
      },
      setTimerFiltersMaxLvl: (lvl: number) => {
        set({ timerFiltersMaxLvl: lvl });
      },
      toggleFiltersSelectedNpcTypes: (npcType: NpcType) => {
        set((state) => {
          const selected = state.timerFiltersSelectedNpcTypes.includes(npcType);
          return {
            timerFiltersSelectedNpcTypes: selected
              ? state.timerFiltersSelectedNpcTypes.filter(
                  (type) => type !== npcType
                )
              : [...state.timerFiltersSelectedNpcTypes, npcType],
          };
        });
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
      addHiddenTimer: (
        accountId: string,
        characterId: string,
        timerId: string
      ) => {
        const key = accountId + characterId;
        const currentHidden = get().hiddenTimers[key] || [];

        set({
          hiddenTimers: {
            ...get().hiddenTimers,
            [key]: [...new Set([...currentHidden, timerId])],
          },
        });
      },
      removeHiddenTimer: (
        accountId: string,
        characterId: string,
        timerId: string
      ) => {
        const key = accountId + characterId;
        const currentHidden = get().hiddenTimers[key] || [];
        const updatedHidden = currentHidden.filter((id) => id !== timerId);

        set({
          hiddenTimers: {
            ...get().hiddenTimers,
            [key]: updatedHidden,
          },
        });
      },
      addPinnedTimer: (
        accountId: string,
        characterId: string,
        timerId: string
      ) => {
        const key = accountId + characterId;
        const currentPinned = get().pinnedTimers[key] || [];

        set({
          pinnedTimers: {
            ...get().pinnedTimers,
            [key]: [...currentPinned, timerId],
          },
        });
      },
      removePinnedTimer: (
        accountId: string,
        characterId: string,
        timerId: string
      ) => {
        const key = accountId + characterId;
        const currentPinned = get().pinnedTimers[key] || [];
        const updatedPinned = currentPinned.filter((id) => id !== timerId);

        set({
          pinnedTimers: {
            ...get().pinnedTimers,
            [key]: updatedPinned,
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
        timerFiltersSelectedNpcTypes: state.timerFiltersSelectedNpcTypes,
        timerFiltersMaxLvl: state.timerFiltersMaxLvl,
        timerFiltersMinLvl: state.timerFiltersMinLvl,
        timersSortOrder: state.timersSortOrder,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
