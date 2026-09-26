import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
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
import { toast } from "sonner";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { getFixedT } from "@/i18n/get-fixed-t";
import {
  createTimerFixture,
  createTimerHistoryFixture,
} from "../timer-fixtures";
import { getTimersControllerGetRecentTimerHistoryQueryOptions } from "@lootlog/client/main";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { useTimerActions } from "./use-timer-actions";

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
  vi.spyOn(toast, "success").mockImplementation(() => "success");
  vi.spyOn(toast, "error").mockImplementation(() => "error");
});

afterEach(() => {
  useTimersStore.setState(useTimersStore.getInitialState(), true);
  useGameStore.getState().clearGame();
  vi.restoreAllMocks();
});

const mountActions = (
  grouped = false,
  respond?: (request: Request) => Response | Promise<Response>,
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

  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  const hook = renderHook(
    () =>
      useTimerActions(
        timer,
        "guild-1",
        "luvia",
        ["guild-1", "guild-2"],
        grouped,
      ),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    },
  );

  onTestFinished(() => {
    hook.unmount();
    queryClient.clear();
    fixture.cleanup();
  });

  return { ...fixture, queryClient, result: hook.result };
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
        world: "luvia",
        actorCharacter: {
          accountId: "200",
          characterId: "100",
          name: "Hero One",
          prof: "b",
          icon: "hero.gif",
          lvl: 300,
        },
      });
      expect(toast.success).toHaveBeenCalledWith(
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
    expect(toast.error).toHaveBeenCalledWith(
      getFixedT("timers")("messages.resetEventWindowForbidden"),
    );
  });

  it.each(["retry", "new-confirmation"] as const)(
    "waits for every grouped reset, refreshes only successes and preserves the intended scopes on %s",
    async (nextAction) => {
      const firstReset = Promise.withResolvers<Response>();
      const secondReset = Promise.withResolvers<Response>();
      const completedGuilds = new Set<string>();
      let recovering = false;

      const { result, queryClient, requests } = mountActions(
        true,
        (request) => {
          const url = new URL(request.url);

          if (request.method === "GET") {
            const guildId = url.searchParams.get("guildId") ?? "";

            return Response.json([
              createTimerHistoryFixture({
                guildId,
                action: completedGuilds.has(guildId) ? "RESET" : "CREATE",
                canRestore: false,
              }),
            ]);
          }

          if (recovering) {
            const guildId = url.pathname.includes("/guild-1/")
              ? "guild-1"
              : "guild-2";

            completedGuilds.add(guildId);

            return Response.json(
              createTimerFixture({ guildId, wasReset: true }),
            );
          }

          if (url.pathname.includes("/guild-1/")) return firstReset.promise;

          return secondReset.promise;
        },
      );

      const histories = ["guild-1", "guild-2"].map((guildId) =>
        getTimersControllerGetRecentTimerHistoryQueryOptions(
          { guildId, world: "luvia", limit: 10 },
          { query: { staleTime: 30_000 } },
        ),
      );

      await Promise.all(
        histories.map((options) => queryClient.fetchQuery(options)),
      );

      let reset = Promise.resolve(false);

      act(() => {
        reset = result.current.handleRestartTimer();
      });
      await waitFor(() => expect(requests).toHaveLength(4));
      await act(async () => {
        expect(await result.current.handleRestartTimer()).toBe(false);
        expect(
          await result.current.handleDeleteTimer("guild-1", "timer-1"),
        ).toBe(false);
      });
      expect(requests).toHaveLength(4);
      completedGuilds.add("guild-1");
      await act(async () => {
        firstReset.resolve(
          Response.json(createTimerFixture({ wasReset: true })),
        );
        await firstReset.promise;
      });
      await waitFor(() =>
        expect(
          queryClient.getQueryState(histories[0].queryKey)?.isInvalidated,
        ).toBe(true),
      );
      expect(result.current.isRestartingTimer).toBe(true);
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(await queryClient.fetchQuery(histories[0])).toMatchObject([
        { action: "RESET" },
      ]);
      expect(await queryClient.fetchQuery(histories[1])).toMatchObject([
        { action: "CREATE" },
      ]);
      expect(requests).toHaveLength(5);
      await act(async () => {
        secondReset.resolve(
          Response.json(
            { message: "temporarily unavailable" },
            { status: 503 },
          ),
        );
        expect(await reset).toBe(false);
      });
      await waitFor(() => expect(result.current.isRestartingTimer).toBe(false));
      expect(toast.error).toHaveBeenCalledWith(
        getFixedT("timers")("messages.resetPartialFailure", {
          name: "Tanroth",
          succeeded: 1,
          failed: 1,
        }),
      );
      expect(toast.success).not.toHaveBeenCalled();
      recovering = true;
      await act(async () => {
        if (nextAction === "new-confirmation")
          result.current.beginRestartAttempt();
        expect(await result.current.handleRestartTimer()).toBe(true);
      });
      expect(
        requests
          .filter((request) => request.method !== "GET")
          .map((request) => new URL(request.url).pathname),
      ).toEqual([
        "/guilds/guild-1/timers/timer-1/reset",
        "/guilds/guild-2/timers/timer-2/reset",
        ...(nextAction === "new-confirmation"
          ? ["/guilds/guild-1/timers/timer-1/reset"]
          : []),
        "/guilds/guild-2/timers/timer-2/reset",
      ]);
      expect(await queryClient.fetchQuery(histories[1])).toMatchObject([
        { action: "RESET" },
      ]);
      expect(toast.success).toHaveBeenCalledOnce();
    },
  );

  it("deletes once while confirmation is pending and maps a subsequent HTTP failure", async () => {
    let reject = false;
    const deletion = Promise.withResolvers<Response>();

    const { result, requests } = mountActions(false, () =>
      reject
        ? Response.json(
            { message: "EVENT_TIMER_MUST_USE_EVENT_CLOSE" },
            { status: 400 },
          )
        : deletion.promise,
    );

    let deleted = Promise.resolve(false);

    act(() => {
      deleted = result.current.handleDeleteTimer("guild-1", "timer-1");
    });
    await waitFor(() => expect(requests).toHaveLength(1));
    await act(async () => {
      expect(await result.current.handleDeleteTimer("guild-1", "timer-1")).toBe(
        false,
      );
      expect(await result.current.handleRestartTimer()).toBe(false);
      deletion.resolve(new Response(null, { status: 204 }));
      expect(await deleted).toBe(true);
    });
    expect(requests).toHaveLength(1);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        getFixedT("timers")("messages.deleteSuccess", { name: "Tanroth" }),
      ),
    );
    expect(requests[0].method).toBe("DELETE");
    expect(new URL(requests[0].url).pathname).toBe(
      "/guilds/guild-1/timers/timer-1",
    );
    expect(new URL(requests[0].url).searchParams.get("world")).toBe("luvia");
    reject = true;
    await act(async () => {
      await result.current.handleDeleteTimer("guild-1", "timer-1");
    });
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        getFixedT("timers")("messages.deleteEventWindowForbidden"),
      ),
    );
  });
});
