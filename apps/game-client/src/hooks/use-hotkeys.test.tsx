import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, onTestFinished } from "vitest";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { migrateHotkeysState, useHotkeysStore } from "@/store/hotkeys.store";
import { useWindowsStore } from "@/store/windows.store";

import { configureApiClients } from "@lootlog/client/transport";
import { readyRoomOrganizerFixture } from "@/test/ready-room-fixtures";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useGlobalStore } from "@/store/global.store";
import { resetReadyRoomInvitationCoordinatorForTests } from "@/features/party-finder/ready-room-invitation-coordinator";

describe("useHotkeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useHotkeysStore.getState().resetAll();
    useWindowsStore.setState((state) => ({
      ...state,
      "quick-access": {
        ...state["quick-access"],
        open: true,
        autofocus: undefined,
      },
      currentWindowFocus: undefined,
      windowFocusHistory: [],
    }));
  });

  it("runs configured help with a closed chat without moving focus and ignores key repeats", () => {
    const onChatHelp = vi.fn();
    useHotkeysStore.getState().setBinding("chat-help", {
      type: "keyboard",
      key: "H",
      shift: true,
      ctrl: false,
      alt: false,
    });
    const active = document.activeElement;
    renderHook(() => useHotkeys({ onChatHelp }));
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "H", shiftKey: true }),
      );
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "H",
          shiftKey: true,
          repeat: true,
        }),
      );
    });
    expect(onChatHelp).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(active);
  });

  it("toggles quick access with the configured binding", () => {
    renderHook(() => useHotkeys());

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Q",
          shiftKey: true,
        }),
      );
    });

    expect(useWindowsStore.getState()["quick-access"].open).toBe(false);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "q",
          shiftKey: true,
        }),
      );
    });

    expect(useWindowsStore.getState()["quick-access"].open).toBe(true);
  });

  it("keeps persisted binding precedence when legacy bindings overlap", () => {
    const binding = { key: "X", shift: false, ctrl: false, alt: false };
    useHotkeysStore.setState(
      migrateHotkeysState({
        bindings: {
          "toggle-quick-access": binding,
          "toggle-command": binding,
        },
      }),
    );
    useWindowsStore.setState(useWindowsStore.getInitialState(), true);
    renderHook(() => useHotkeys());

    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "X" })));

    expect(useWindowsStore.getState()["quick-access"].open).toBe(false);
    expect(useWindowsStore.getState().command.open).toBe(false);
  });

  it("runs a global action from an auxiliary mouse binding", () => {
    useHotkeysStore.getState().setBinding("toggle-quick-access", {
      type: "mouse",
      button: 3,
      shift: false,
      ctrl: false,
      alt: false,
    });
    renderHook(() => useHotkeys());

    act(() => {
      window.dispatchEvent(new MouseEvent("mousedown", { button: 3 }));
    });

    expect(useWindowsStore.getState()["quick-access"].open).toBe(false);
  });

  it("triggers a map ping when a text input still has focus", () => {
    const input = document.createElement("input");
    const canvas = document.createElement("canvas");
    canvas.id = "GAME_CANVAS";
    document.body.append(input, canvas);
    input.focus();
    const onMapPingStart = vi.fn<() => boolean>(() => true);
    renderHook(() => useHotkeys({ onMapPingStart }));

    const event = new MouseEvent("mousedown", {
      bubbles: true,
      button: 1,
      cancelable: true,
    });
    act(() => {
      canvas.dispatchEvent(event);
    });

    input.remove();
    canvas.remove();

    expect(onMapPingStart).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("finishes a mouse map ping on the matching button release", () => {
    const canvas = document.createElement("canvas");
    canvas.id = "GAME_CANVAS";
    document.body.append(canvas);
    const onMapPingStart = vi.fn<() => boolean>(() => true);
    const onMapPingEnd = vi.fn<(event: KeyboardEvent | MouseEvent) => void>();
    renderHook(() => useHotkeys({ onMapPingStart, onMapPingEnd }));

    act(() => {
      canvas.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          button: 1,
          cancelable: true,
        }),
      );
      window.dispatchEvent(
        new MouseEvent("mouseup", {
          button: 1,
          shiftKey: true,
          cancelable: true,
        }),
      );
    });

    canvas.remove();
    expect(onMapPingStart).toHaveBeenCalledOnce();
    expect(onMapPingEnd).toHaveBeenCalledOnce();
  });

  it("matches keyboard release by code after a modifier is released", () => {
    useHotkeysStore.getState().setBinding("map-ping", {
      type: "keyboard",
      key: "!",
      shift: true,
      ctrl: false,
      alt: false,
    });
    const onMapPingStart = vi.fn<() => boolean>(() => true);
    const onMapPingEnd = vi.fn<(event: KeyboardEvent | MouseEvent) => void>();
    renderHook(() => useHotkeys({ onMapPingStart, onMapPingEnd }));

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "Digit1",
          key: "!",
          shiftKey: true,
          cancelable: true,
        }),
      );
      window.dispatchEvent(
        new KeyboardEvent("keyup", {
          code: "Digit1",
          key: "1",
          shiftKey: false,
          cancelable: true,
        }),
      );
    });

    expect(onMapPingStart).toHaveBeenCalledOnce();
    expect(onMapPingEnd).toHaveBeenCalledOnce();
  });

  it("ignores key repeat and cancels an active ping with Escape", () => {
    useHotkeysStore.getState().setBinding("map-ping", {
      type: "keyboard",
      key: "P",
      shift: false,
      ctrl: false,
      alt: false,
    });
    const onMapPingStart = vi.fn<() => boolean>(() => true);
    const onMapPingCancel = vi.fn<() => void>();
    renderHook(() => useHotkeys({ onMapPingStart, onMapPingCancel }));

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "KeyP",
          key: "P",
          repeat: false,
        }),
      );
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          code: "KeyP",
          key: "P",
          repeat: true,
        }),
      );
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onMapPingStart).toHaveBeenCalledOnce();
    expect(onMapPingCancel).toHaveBeenCalledOnce();
  });

  it("enqueues every explicit rapid invite-all hotkey activation", async () => {
    resetReadyRoomInvitationCoordinatorForTests();
    onTestFinished(resetReadyRoomInvitationCoordinatorForTests);
    setTestRuntimeGame({
      hero: {
        accountId: "organizer-account",
        characterId: "organizer-character",
      },
    });
    usePartyFinderStore.getState().clearReadyRooms();
    usePartyFinderStore.getState().mergeProjection(readyRoomOrganizerFixture);
    usePartyFinderStore.getState().setReadyRoomsSynchronized(true);
    useGlobalStore.getState().setSocketState({ connected: true, joined: true });
    const requests: Request[] = [];
    const fetch: typeof globalThis.fetch = (input, init) => {
      requests.push(new Request(input, init));
      return Promise.resolve(Response.json({ targets: [] }));
    };
    onTestFinished(
      configureApiClients({
        main: { baseUrl: "https://api.example.test", fetch },
      }),
    );
    renderHook(() => useHotkeys());

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "I", shiftKey: true }),
      );
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "I", shiftKey: true }),
      );
    });

    await waitFor(() => expect(requests).toHaveLength(2));
    expect(await requests[0].json()).toEqual({
      participantIds: ["participant-1"],
    });
    expect(await requests[1].json()).toEqual({
      participantIds: ["participant-1"],
    });
  });
});
