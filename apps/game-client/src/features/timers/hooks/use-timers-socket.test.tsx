import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fixtureValue,
  nestedFixtureValue,
  optionalFixtureValue,
} from "@/test-utils/fixture-value";
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
  guildId: fixtureValue(overrides, "guildId", "guild-1"),
  timerKey: fixtureValue(overrides, "timerKey", "tanroth"),
  world: fixtureValue(overrides, "world", "pandora"),
  npcId: fixtureValue(overrides, "npcId", 10),
  minSpawnTime: fixtureValue(
    overrides,
    "minSpawnTime",
    "2026-04-22T10:00:00.000Z",
  ),
  maxSpawnTime: fixtureValue(
    overrides,
    "maxSpawnTime",
    "2026-04-22T10:05:00.000Z",
  ),
  updatedAt: fixtureValue(overrides, "updatedAt", "2026-04-22T09:59:00.000Z"),
  wasReset: fixtureValue(overrides, "wasReset", false),
  npc: {
    id: nestedFixtureValue(overrides, "npc", "id", 10),
    name: nestedFixtureValue(overrides, "npc", "name", "Tanroth"),
    lvl: nestedFixtureValue(overrides, "npc", "lvl", 120),
    prof: nestedFixtureValue(overrides, "npc", "prof", "W"),
    icon: nestedFixtureValue(overrides, "npc", "icon", "icon.gif"),
    wt: nestedFixtureValue(overrides, "npc", "wt", 10),
    type: nestedFixtureValue(overrides, "npc", "type", "hero"),
    margonemType: nestedFixtureValue(overrides, "npc", "margonemType", 4),
    location: nestedFixtureValue(overrides, "npc", "location", "Ruins"),
  } as never,
  member: optionalFixtureValue(overrides, "member"),
  members: optionalFixtureValue(overrides, "members"),
  isCustomTime: fixtureValue(overrides, "isCustomTime", false),
  isPending: fixtureValue(overrides, "isPending", false),
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
