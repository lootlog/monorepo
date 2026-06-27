import { storageKey } from "@/lib/storage-key";
import { afterEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "./settings.store";

const SETTINGS_STORAGE_KEY = storageKey("ll:settings:state");

describe("useSettingsStore", () => {
  afterEach(() => {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  });

  it("enables animation effects by default", () => {
    expect(useSettingsStore.getState().animationEffectsEnabled).toBe(true);
  });

  it("toggles animation effects", () => {
    useSettingsStore.getState().toggleAnimationEffects();

    expect(useSettingsStore.getState().animationEffectsEnabled).toBe(false);

    useSettingsStore.getState().toggleAnimationEffects();

    expect(useSettingsStore.getState().animationEffectsEnabled).toBe(true);
  });

  it("persists animation effects in settings storage", () => {
    useSettingsStore.getState().toggleAnimationEffects();

    const storedSettings = JSON.parse(
      localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}",
    ) as {
      state?: {
        animationEffectsEnabled?: boolean;
      };
    };

    expect(storedSettings.state?.animationEffectsEnabled).toBe(false);
  });
});
