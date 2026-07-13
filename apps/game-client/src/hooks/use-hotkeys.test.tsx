import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useHotkeysStore } from "@/store/hotkeys.store";
import { useWindowsStore } from "@/store/windows.store";

const enqueueReadyRoomInvitations = vi.fn(() => Promise.resolve());

vi.mock("@/features/party-finder/ready-room-invitation-coordinator", () => ({
  canEnqueueReadyRoomInvitations: () => true,
  enqueueReadyRoomInvitations: () => enqueueReadyRoomInvitations(),
}));

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
    const onMapPingStart = vi.fn(() => true);
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
    const onMapPingStart = vi.fn(() => true);
    const onMapPingEnd = vi.fn();
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
    const onMapPingStart = vi.fn(() => true);
    const onMapPingEnd = vi.fn();
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
    const onMapPingStart = vi.fn(() => true);
    const onMapPingCancel = vi.fn();
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

  it("enqueues every explicit rapid invite-all hotkey activation", () => {
    renderHook(() => useHotkeys());

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "I", shiftKey: true }),
      );
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "I", shiftKey: true }),
      );
    });

    expect(enqueueReadyRoomInvitations).toHaveBeenCalledTimes(2);
  });
});
