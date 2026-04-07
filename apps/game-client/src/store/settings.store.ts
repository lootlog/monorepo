import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";

const STORAGE_KEY = storageKey("ll:settings:state");

interface SettingsState {
  allowWorldSelection?: boolean;
  worldByGuildId: Record<string, string>;
  guildIdByCharId: Record<string, string>;
  selectedGuildIdsForTimersByCharId: Record<string, string[]>;
  setGuildId: (charId: string, guildId: string) => void;
  setSelectedGuildIdsForTimers: (charId: string, guildIds: string[]) => void;
  setWorld: (guildId: string, world: string) => void;
  toggleAllowWorldSelection: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      allowWorldSelection: false,
      worldByGuildId: {},
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
      setWorld: (guildId: string, world: string) => {
        set((state) => ({
          worldByGuildId: {
            ...state.worldByGuildId,
            [guildId]: world,
          },
        }));
      },
      toggleAllowWorldSelection: () => {
        set((state) => ({ allowWorldSelection: !state.allowWorldSelection }));
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        allowWorldSelection: state.allowWorldSelection,
        worldByGuildId: state.worldByGuildId,
        guildIdByCharId: state.guildIdByCharId,
        selectedGuildIdsForTimersByCharId:
          state.selectedGuildIdsForTimersByCharId,
      }),
      storage: createJSONStorage(() => localStorage),
      version: 3,
    },
  ),
);
