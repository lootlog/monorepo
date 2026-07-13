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
    const onMapPing = vi.fn(() => true);
    renderHook(() => useHotkeys({ onMapPing }));

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

    expect(onMapPing).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
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
