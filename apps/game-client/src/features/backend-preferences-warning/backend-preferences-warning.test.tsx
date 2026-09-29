import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { storageKey } from "@/lib/storage-key";
import { useGlobalStore } from "@/store/global.store";
import { useWindowsStore } from "@/store/windows.store";
import { BackendPreferencesWarning } from "./backend-preferences-warning";

const STORAGE_KEY = storageKey("ll:backend-preferences-warning-dismissed");

describe("BackendPreferencesWarning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 720,
    });

    useGlobalStore.setState({
      gameState: { gameInitialized: false },
      socketState: {
        connected: false,
        joined: false,
        joinedGuilds: [],
      },
    });

    useWindowsStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        open: false,
        state: {},
      },
      "backend-preferences-warning": {
        ...state["backend-preferences-warning"],
        open: false,
        position: { x: 0, y: 0 },
      },
      currentWindowFocus: undefined,
      windowFocusHistory: [],
    }));
  });

  it("stays closed for a player whose browser holds no legacy settings, even an empty leftover copy", async () => {
    window.localStorage.setItem(
      storageKey("ll-npc-detector-state"),
      '{"state":{}}',
    );

    useGlobalStore.setState({
      gameState: { gameInitialized: true },
      socketState: {
        connected: false,
        joined: false,
        joinedGuilds: [],
      },
    });

    render(<BackendPreferencesWarning />);

    await Promise.resolve();
    expect(useWindowsStore.getState()["backend-preferences-warning"].open).toBe(
      false,
    );
    expect(
      document.querySelector(
        '[data-ll-draggable-window="backend-preferences-warning"]',
      ),
    ).toBeNull();
  });

  it("tells a browser with legacy local settings once and opens the detector settings", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      storageKey("ll-npc-detector-state"),
      '{"state":{"settings":{"hero":{"detect":true}}},"version":0}',
    );

    useGlobalStore.setState({
      gameState: { gameInitialized: true },
      socketState: {
        connected: false,
        joined: false,
        joinedGuilds: [],
      },
    });

    render(<BackendPreferencesWarning />);

    await user.click(
      await screen.findByRole("button", { name: "Sprawdź ustawienia" }),
    );

    expect(useWindowsStore.getState().settings.open).toBe(true);
    expect(useWindowsStore.getState().settings.state).toEqual({
      activeTab: "detector",
      activeSubsection: "detector",
    });
    expect(useWindowsStore.getState()["backend-preferences-warning"].open).toBe(
      false,
    );
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
  });
});
