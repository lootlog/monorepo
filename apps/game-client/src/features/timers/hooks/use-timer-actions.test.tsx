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
import { QueryClientProvider } from "@tanstack/react-query";
import { getUsersControllerGetCurrentUserAccessibleGuildsQueryKey } from "@lootlog/client/main";
import type { ReactNode } from "react";
import { useGameStore } from "@/store/game.store";
import { seedGuildTimerLists } from "@/features/timers/model/timer-view-fixtures";
import {
  readGuildTimerLists,
  readTimerAppearance,
} from "@/features/timers/settings/timer-settings-writers";
import {
  useGuildTimerLists,
  useTimerBehaviorSettings,
} from "@/features/timers/settings/use-timer-settings";
import {
  setTestRuntimeGame,
  testRuntimeWindow,
} from "@/test/test-runtime-window";
import { getFixedT } from "@/i18n/get-fixed-t";
import {
  createTimerFixture,
  createTimerGuildFixture,
} from "@/features/timers/model/timer-fixtures";
import { createTimerHttpFixture } from "@/features/timers/model/timer-http-fixtures";
import { useTimerActions } from "./use-timer-actions";

const message = vi.fn<(text: string) => void>();

const originalMessage = testRuntimeWindow.message;

beforeEach(() => {
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

  fixture.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [
      createTimerGuildFixture(),
      createTimerGuildFixture({ id: "guild-2", name: "Beta" }),
    ],
  );
  seedGuildTimerLists(fixture.queryClient, { "guild-1": {}, "guild-2": {} });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={fixture.queryClient}>
      {children}
    </QueryClientProvider>
  );

  const hook = renderHook(
    () => {
      const lists = useGuildTimerLists("guild-1");
      const { behavior } = useTimerBehaviorSettings();

      return useTimerActions(timer, {
        settingsKey: "guild-1",
        world: "pandora",
        guildIds: ["guild-1", "guild-2"],
        isGrouping: grouped,
        pinnedTimers: lists.pinnedTimers,
        alwaysVisibleExpiredTimers: behavior.alwaysVisibleExpiredTimers,
      });
    },
    { wrapper },
  );

  onTestFinished(() => {
    hook.unmount();
    fixture.cleanup();
  });

  return { ...fixture, result: hook.result };
};

// Query cache notifications reach React on the next macrotask.
const run = (action: () => void) =>
  act(async () => {
    action();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

describe("useTimerActions", () => {
  it("changes visibility, pinning and colors through the settings documents and reverses those states", async () => {
    const { result } = mountActions();

    const hiddenEverywhere = () =>
      ["guild-1", "guild-2", "global"].map(
        (key) => readGuildTimerLists(key).hiddenTimers,
      );

    await run(() => result.current.handleHideTimer());
    expect(readGuildTimerLists("guild-1").hiddenTimers).toContain("Tanroth");
    await run(() => result.current.handleHideTimerForAll());
    expect(hiddenEverywhere()).toEqual([["Tanroth"], ["Tanroth"], ["Tanroth"]]);
    await run(() => result.current.handleShowTimer());
    expect(readGuildTimerLists("guild-1").hiddenTimers).not.toContain(
      "Tanroth",
    );
    await run(() => result.current.handleShowTimerForAll());
    expect(hiddenEverywhere().flat()).not.toContain("Tanroth");
    await run(() => result.current.handlePinTimer());
    expect(result.current.isPinned).toBe(true);
    await run(() => result.current.handlePinTimer());
    expect(result.current.isPinned).toBe(false);
    await run(() => result.current.handleTimerColorChange("red"));
    expect(readTimerAppearance().timersColors.Tanroth).toBe("red");
    await run(() => result.current.handleToggleAlwaysVisibleExpiredTimer());
    expect(result.current.isAlwaysVisibleExpiredTimer).toBe(true);
    await run(() => result.current.handleToggleAlwaysVisibleExpiredTimer());
    expect(result.current.isAlwaysVisibleExpiredTimer).toBe(false);
  });

  it("pins and unpins across organizations and the global scope", async () => {
    const { result } = mountActions();

    const pinnedEverywhere = () =>
      ["guild-1", "guild-2", "global"].map(
        (key) => readGuildTimerLists(key).pinnedTimers,
      );

    await run(() => result.current.handlePinTimerForAll());
    expect(pinnedEverywhere()).toEqual([["Tanroth"], ["Tanroth"], ["Tanroth"]]);
    await run(() => result.current.handleUnpinTimerForAll());
    expect(pinnedEverywhere().flat()).not.toContain("Tanroth");
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
