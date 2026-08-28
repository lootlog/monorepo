import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fixtureValue,
  nestedFixtureValue,
  optionalFixtureValue,
} from "@/test-utils/fixture-value";
import { ApiError } from "@lootlog/api-client/transport";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { renderHook, waitFor } from "@testing-library/react";

const mockHideTimer = vi.fn();
const mockRevealTimer = vi.fn();
const mockPinTimer = vi.fn();
const mockUnpinTimer = vi.fn();
const mockSetTimerColor = vi.fn();
const mockShowExpiredTimerAlways = vi.fn();
const mockHideExpiredTimerAlways = vi.fn();
const mockResetTimer = vi.fn();
const mockDeleteTimer = vi.fn();
const mockActorCharacter = {
  accountId: "200",
  characterId: "100",
  name: "Hero One",
  prof: "b",
  icon: "hero.gif",
  lvl: 300,
};
const mockT = vi.fn(
  (key: string, options?: Record<string, unknown>) =>
    `${key}${options?.name ? `:${options.name}` : ""}`,
);

vi.mock("@/store/timers.store", () => ({
  useTimersStore: (selector: (state: unknown) => unknown) =>
    selector({
      hideTimer: mockHideTimer,
      revealTimer: mockRevealTimer,
      pinTimer: mockPinTimer,
      unpinTimer: mockUnpinTimer,
      pinnedTimers: {
        "guild-1": ["Tanroth"],
      },
      alwaysVisibleExpiredTimers: {},
      setTimerColor: mockSetTimerColor,
      showExpiredTimerAlways: mockShowExpiredTimerAlways,
      hideExpiredTimerAlways: mockHideExpiredTimerAlways,
    }),
}));

vi.mock("@lootlog/api-client/react-query/main/timers", () => ({
  timersControllerResetTimer: (pathParameters: unknown, data: unknown) =>
    mockResetTimer(pathParameters, data),
  timersControllerDeleteTimer: (pathParameters: unknown, params: unknown) =>
    mockDeleteTimer(pathParameters, params),
}));

vi.mock("@/i18n/get-fixed-t", () => ({
  getFixedT: () => mockT,
}));

vi.mock("@/lib/api/generated-helpers", () => ({
  buildCurrentTimerActorCharacterPayload: () => mockActorCharacter,
}));

import { useTimerActions } from "./use-timer-actions";

const createTimer = (
  overrides?: Partial<TimerWithTimeLeft>,
): TimerWithTimeLeft => ({
  guildId: fixtureValue(overrides, "guildId", "guild-1"),
  timerKey: fixtureValue(overrides, "timerKey", "timer-1"),
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
  minTimeLeft: fixtureValue(overrides, "minTimeLeft", 60_000),
  maxTimeLeft: fixtureValue(overrides, "maxTimeLeft", 120_000),
  members: optionalFixtureValue(overrides, "members"),
  mergedGuildIds: optionalFixtureValue(overrides, "mergedGuildIds"),
});

const renderTimerActions = (...args: Parameters<typeof useTimerActions>) =>
  renderHook(() => useTimerActions(...args)).result.current;

