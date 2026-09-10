import { act, renderHook, waitFor } from "@testing-library/react";
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest";
import { useTimersStore } from "@/store/timers.store";
import { useGameStore } from "@/store/game.store";
import {
  setTestRuntimeGame,
  testRuntimeWindow,
} from "@/test/test-runtime-window";
import { getFixedT } from "@/i18n/get-fixed-t";
import { createTimerFixture } from "../timer-fixtures";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { useTimerActions } from "./use-timer-actions";

const message = vi.fn<(text: string) => void>();

const originalMessage = testRuntimeWindow.message;

beforeEach(() => {
  useTimersStore.setState(useTimersStore.getInitialState(), true);
  setTestRuntimeGame({
    hero: {
      accountId: "200",
      characterId: "100",
      name: "Hero One",
      profession: "b",
      level: 300,
    },
  });
  testRuntimeWindow.message = message;
  message.mockClear();
});

afterEach(() => {
  useTimersStore.setState(useTimersStore.getInitialState(), true);
  useGameStore.getState().clearGame();
  testRuntimeWindow.message = originalMessage;
});

const mountActions = (
  grouped = false,
  respond?: (request: Request) => Response,
) => {
  const fixture = createTimerHttpFixture(
    respond ??
      ((request) =>
        request.method === "DELETE"
          ? new Response(null, { status: 204 })
          : Response.json(createTimerFixture())),
  );

  const timer = {
    ...createTimerFixture(),
    minTimeLeft: 0,
    maxTimeLeft: 0,
    mergedGuildIds: [
      { guildId: "guild-1", npcId: 10, timerKey: "timer-1" },
      { guildId: "guild-2", npcId: 10, timerKey: "timer-2" },
      { guildId: "guild-3", npcId: 10 },
    ],
  };

  const hook = renderHook(() =>
    useTimerActions(
      timer,
      "guild-1",
      "pandora",
      ["guild-1", "guild-2"],
      grouped,
    ),
  );

  onTestFinished(() => {
    hook.unmount();
    fixture.cleanup();
  });

  return { ...fixture, result: hook.result };
};

describe("useTimerActions", () => {
  it("changes visibility, pinning and colors in the real store and reverses those states", () => {
    const { result } = mountActions();
    act(() => result.current.handleHideTimer());
    expect(useTimersStore.getState().hiddenTimers["guild-1"]).toContain(
      "Tanroth",
    );
    act(() => result.current.handleHideTimerForAll());
    expect(useTimersStore.getState().hiddenTimers).toMatchObject({
      "guild-1": ["Tanroth"],
      "guild-2": ["Tanroth"],
      global: ["Tanroth"],
    });
    act(() => result.current.handleShowTimer());
    expect(useTimersStore.getState().hiddenTimers["guild-1"]).not.toContain(
      "Tanroth",
    );
    act(() => result.current.handleShowTimerForAll());
    expect(
      Object.values(useTimersStore.getState().hiddenTimers).flat(),
    ).not.toContain("Tanroth");
    act(() => result.current.handlePinTimer());
    expect(result.current.isPinned).toBe(true);
    act(() => result.current.handlePinTimer());
    expect(result.current.isPinned).toBe(false);
    act(() => result.current.handleTimerColorChange("red"));
    expect(useTimersStore.getState().timersColors.Tanroth).toBe("red");
    act(() => result.current.handleToggleAlwaysVisibleExpiredTimer());
    expect(result.current.isAlwaysVisibleExpiredTimer).toBe(true);
    act(() => result.current.handleToggleAlwaysVisibleExpiredTimer());
    expect(result.current.isAlwaysVisibleExpiredTimer).toBe(false);
  });

  it("pins and unpins across organizations and the global scope", () => {
    const { result } = mountActions();
    act(() => result.current.handlePinTimerForAll());
    expect(useTimersStore.getState().pinnedTimers).toMatchObject({
      "guild-1": ["Tanroth"],
      "guild-2": ["Tanroth"],
      global: ["Tanroth"],
    });
    act(() => result.current.handleUnpinTimerForAll());
    expect(
      Object.values(useTimersStore.getState().pinnedTimers).flat(),
    ).not.toContain("Tanroth");
  });

  it.each([false, true])(
    "resets grouped=%s timers with actual actor data and skips entries without an identity",
    async (grouped) => {
      const { result, requests } = mountActions(grouped);
      await act(() => result.current.handleRestartTimer());
      expect(requests.map((request) => new URL(request.url).pathname)).toEqual(
        grouped
          ? [
              "/guilds/guild-1/timers/timer-1/reset",
              "/guilds/guild-2/timers/timer-2/reset",
            ]
          : ["/guilds/guild-1/timers/timer-1/reset"],
      );
      expect(await requests[0].json()).toEqual({
        world: "pandora",
        actorCharacter: {
          accountId: "200",
          characterId: "100",
          name: "Hero One",
          prof: "b",
          icon: "hero.gif",
          lvl: 300,
        },
      });
      expect(message).toHaveBeenCalledWith(
        getFixedT("timers")("messages.resetSuccess", { name: "Tanroth" }),
      );
    },
  );

  it("maps reset HTTP errors to the translated event restriction", async () => {
    const { result } = mountActions(false, () =>
      Response.json(
        { message: "EVENT_TIMER_CANNOT_BE_RESET" },
        { status: 400 },
      ),
    );

    await act(() => result.current.handleRestartTimer());
    expect(message).toHaveBeenCalledWith(
      getFixedT("timers")("messages.resetEventWindowForbidden"),
    );
  });

  it("deletes by timer identity and maps subsequent HTTP failure", async () => {
    let reject = false;

    const { result, requests } = mountActions(false, () =>
      reject
        ? Response.json(
            { message: "EVENT_TIMER_MUST_USE_EVENT_CLOSE" },
            { status: 400 },
          )
        : new Response(null, { status: 204 }),
    );

    act(() => result.current.handleDeleteTimer("guild-1", "timer-1"));
    await waitFor(() =>
      expect(message).toHaveBeenCalledWith(
        getFixedT("timers")("messages.deleteSuccess", { name: "Tanroth" }),
      ),
    );
    expect(requests[0].method).toBe("DELETE");
    expect(new URL(requests[0].url).pathname).toBe(
      "/guilds/guild-1/timers/timer-1",
    );
    expect(new URL(requests[0].url).searchParams.get("world")).toBe("pandora");
    reject = true;
    act(() => result.current.handleDeleteTimer("guild-1", "timer-1"));
    await waitFor(() =>
      expect(message).toHaveBeenCalledWith(
        getFixedT("timers")("messages.deleteEventWindowForbidden"),
      ),
    );
  });
});
