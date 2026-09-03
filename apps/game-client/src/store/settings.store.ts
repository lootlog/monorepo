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
  presenceDefaultOrganizationIdByClanKey: Record<string, string>;
  selectedGuildIdsForTimersByCharId: Record<string, string[]>;
  presenceOrganizationIdsByCharId: Record<string, string[]>;
  ensureGuildId: (
    charId: string,
    orderedGuildIds: string[],
    currentClanKey?: string,
  ) => void;
  setGuildId: (
    charId: string,
    guildId: string,
    currentClanKey?: string,
  ) => void;
  setSelectedGuildIdsForTimers: (charId: string, guildIds: string[]) => void;
  setPresenceOrganizationIds: (
    charId: string,
    organizationIds: string[],
  ) => void;
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
      presenceDefaultOrganizationIdByClanKey: {},
      selectedGuildIdsForTimersByCharId: {},
      presenceOrganizationIdsByCharId: {},
      ensureGuildId: (charId, orderedGuildIds, currentClanKey) => {
        set((state) => {
          const currentGuildId = state.guildIdByCharId[charId];
          const hasCurrentGuild =
            currentGuildId === "all" ||
            Boolean(currentGuildId && orderedGuildIds.includes(currentGuildId));
          const selectedGuildId = hasCurrentGuild
            ? currentGuildId
            : orderedGuildIds[0];
          if (!selectedGuildId) return state;

          const currentDefaults =
            state.presenceDefaultOrganizationIdByClanKey ?? {};
          const shouldSetPresenceDefault =
            currentClanKey !== undefined &&
            selectedGuildId !== "all" &&
            (hasCurrentGuild || orderedGuildIds.length === 1) &&
            currentDefaults[currentClanKey] === undefined;

          if (hasCurrentGuild && !shouldSetPresenceDefault) return state;

          return {
            ...(hasCurrentGuild
              ? {}
              : {
                  guildIdByCharId: {
                    ...state.guildIdByCharId,
                    [charId]: selectedGuildId,
                  },
                }),
            ...(shouldSetPresenceDefault
              ? {
                  presenceDefaultOrganizationIdByClanKey: {
                    ...currentDefaults,
                    [currentClanKey]: selectedGuildId,
                  },
                }
              : {}),
          };
        });
      },
      setGuildId: (charId, guildId, currentClanKey) => {
        set((state) => {
          return {
            guildIdByCharId: {
              ...state.guildIdByCharId,
              [charId]: guildId,
            },
            ...(currentClanKey !== undefined && guildId !== "all"
              ? {
                  presenceDefaultOrganizationIdByClanKey: {
                    ...state.presenceDefaultOrganizationIdByClanKey,
                    [currentClanKey]: guildId,
                  },
                }
              : {}),
          };
        });
      },
      setSelectedGuildIdsForTimers: (charId: string, guildIds: string[]) => {
        set((state) => ({
          selectedGuildIdsForTimersByCharId: {
            ...state.selectedGuildIdsForTimersByCharId,
            [charId]: guildIds,
          },
        }));
      },
      setPresenceOrganizationIds: (charId, organizationIds) => {
        set((state) => ({
          presenceOrganizationIdsByCharId: {
            ...state.presenceOrganizationIdsByCharId,
            [charId]: [...new Set(organizationIds)],
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
        presenceDefaultOrganizationIdByClanKey:
          state.presenceDefaultOrganizationIdByClanKey,
        selectedGuildIdsForTimersByCharId:
          state.selectedGuildIdsForTimersByCharId,
        presenceOrganizationIdsByCharId: state.presenceOrganizationIdsByCharId,
      }),
      storage: createJSONStorage(() => localStorage),
      migrate: migrateSettingsState,
      version: 6,
    },
  ),
);
