import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";

const STORAGE_KEY = storageKey("ll:settings:state");

interface SettingsState {
  animationEffectsEnabled: boolean;
  allowWorldSelection?: boolean;
  worldByGuildId: Record<string, string>;
  guildIdByCharId: Record<string, string>;
  selectedGuildIdsForTimersByCharId: Record<string, string[]>;
  ensureGuildId: (charId: string, orderedGuildIds: string[]) => void;
  setGuildId: (charId: string, guildId: string) => void;
  setSelectedGuildIdsForTimers: (charId: string, guildIds: string[]) => void;
  setWorld: (guildId: string, world: string) => void;
  toggleAnimationEffects: () => void;
  toggleAllowWorldSelection: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      animationEffectsEnabled: true,
      allowWorldSelection: false,
      worldByGuildId: {},
      guildIdByCharId: {},
      selectedGuildIdsForTimersByCharId: {},
      ensureGuildId: (charId: string, orderedGuildIds: string[]) => {
        set((state) => {
          const currentGuildId = state.guildIdByCharId[charId];
          if (
            currentGuildId === "all" ||
            (currentGuildId && orderedGuildIds.includes(currentGuildId))
          ) {
            return state;
          }

          const fallbackGuildId = orderedGuildIds[0];
          if (!fallbackGuildId) {
            return state;
          }

          return {
            guildIdByCharId: {
              ...state.guildIdByCharId,
              [charId]: fallbackGuildId,
            },
          };
        });
      },
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
      toggleAnimationEffects: () => {
        set((state) => ({
          animationEffectsEnabled: !state.animationEffectsEnabled,
        }));
      },
      toggleAllowWorldSelection: () => {
        set((state) => ({ allowWorldSelection: !state.allowWorldSelection }));
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        animationEffectsEnabled: state.animationEffectsEnabled,
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
