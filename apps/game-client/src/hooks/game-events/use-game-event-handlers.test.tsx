import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRealtimeTest } from "@/test/realtime-test";
import { EventDispatcher } from "@/lib/event-dispatcher";
import { useGlobalStore } from "@/store/global.store";
import { useGameEventHandlers } from "./use-game-event-handlers";

let test: ReturnType<typeof createRealtimeTest>;

const register = vi.spyOn(EventDispatcher.prototype, "register");

const initialEvents = vi.spyOn(
  EventDispatcher.prototype,
  "handleInitialEvents",
);

const cleanup = vi.spyOn(EventDispatcher.prototype, "cleanup");

beforeEach(() => {
  test = createRealtimeTest();
  register.mockClear();
  initialEvents.mockClear();
  cleanup.mockClear();
});

describe("useGameEventHandlers", () => {
  it("registers its real dispatcher once across rerenders", () => {
    const { rerender } = renderHook(() => useGameEventHandlers(), {
      wrapper: test.wrapper,
    });

    rerender();
    expect(register).toHaveBeenCalledOnce();
    expect(initialEvents).not.toHaveBeenCalled();
  });

  it("handles initial events once after the game becomes ready", () => {
    const { rerender } = renderHook(() => useGameEventHandlers(), {
      wrapper: test.wrapper,
    });

    act(() =>
      useGlobalStore.getState().setGameState({ gameInitialized: true }),
    );
    rerender();
    expect(initialEvents).toHaveBeenCalledOnce();
  });

  it("releases the dispatcher on unmount", () => {
    const { unmount } = renderHook(() => useGameEventHandlers(), {
      wrapper: test.wrapper,
    });

    unmount();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("retains the shared dispatcher until the last client unmounts", () => {
    useGlobalStore.getState().setGameState({ gameInitialized: true });

    const first = renderHook(() => useGameEventHandlers(), {
      wrapper: test.wrapper,
    });

    const second = renderHook(() => useGameEventHandlers(), {
      wrapper: test.wrapper,
    });

    expect(register).toHaveBeenCalledOnce();
    expect(initialEvents).toHaveBeenCalledOnce();
    first.unmount();
    expect(cleanup).not.toHaveBeenCalled();
    second.unmount();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
