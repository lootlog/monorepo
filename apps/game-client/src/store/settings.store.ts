import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";

const STORAGE_KEY = storageKey("ll:settings:state");

export const migrateSettingsState = (persistedState: unknown) => {
  if (typeof persistedState !== "object" || persistedState === null) {
    return {};
  }

  return persistedState;
};

interface SettingsState {
  animationEffectsEnabled: boolean;
  lootDebugLoggingEnabled: boolean;
  masterVolume: number;
  soundsMuted: boolean;
  allowWorldSelection?: boolean;
  worldByGuildId: Record<string, string>;
  guildIdByCharId: Record<string, string>;
  selectedGuildIdsForTimersByCharId: Record<string, string[]>;
  ensureGuildId: (charId: string, orderedGuildIds: string[]) => void;
  setGuildId: (charId: string, guildId: string) => void;
  setSelectedGuildIdsForTimers: (charId: string, guildIds: string[]) => void;
  setLootDebugLoggingEnabled: (enabled: boolean) => void;
  setMasterVolume: (volume: number) => void;
  setWorld: (guildId: string, world: string) => void;
  toggleAnimationEffects: () => void;
  toggleAllowWorldSelection: () => void;
  toggleSoundsMuted: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      animationEffectsEnabled: true,
      lootDebugLoggingEnabled: false,
      masterVolume: 0.5,
      soundsMuted: false,
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
      setLootDebugLoggingEnabled: (lootDebugLoggingEnabled) => {
        set({ lootDebugLoggingEnabled });
      },
      setMasterVolume: (masterVolume) => {
        set({ masterVolume: Math.min(1, Math.max(0, masterVolume)) });
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
      toggleSoundsMuted: () => {
        set((state) => ({ soundsMuted: !state.soundsMuted }));
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        animationEffectsEnabled: state.animationEffectsEnabled,
        lootDebugLoggingEnabled: state.lootDebugLoggingEnabled,
        masterVolume: state.masterVolume,
        soundsMuted: state.soundsMuted,
        allowWorldSelection: state.allowWorldSelection,
        worldByGuildId: state.worldByGuildId,
        guildIdByCharId: state.guildIdByCharId,
        selectedGuildIdsForTimersByCharId:
          state.selectedGuildIdsForTimersByCharId,
      }),
      storage: createJSONStorage(() => localStorage),
      migrate: migrateSettingsState,
      version: 4,
    },
  ),
);