describe("useTimerActions", () => {
  beforeEach(() => {
    mockHideTimer.mockReset();
    mockRevealTimer.mockReset();
    mockPinTimer.mockReset();
    mockUnpinTimer.mockReset();
    mockSetTimerColor.mockReset();
    mockShowExpiredTimerAlways.mockReset();
    mockHideExpiredTimerAlways.mockReset();
    mockResetTimer.mockReset();
    mockDeleteTimer.mockReset();
    mockT.mockClear();
    testRuntimeWindow.message = vi.fn();
  });

  it("hides, reveals, colors, and unpins timers in local and global scopes", () => {
    const actions = renderTimerActions(createTimer(), "guild-1", "pandora", [
      "guild-1",
      "guild-2",
    ]);

    expect(actions.isPinned).toBe(true);

    actions.handleHideTimer();
    actions.handleHideTimerForAll();
    actions.handleShowTimer();
    actions.handleShowTimerForAll();
    actions.handlePinTimer();
    actions.handleUnpinTimerForAll();
    actions.handleTimerColorChange("red");

    expect(mockHideTimer).toHaveBeenCalledWith("guild-1", "Tanroth");
    expect(mockHideTimer).toHaveBeenCalledWith("guild-2", "Tanroth");
    expect(mockHideTimer).toHaveBeenCalledWith("global", "Tanroth");
    expect(mockRevealTimer).toHaveBeenCalledWith("guild-1", "Tanroth");
    expect(mockRevealTimer).toHaveBeenCalledWith("guild-2", "Tanroth");
    expect(mockRevealTimer).toHaveBeenCalledWith("global", "Tanroth");
    expect(mockUnpinTimer).toHaveBeenCalledWith("guild-1", "Tanroth");
    expect(mockUnpinTimer).toHaveBeenCalledWith("guild-2", "Tanroth");
    expect(mockUnpinTimer).toHaveBeenCalledWith("global", "Tanroth");
    expect(mockSetTimerColor).toHaveBeenCalledWith("Tanroth", "red");
  });

  it("pins all timers when the local timer is not pinned", () => {
    const actions = renderTimerActions(
      createTimer({
        npc: {
          ...createTimer().npc,
          name: "Mushita",
        } as never,
      }),
      "guild-1",
      "pandora",
      ["guild-1", "guild-2"],
    );

    expect(actions.isPinned).toBe(false);

    actions.handlePinTimer();
    actions.handlePinTimerForAll();

    expect(mockPinTimer).toHaveBeenCalledWith("guild-1", "Mushita");
    expect(mockPinTimer).toHaveBeenCalledWith("guild-2", "Mushita");
    expect(mockPinTimer).toHaveBeenCalledWith("global", "Mushita");
  });

  it("resets grouped timers and reports success", async () => {
    mockResetTimer.mockResolvedValue(undefined);
    const actions = renderTimerActions(
      createTimer({
        mergedGuildIds: [
          { guildId: "guild-1", npcId: 10, timerKey: "timer-1" },
          { guildId: "guild-2", npcId: 10, timerKey: "timer-2" },
          { guildId: "guild-3", npcId: 10 },
        ],
      }),
      "guild-1",
      "pandora",
      ["guild-1", "guild-2"],
      true,
    );

    await actions.handleRestartTimer();

    expect(mockResetTimer).toHaveBeenCalledTimes(2);
    expect(mockResetTimer).toHaveBeenCalledWith(
      {
        guildId: "guild-1",
        timerIdentifier: "timer-1",
      },
      {
        world: "pandora",
        actorCharacter: mockActorCharacter,
      },
    );
    expect(mockResetTimer).toHaveBeenCalledWith(
      {
        guildId: "guild-2",
        timerIdentifier: "timer-2",
      },
      {
        world: "pandora",
        actorCharacter: mockActorCharacter,
      },
    );
    expect(testRuntimeWindow.message).toHaveBeenCalledWith(
      "messages.resetSuccess:Tanroth",
    );
  });

  it("resets a single timer with current actor character data", async () => {
    mockResetTimer.mockResolvedValue(undefined);
    const actions = renderTimerActions(createTimer(), "guild-1", "pandora", [
      "guild-1",
    ]);

    await actions.handleRestartTimer();

    expect(mockResetTimer).toHaveBeenCalledWith(
      {
        guildId: "guild-1",
        timerIdentifier: "timer-1",
      },
      {
        world: "pandora",
        actorCharacter: mockActorCharacter,
      },
    );
  });

  it("maps reset API errors to translated messages", async () => {
    mockResetTimer.mockRejectedValue(
      new ApiError({
        status: 400,
        data: {
          message: "EVENT_TIMER_CANNOT_BE_RESET",
        },
        url: "http://localhost/reset",
        method: "PATCH",
        message: "boom",
      }),
    );

    const actions = renderTimerActions(createTimer(), "guild-1", "pandora", [
      "guild-1",
    ]);

    await actions.handleRestartTimer();

    expect(testRuntimeWindow.message).toHaveBeenCalledWith(
      "messages.resetEventWindowForbidden",
    );
  });

  it("deletes timers and maps delete errors", async () => {
    mockDeleteTimer.mockResolvedValueOnce(undefined);
    const actions = renderTimerActions(createTimer(), "guild-1", "pandora", [
      "guild-1",
    ]);

    actions.handleDeleteTimer("guild-1", "timer-1");

    expect(mockDeleteTimer).toHaveBeenNthCalledWith(
      1,
      {
        guildId: "guild-1",
        timerIdentifier: "timer-1",
      },
      { world: "pandora" },
    );
    await waitFor(() =>
      expect(testRuntimeWindow.message).toHaveBeenCalledWith(
        "messages.deleteSuccess:Tanroth",
      ),
    );

    mockDeleteTimer.mockRejectedValueOnce(
      new ApiError({
        status: 400,
        data: {
          message: "EVENT_TIMER_MUST_USE_EVENT_CLOSE",
        },
        url: "http://localhost/delete",
        method: "DELETE",
        message: "boom",
      }),
    );
    actions.handleDeleteTimer("guild-1", "timer-1");

    await waitFor(() =>
      expect(testRuntimeWindow.message).toHaveBeenCalledWith(
        "messages.deleteEventWindowForbidden",
      ),
    );
  });
});
import { testRuntimeWindow } from "@/test/test-runtime-window";
