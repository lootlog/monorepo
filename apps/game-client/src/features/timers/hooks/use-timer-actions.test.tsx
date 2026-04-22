import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import type { TimerWithTimeLeft } from "../utils/timers-utils";

const mockHideTimer = vi.fn();
const mockRevealTimer = vi.fn();
const mockPinTimer = vi.fn();
const mockUnpinTimer = vi.fn();
const mockSetTimerColor = vi.fn();
const mockResetTimer = vi.fn();
const mockDeleteTimer = vi.fn();
const mockT = vi.fn(
  (key: string, options?: Record<string, unknown>) =>
    `${key}${options?.name ? `:${options.name}` : ""}`,
);

vi.mock("@/store/timers.store", () => ({
  useTimersStore: () => ({
    hideTimer: mockHideTimer,
    revealTimer: mockRevealTimer,
    pinTimer: mockPinTimer,
    unpinTimer: mockUnpinTimer,
    pinnedTimers: {
      "guild-1": ["Tanroth"],
    },
    setTimerColor: mockSetTimerColor,
  }),
}));

vi.mock("@/lib/api/generated/main/timers/timers", () => ({
  useTimersControllerResetTimer: () => ({
    mutateAsync: mockResetTimer,
  }),
  useTimersControllerDeleteTimer: () => ({
    mutate: mockDeleteTimer,
  }),
}));

vi.mock("@/i18n/get-fixed-t", () => ({
  getFixedT: () => mockT,
}));

import { useTimerActions } from "./use-timer-actions";

const createTimer = (
  overrides?: Partial<TimerWithTimeLeft>,
): TimerWithTimeLeft => ({
  guildId: overrides?.guildId ?? "guild-1",
  timerKey: overrides?.timerKey ?? "timer-1",
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
  minTimeLeft: overrides?.minTimeLeft ?? 60_000,
  maxTimeLeft: overrides?.maxTimeLeft ?? 120_000,
  members: overrides?.members,
  mergedGuildIds: overrides?.mergedGuildIds,
});

describe("useTimerActions", () => {
  beforeEach(() => {
    mockHideTimer.mockReset();
    mockRevealTimer.mockReset();
    mockPinTimer.mockReset();
    mockUnpinTimer.mockReset();
    mockSetTimerColor.mockReset();
    mockResetTimer.mockReset();
    mockDeleteTimer.mockReset();
    mockT.mockClear();
    window.message = vi.fn();
  });

  it("hides, reveals, colors, and unpins timers in local and global scopes", () => {
    const actions = useTimerActions(createTimer(), "guild-1", "pandora", [
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
    const actions = useTimerActions(
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
    const actions = useTimerActions(
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
    expect(mockResetTimer).toHaveBeenCalledWith({
      pathParams: {
        guildId: "guild-1",
        timerIdentifier: "timer-1",
      },
      data: {
        world: "pandora",
      },
    });
    expect(window.message).toHaveBeenCalledWith(
      "messages.resetSuccess:Tanroth",
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

    const actions = useTimerActions(createTimer(), "guild-1", "pandora", [
      "guild-1",
    ]);

    await actions.handleRestartTimer();

    expect(window.message).toHaveBeenCalledWith(
      "messages.resetEventWindowForbidden",
    );
  });

  it("deletes timers and maps delete errors", () => {
    const actions = useTimerActions(createTimer(), "guild-1", "pandora", [
      "guild-1",
    ]);

    actions.handleDeleteTimer("guild-1", "timer-1");

    expect(mockDeleteTimer).toHaveBeenCalledWith(
      {
        pathParams: {
          guildId: "guild-1",
          timerIdentifier: "timer-1",
        },
        params: {
          world: "pandora",
        },
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );

    const callbacks = mockDeleteTimer.mock.calls[0]?.[1] as {
      onSuccess: () => void;
      onError: (error: unknown) => void;
    };

    callbacks.onSuccess();
    expect(window.message).toHaveBeenCalledWith(
      "messages.deleteSuccess:Tanroth",
    );

    callbacks.onError(
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
    expect(window.message).toHaveBeenCalledWith(
      "messages.deleteEventWindowForbidden",
    );
  });
});
