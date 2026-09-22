// @vitest-environment happy-dom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import {
  parseThemeEffectsSettings,
  THEME_EFFECTS_STORAGE_KEY,
  themeEffectsStore,
} from "./theme-effects";
import { ThemeEffectsController } from "./theme-effects-controller";

afterEach(() => {
  cleanup();
  localStorage.clear();
  themeEffectsStore.reset();
  delete document.documentElement.dataset.themeEffects;
  delete document.documentElement.dataset.themeEffectsIdle;
});

it("falls back to full effects when the stored preference is unreadable", () => {
  expect(parseThemeEffectsSettings("{not json")).toEqual({
    level: "full",
    pauseWhenUnfocused: true,
  });
  expect(parseThemeEffectsSettings('{"level":"loud"}').level).toBe("full");
});

it("pauses ambient motion on blur only while the player asked for it", () => {
  render(<ThemeEffectsController />);
  const root = document.documentElement;

  expect(root.dataset.themeEffects).toBe("full");

  act(() => window.dispatchEvent(new Event("blur")));
  expect(root.dataset.themeEffectsIdle).toBe("");

  act(() => themeEffectsStore.set({ pauseWhenUnfocused: false }));
  expect(root.dataset.themeEffectsIdle).toBeUndefined();

  act(() => window.dispatchEvent(new Event("focus")));
  act(() => themeEffectsStore.set({ level: "subtle" }));
  expect(root.dataset.themeEffects).toBe("subtle");
  expect(
    JSON.parse(localStorage.getItem(THEME_EFFECTS_STORAGE_KEY) ?? "{}"),
  ).toEqual({ level: "subtle", pauseWhenUnfocused: false });
});
