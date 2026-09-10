import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";
import { isObjectRecord } from "@lootlog/schema/records";
import {
  isSettingsControlId,
  type SettingsControlId,
} from "./settings-manifest";

const STORAGE_KEY = storageKey("ll:settings:recent");

export const RECENTLY_CHANGED_LIMIT = 8;

export interface RecentlyChangedSetting {
  controlId: SettingsControlId;
  changedAt: number;
}

interface RecentlyChangedState {
  entries: RecentlyChangedSetting[];
  record: (controlId: SettingsControlId) => void;
  clear: () => void;
}

/** Device-local list of the controls the player touched most recently. */
export const useRecentlyChangedStore = create<RecentlyChangedState>()(
  persist(
    (set) => ({
      entries: [],
      record: (controlId) =>
        set((state) => ({
          entries: [
            { controlId, changedAt: Date.now() },
            ...state.entries.filter((entry) => entry.controlId !== controlId),
          ].slice(0, RECENTLY_CHANGED_LIMIT),
        })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({ entries: state.entries }),
      merge: (persisted, current) => {
        const persistedEntries =
          isObjectRecord(persisted) && Array.isArray(persisted.entries)
            ? persisted.entries
            : [];

        const entries: RecentlyChangedSetting[] = [];

        for (const entry of persistedEntries) {
          if (!isObjectRecord(entry)) continue;
          const controlId = String(entry.controlId);

          if (
            isSettingsControlId(controlId) &&
            Number.isFinite(entry.changedAt)
          ) {
            entries.push({ controlId, changedAt: Number(entry.changedAt) });
          }
        }

        return { ...current, entries };
      },
    },
  ),
);

export const recordRecentlyChanged = (controlId: SettingsControlId) =>
  useRecentlyChangedStore.getState().record(controlId);
