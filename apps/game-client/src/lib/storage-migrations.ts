import { storageKey } from "@/lib/storage-key";

const RETIRED_EVENT_MODE_SELECTION_KEY = storageKey(
  "ll:event-mode-selection:v1",
);

export function migrateRetiredLocalStorage(): void {
  // Temporary tombstone. Remove after one release cycle.
  window.localStorage.removeItem(RETIRED_EVENT_MODE_SELECTION_KEY);
}
