import { afterEach, describe, expect, it, vi } from "vitest";
import {
  settingsKeyMatches,
  useSettingsSaveStatusStore,
} from "./settings-save-status.store";

describe("settingsKeyMatches", () => {
  it("matches a row to writes of its key, a nested path or a parent document", () => {
    expect(
      settingsKeyMatches("appearance.npcColors", "appearance.npcColors"),
    ).toBe(true);
    expect(
      settingsKeyMatches("appearance.npcColors", "appearance.npcColors.titan"),
    ).toBe(true);
    expect(
      settingsKeyMatches("notifications.rules.hero", "notifications.rules"),
    ).toBe(true);
    expect(
      settingsKeyMatches("appearance.npcColors", "appearance.npcColorsExtra"),
    ).toBe(false);
  });
});

describe("useSettingsSaveStatusStore key marks", () => {
  afterEach(() => {
    vi.useRealTimers();
    useSettingsSaveStatusStore.setState({ keyMarks: {} });
    useSettingsSaveStatusStore.getState().setStatus("idle");
  });

  it("turns keys still saving into errors when the queue fails, then clears them", () => {
    vi.useFakeTimers();
    const store = useSettingsSaveStatusStore.getState();

    store.markKeys(["general.allowWorldSelection"], "saving");
    store.setStatus("error", () => {});

    expect(
      useSettingsSaveStatusStore.getState().keyMarks[
        "general.allowWorldSelection"
      ]?.status,
    ).toBe("error");

    vi.advanceTimersByTime(1600);

    expect(
      useSettingsSaveStatusStore.getState().keyMarks[
        "general.allowWorldSelection"
      ],
    ).toBeUndefined();
  });
});
