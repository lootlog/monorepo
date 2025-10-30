import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SettingsState {
  allowWorldSelection?: boolean;
  world?: string;
  guildIdByCharId: Record<string, string>;
  selectedGuildIdsForTimersByCharId: Record<string, string[]>;
  setGuildId: (charId: string, guildId: string) => void;
  setSelectedGuildIdsForTimers: (charId: string, guildIds: string[]) => void;
  setWorld: (world: string) => void;
  toggleAllowWorldSelection: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      world: undefined,
      allowWorldSelection: false,
      guildIdByCharId: {},
      selectedGuildIdsForTimersByCharId: {},
      setGuildId: (charId: string, guildId: string) => {
        set((state) => ({
          guildIdByCharId: {
            ...state.guildIdByCharId,
            [charId]: guildId,
          },
        }));
      },
      setSelectedGuildIdsForTimers: (charId: string, guildIds: string[]) => {
        set((state) => ({
          selectedGuildIdsForTimersByCharId: {
            ...state.selectedGuildIdsForTimersByCharId,
            [charId]: guildIds,
          },
        }));
      },
      setWorld: (world: string) => {
        set({ world });
      },
      toggleAllowWorldSelection: () => {
        set((state) => ({ allowWorldSelection: !state.allowWorldSelection }));
      },
    }),
    {
      name: "ll:settings:state",
      partialize: (state) => ({
        allowWorldSelection: state.allowWorldSelection,
        world: state.world,
        guildIdByCharId: state.guildIdByCharId,
        selectedGuildIdsForTimersByCharId:
          state.selectedGuildIdsForTimersByCharId,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
);
