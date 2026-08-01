import { storageKey } from "@/lib/storage-key";
import { performanceStoreMiddleware } from "@/lib/performance-monitoring/store-middleware";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface EventModeSelectionState {
  selectedEventIdByScope: Record<string, string>;
  setSelectedEventId: (scope: string, eventId: string) => void;
}

const STORAGE_KEY = storageKey("ll:event-mode-selection:v1");

export const createEventModeSelectionScope = (
  margonemAccountId: string,
  normalizedWorld: string,
) => `${margonemAccountId}:${normalizedWorld}`;

export const useEventModeSelectionStore = create<EventModeSelectionState>()(
  performanceStoreMiddleware(
    "event-mode-selection",
    persist(
      (set) => ({
        selectedEventIdByScope: {},
        setSelectedEventId: (scope, eventId) =>
          set((state) => ({
            selectedEventIdByScope: {
              ...state.selectedEventIdByScope,
              [scope]: eventId,
            },
          })),
      }),
      {
        name: STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        version: 1,
        partialize: (state) => ({
          selectedEventIdByScope: state.selectedEventIdByScope,
        }),
      },
    ),
  ),
);
