import { renderHook } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  debouncedSyncGlobalSettings,
  disposeTimerSettingsSync,
} from "@/store/timer-settings-sync";
import { useTimerSettingsMutationsRegistry } from "./use-timer-settings-mutations-registry";

const mocks = vi.hoisted(() => ({
  mutateGlobalSettings: vi.fn(),
}));

vi.mock("./api/use-timer-settings", () => ({
  useUpdateTimerSettings: () => ({ mutate: mocks.mutateGlobalSettings }),
}));

const StrictModeWrapper = ({ children }: { children: ReactNode }) => (
  <StrictMode>{children}</StrictMode>
);

describe("useTimerSettingsMutationsRegistry", () => {
  afterEach(() => {
    disposeTimerSettingsSync();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does not deliver a pending mutation after StrictMode unmount", () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(useTimerSettingsMutationsRegistry, {
      wrapper: StrictModeWrapper,
    });

    debouncedSyncGlobalSettings({ syncEnabled: true });
    unmount();
    vi.advanceTimersByTime(500);

    expect(mocks.mutateGlobalSettings).not.toHaveBeenCalled();
  });
});
