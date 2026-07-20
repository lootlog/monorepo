import { afterEach, describe, expect, it, vi } from "vitest";
import {
  debouncedSyncGuildSettings,
  debouncedSyncGlobalSettings,
  disposeTimerSettingsSync,
  registerGlobalSettingsMutation,
} from "./timer-settings-sync";

describe("timer settings sync lifecycle", () => {
  afterEach(() => {
    disposeTimerSettingsSync();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("unregisters the last mutation and cancels its pending callback", () => {
    vi.useFakeTimers();
    const mutate = vi.fn();
    const unregister = registerGlobalSettingsMutation(mutate);

    debouncedSyncGlobalSettings({ timerFiltersEnabled: true });
    unregister();
    unregister();
    vi.advanceTimersByTime(500);

    expect(mutate).not.toHaveBeenCalled();
  });

  it("keeps the latest mutation active when an older registration unmounts", () => {
    vi.useFakeTimers();
    const firstMutation = vi.fn();
    const secondMutation = vi.fn();
    const unregisterFirst = registerGlobalSettingsMutation(firstMutation);
    const unregisterSecond = registerGlobalSettingsMutation(secondMutation);

    unregisterFirst();
    debouncedSyncGlobalSettings({ syncEnabled: true });
    vi.advanceTimersByTime(500);

    expect(firstMutation).not.toHaveBeenCalled();
    expect(secondMutation).toHaveBeenCalledWith({ syncEnabled: true });
    unregisterSecond();
  });

  it("idempotently disposes every pending timeout and payload", () => {
    vi.useFakeTimers();
    const consoleWarning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const staleMutation = vi.fn();
    registerGlobalSettingsMutation(staleMutation);
    debouncedSyncGlobalSettings({ timerFiltersEnabled: true });
    debouncedSyncGuildSettings("guild-1", { hiddenTimers: ["Tanroth"] });

    disposeTimerSettingsSync();
    disposeTimerSettingsSync();
    vi.advanceTimersByTime(500);

    expect(staleMutation).not.toHaveBeenCalled();
    expect(consoleWarning).not.toHaveBeenCalled();

    const currentMutation = vi.fn();
    registerGlobalSettingsMutation(currentMutation);
    debouncedSyncGlobalSettings({ syncEnabled: true });
    vi.advanceTimersByTime(500);

    expect(currentMutation).toHaveBeenCalledWith({ syncEnabled: true });
  });
});
