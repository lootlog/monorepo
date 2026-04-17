import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowsStore } from "@/store/windows.store";
import { Settings } from "./settings";

vi.mock("@/features/settings/components/settings-tabs", () => ({
  SettingsTabs: () => <div>Settings tabs</div>,
}));

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 720,
    });

    useWindowsStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        open: false,
        position: { x: 0, y: 0 },
        hasDefinedPosition: false,
        size: { width: 640, height: 440 },
        state: {},
      },
      currentWindowFocus: undefined,
      windowFocusHistory: [],
    }));
  });

  it("centers settings when there is no defined position", async () => {
    useWindowsStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        open: true,
        position: { x: 0, y: 0 },
        hasDefinedPosition: false,
        size: { width: 640, height: 440 },
      },
    }));

    render(<Settings />);

    const windowElement = await waitFor(() =>
      document.querySelector('[data-ll-draggable-window="settings"]'),
    );

    expect(windowElement).not.toBeNull();
    expect(windowElement).toHaveStyle({
      left: `${Math.round((1280 - 640) / 2)}px`,
      top: `${Math.round((720 - 440) / 2)}px`,
    });
    expect(useWindowsStore.getState().settings.position).toEqual({
      x: Math.round((1280 - 640) / 2),
      y: Math.round((720 - 440) / 2),
    });
    expect(useWindowsStore.getState().settings.hasDefinedPosition).toBe(true);
  });

  it("keeps an explicitly defined top-left position", async () => {
    useWindowsStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        open: true,
        position: { x: 0, y: 0 },
        hasDefinedPosition: true,
        size: { width: 640, height: 440 },
      },
    }));

    render(<Settings />);

    const windowElement = await waitFor(() =>
      document.querySelector('[data-ll-draggable-window="settings"]'),
    );

    expect(windowElement).not.toBeNull();
    expect(windowElement).toHaveStyle({
      left: "0px",
      top: "0px",
    });
    expect(useWindowsStore.getState().settings.position).toEqual({
      x: 0,
      y: 0,
    });
  });
});
