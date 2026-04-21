import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import type { Timer } from "@/api/timers.api";

const mockOn = vi.fn();
const mockOff = vi.fn();
const mockUpsertTimer = vi.fn();
const mockRemoveTimer = vi.fn();

let socketState: {
  socket: { on: typeof mockOn; off: typeof mockOff } | null;
  connected: boolean;
  joined: boolean;
};

vi.mock("@/contexts/socket-context", () => ({
  useSocket: () => socketState,
}));

vi.mock("@/hooks/api/use-timers-cache", () => ({
  useTimersCache: () => ({
    upsertTimer: mockUpsertTimer,
    removeTimer: mockRemoveTimer,
  }),
}));

import { useTimersSocket } from "./use-timers-socket";

describe("useTimersSocket", () => {
  beforeEach(() => {
    mockOn.mockReset();
    mockOff.mockReset();
    mockUpsertTimer.mockReset();
    mockRemoveTimer.mockReset();

    socketState = {
      socket: {
        on: mockOn,
        off: mockOff,
      },
      connected: true,
      joined: true,
    };
  });

  it("does not register listeners until the socket is ready", () => {
    socketState = {
      socket: null,
      connected: false,
      joined: false,
    };

    renderHook(() => useTimersSocket());

    expect(mockOn).not.toHaveBeenCalled();
  });

  it("registers timer listeners and forwards socket events to the cache", () => {
    renderHook(() => useTimersSocket());

    const createHandler = mockOn.mock.calls.find(
      ([eventName]) => eventName === GatewayEvent.TIMERS_CREATE,
    )?.[1] as (data: Timer) => void;
    const deleteHandler = mockOn.mock.calls.find(
      ([eventName]) => eventName === GatewayEvent.TIMERS_DELETE,
    )?.[1] as (data: Timer) => void;

    const timer = {
      id: "timer-1",
      timerKey: "tanroth",
      guildId: "guild-1",
      world: "pandora",
    } as Timer;

    createHandler(timer);
    deleteHandler(timer);

    expect(mockOn).toHaveBeenCalledWith(
      GatewayEvent.TIMERS_CREATE,
      expect.any(Function),
    );
    expect(mockOn).toHaveBeenCalledWith(
      GatewayEvent.TIMERS_DELETE,
      expect.any(Function),
    );
    expect(mockUpsertTimer).toHaveBeenCalledWith(timer);
    expect(mockRemoveTimer).toHaveBeenCalledWith(timer);
  });

  it("unregisters listeners on cleanup", () => {
    const { unmount } = renderHook(() => useTimersSocket());

    const createHandler = mockOn.mock.calls.find(
      ([eventName]) => eventName === GatewayEvent.TIMERS_CREATE,
    )?.[1];
    const deleteHandler = mockOn.mock.calls.find(
      ([eventName]) => eventName === GatewayEvent.TIMERS_DELETE,
    )?.[1];

    unmount();

    expect(mockOff).toHaveBeenCalledWith(
      GatewayEvent.TIMERS_CREATE,
      createHandler,
    );
    expect(mockOff).toHaveBeenCalledWith(
      GatewayEvent.TIMERS_DELETE,
      deleteHandler,
    );
  });
});
