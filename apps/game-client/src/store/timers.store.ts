import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface TimersState {
  hiddenTimers: Record<string, string[]>;
  pinnedTimers: Record<string, string[]>;
  timersColors: Record<string, string | undefined>;
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

export const useTimersStore = create<TimersState>()(
  // @ts-ignore
  persist(
    (set, get) => ({
      hiddenTimers: {},
      pinnedTimers: {},
      timersColors: {},
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
            [key]: [...currentHidden, timerId],
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
      }),
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
