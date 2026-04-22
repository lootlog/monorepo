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

const createTimer = (overrides?: Partial<Timer>): Timer => ({
  guildId: overrides?.guildId ?? "guild-1",
  timerKey: overrides?.timerKey ?? "tanroth",
  world: overrides?.world ?? "pandora",
  npcId: overrides?.npcId ?? 10,
  minSpawnTime: overrides?.minSpawnTime ?? "2026-04-22T10:00:00.000Z",
  maxSpawnTime: overrides?.maxSpawnTime ?? "2026-04-22T10:05:00.000Z",
  updatedAt: overrides?.updatedAt ?? "2026-04-22T09:59:00.000Z",
  wasReset: overrides?.wasReset ?? false,
  npc: {
    id: overrides?.npc?.id ?? 10,
    name: overrides?.npc?.name ?? "Tanroth",
    lvl: overrides?.npc?.lvl ?? 120,
    prof: overrides?.npc?.prof ?? "W",
    icon: overrides?.npc?.icon ?? "icon.gif",
    wt: overrides?.npc?.wt ?? 10,
    type: overrides?.npc?.type ?? "hero",
    margonemType: overrides?.npc?.margonemType ?? 4,
    location: overrides?.npc?.location ?? "Ruins",
  } as never,
  member: overrides?.member,
  members: overrides?.members,
  isCustomTime: overrides?.isCustomTime ?? false,
  isPending: overrides?.isPending ?? false,
});

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

    const timer = createTimer();

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
