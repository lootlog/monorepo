import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";
import { createChangedOnlyStorage } from "./changed-only-storage";

const STORAGE_KEY = "changed-only-storage-test";

type State = { kept: string; transient: number };

const createPersistedStore = () =>
  createStore<State>()(
    persist(() => ({ kept: "initial", transient: 0 }), {
      name: STORAGE_KEY,
      partialize: ({ kept }) => ({ kept }),
      storage: createChangedOnlyStorage(createJSONStorage(() => localStorage)),
    }),
  );

describe("changed-only storage", () => {
  it("does not write hydrated values back over another tab's update when only transient fields change", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { kept: "hydrated" }, version: 0 }),
    );
    const store = createPersistedStore();
    expect(store.getState().kept).toBe("hydrated");

    const otherTab = JSON.stringify({ state: { kept: "other" }, version: 0 });
    localStorage.setItem(STORAGE_KEY, otherTab);
    store.setState({ transient: 1 });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(otherTab);

    store.setState({ kept: "changed" });
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null").state,
    ).toEqual({ kept: "changed" });
    localStorage.removeItem(STORAGE_KEY);
  });
});
