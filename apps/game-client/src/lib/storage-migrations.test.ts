import { storageKey } from "@/lib/storage-key";
import { migrateRetiredLocalStorage } from "@/lib/storage-migrations";

describe("retired local storage migrations", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes only the retired Event Mode selection", () => {
    const eventModeSelectionKey = storageKey("ll:event-mode-selection:v1");
    const retainedKey = storageKey("ll:retained-state");
    localStorage.setItem(eventModeSelectionKey, "event-1");
    localStorage.setItem(retainedKey, "retained");

    migrateRetiredLocalStorage();

    expect(localStorage.getItem(eventModeSelectionKey)).toBeNull();
    expect(localStorage.getItem(retainedKey)).toBe("retained");
  });
});
