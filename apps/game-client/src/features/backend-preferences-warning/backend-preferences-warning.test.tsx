import { render, screen, waitFor } from "@testing-library/react";
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

  it("renders the warning window centered after opening", async () => {
    useGlobalStore.setState({
      gameState: { gameInitialized: true },
      socketState: {
        connected: false,
        joined: false,
        joinedGuilds: [],
      },
    });

    render(<BackendPreferencesWarning />);

    const windowElement = await waitFor(() =>
      document.querySelector(
        '[data-ll-draggable-window="backend-preferences-warning"]',
      ),
    );

    expect(windowElement).not.toBeNull();
    expect(screen.getByText("Zmiana ustawień")).toBeInTheDocument();
    expect(windowElement).toHaveStyle({
      left: `${Math.round((1280 - 430) / 2)}px`,
      top: `${Math.round((720 - 250) / 2)}px`,
    });
    expect(
      useWindowsStore.getState()["backend-preferences-warning"].position,
    ).toEqual({
      x: Math.round((1280 - 430) / 2),
      y: Math.round((720 - 250) / 2),
    });
  });

  it("opens settings directly on the detector tab", async () => {
    const user = userEvent.setup();

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
      await screen.findByRole("button", { name: "Otwórz ustawienia" }),
    );

    expect(useWindowsStore.getState().settings.open).toBe(true);
    expect(useWindowsStore.getState().settings.state).toEqual({
      activeTab: "npc-detector",
    });
    expect(useWindowsStore.getState()["backend-preferences-warning"].open).toBe(
      false,
    );
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
  });
});
