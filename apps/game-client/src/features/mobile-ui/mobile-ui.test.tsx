import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { QuickAccess } from "@/features/quick-access/quick-access";
import { useWindowOpen } from "@/hooks/ui/use-window-open";
import { useMobileUiStore } from "@/store/mobile-ui.store";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowsStore, type WindowId } from "@/store/windows.store";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { MobileUiShell } from "./mobile-ui-shell";

const initialWidth = window.innerWidth;

const initialHeight = window.innerHeight;

const setViewport = async (width: number, height: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
  await act(() => {
    window.dispatchEvent(new Event("resize"));
  });
};

const TestWindow = ({
  id,
  title,
  body,
}: {
  id: WindowId;
  title: string;
  body: string;
}) => {
  const open = useWindowOpen(id);
  const setOpen = useWindowsStore((state) => state.setOpen);

  return (
    <DraggableWindow
      isOpen={open}
      id={id}
      title={title}
      onClose={() => setOpen(id, false)}
    >
      <div>{body}</div>
    </DraggableWindow>
  );
};

describe("Mobile UI mode", () => {
  beforeEach(async () => {
    useSettingsStore.setState({
      ...useSettingsStore.getInitialState(),
      animationEffectsEnabled: false,
      mobileUiMode: "on",
    });
    useMobileUiStore.setState({
      ...useMobileUiStore.getInitialState(),
      activePanel: null,
      lastPanel: "timers",
      sheetExpanded: false,
      pillPosition: null,
    });
    useWindowsStore.setState((state) => ({
      ...state,
      "quick-access": {
        ...state["quick-access"],
        open: true,
        collapsed: false,
      },
      timers: {
        ...state.timers,
        open: true,
        position: { x: 120, y: 80 },
        hasDefinedPosition: true,
      },
      chat: {
        ...state.chat,
        open: true,
        position: { x: 400, y: 80 },
        hasDefinedPosition: true,
      },
      notifications: { ...state.notifications, open: false },
      settings: { ...state.settings, open: false, state: {} },
    }));
    await setViewport(390, 844);
  });

  afterEach(async () => {
    cleanup();
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    useMobileUiStore.setState(useMobileUiStore.getInitialState(), true);
    await setViewport(initialWidth, initialHeight);
  });

  it("starts collapsed to the floating pill, switches single active panels, and preserves desktop layout when toggled off", async () => {
    const user = userEvent.setup();
    const fixture = createGuildPreferencesTest();

    render(
      <QueryClientProvider client={fixture.queryClient}>
        <MobileUiShell>
          <QuickAccess />
          <TestWindow id="timers" title="Timery" body="Treść timerów" />
          <TestWindow id="chat" title="Czat" body="Treść czatu" />
        </MobileUiShell>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Otwórz panel Lootloga" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Treść timerów")).toBeNull();
    expect(screen.queryByText("Treść czatu")).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Otwórz panel Lootloga" }),
    );

    expect(screen.getByText("Treść timerów")).toBeInTheDocument();
    expect(screen.queryByText("Treść czatu")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Otwórz panel Lootloga" }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Czat" }));

    expect(screen.getByText("Treść czatu")).toBeInTheDocument();
    expect(screen.queryByText("Treść timerów")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Zamknij okno" }));

    expect(screen.queryByText("Treść czatu")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Otwórz panel Lootloga" }),
    ).toBeInTheDocument();

    act(() => {
      useSettingsStore.getState().setMobileUiMode("off");
    });

    expect(screen.getByText("Treść timerów")).toBeInTheDocument();
    expect(screen.getByText("Treść czatu")).toBeInTheDocument();
    expect(useWindowsStore.getState().timers.position).toEqual({
      x: 120,
      y: 80,
    });
    expect(useWindowsStore.getState().chat.position).toEqual({
      x: 400,
      y: 80,
    });
  });

  it("closes the active portrait panel on backdrop tap and Escape without leaking Escape to the game", async () => {
    const user = userEvent.setup();
    const fixture = createGuildPreferencesTest();
    const gameKeyDown = vi.fn<(event: KeyboardEvent) => void>();
    document.addEventListener("keydown", gameKeyDown);

    try {
      render(
        <QueryClientProvider client={fixture.queryClient}>
          <MobileUiShell>
            <QuickAccess />
            <TestWindow id="timers" title="Timery" body="Treść timerów" />
          </MobileUiShell>
        </QueryClientProvider>,
      );

      await user.click(
        screen.getByRole("button", { name: "Otwórz panel Lootloga" }),
      );
      expect(screen.getByText("Treść timerów")).toBeInTheDocument();

      fireEvent.keyDown(screen.getByText("Treść timerów"), { key: "Escape" });

      expect(screen.queryByText("Treść timerów")).toBeNull();
      expect(gameKeyDown).not.toHaveBeenCalled();

      await user.click(
        screen.getByRole("button", { name: "Otwórz panel Lootloga" }),
      );
      const backdrop = document.querySelector("[data-ll-mobile-backdrop]");

      if (!(backdrop instanceof HTMLElement)) {
        throw new Error("Expected mobile backdrop");
      }

      await user.click(backdrop);
      expect(screen.queryByText("Treść timerów")).toBeNull();
    } finally {
      document.removeEventListener("keydown", gameKeyDown);
    }
  });

  it("portals alert windows into the top stack alongside an open panel and routes store open requests to the mobile panel", () => {
    const fixture = createGuildPreferencesTest();

    render(
      <QueryClientProvider client={fixture.queryClient}>
        <MobileUiShell>
          <QuickAccess />
          <TestWindow id="timers" title="Timery" body="Treść timerów" />
          <TestWindow id="settings" title="Ustawienia" body="Treść ustawień" />
          <TestWindow
            id="notifications"
            title="Powiadomienia"
            body="Pilny alert"
          />
        </MobileUiShell>
      </QueryClientProvider>,
    );

    act(() => {
      useWindowsStore.getState().openAndFocus("settings", {
        activeTab: "catching",
        activeSubsection: "catching",
      });
      useWindowsStore.getState().setOpen("notifications", true);
    });

    expect(screen.getByText("Treść ustawień")).toBeInTheDocument();
    expect(useWindowsStore.getState().settings.state).toEqual({
      activeTab: "catching",
      activeSubsection: "catching",
    });

    const alertStack = document.querySelector("[data-ll-mobile-alert-stack]");
    expect(alertStack).not.toBeNull();
    expect(alertStack).toContainElement(screen.getByText("Pilny alert"));
  });
});
