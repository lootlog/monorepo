import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  type ActivePartyGatheringSummary,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { createRealtimeTest } from "@/test/realtime-test";
import { useActivePartyGatherings } from "./use-active-party-gatherings";

it("discovers gatherings without chat messages and preserves visible state during refresh failures", async () => {
  const harness = createRealtimeTest();
  const guildsKey = getUsersControllerGetCurrentUserAccessibleGuildsQueryKey();
  const guilds = [{ id: "guild-1", name: "Guild" }];
  harness.queryClient.setQueryData(guildsKey, guilds);
  harness.queryClient.setQueryData(
    getUsersControllerGetUserPreferencesQueryKey(),
    { guildsOrder: [], hiddenGuildIds: [] },
  );

  const room: ActivePartyGatheringSummary = {
    notificationId: "active",
    organizerName: "Hero",
    applicantCount: 0,
    inPartyCount: 0,
    guildIds: ["guild-1"],
    world: "luvia",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
  };

  const request = vi
    .fn<() => Promise<Response>>()
    .mockImplementation(async () =>
      Response.json([
        room,
        { ...room, notificationId: "hidden", guildIds: ["hidden"] },
        { ...room, notificationId: "other-world", world: "other" },
        {
          ...room,
          notificationId: "expired",
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      ]),
    );

  const restoreApi = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: async (input) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
        );

        if (url.pathname === "/messaging/party-gathering/active")
          return request();
        throw new Error(`Unexpected HTTP request: ${url.pathname}`);
      },
    },
  });

  vi.useFakeTimers({ shouldAdvanceTime: true });

  const { result, unmount } = renderHook(useActivePartyGatherings, {
    wrapper: harness.wrapper,
  });

  try {
    act(() => harness.setSessionDiscordId("current-discord"));
    harness.open();
    await harness.join();
    await waitFor(() =>
      expect(result.current.data.map((entry) => entry.notificationId)).toEqual([
        "active",
      ]),
    );
    const requestsAfterJoin = request.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(request).toHaveBeenCalledTimes(requestsAfterJoin);
    const genericRoom = { ...room, notificationId: "generic" };
    request.mockImplementation(async () => Response.json([room, genericRoom]));
    await harness.receive({
      v: 1,
      type: "party-gathering.updated",
      data: {
        organizationId: "guild-1",
        payload: {
          notificationId: "generic",
          guildId: "guild-1",
          discordId: "organizer-discord",
          world: "luvia",
          createdAt: room.createdAt,
          character: {
            nick: "Organizer",
            lvl: 100,
            prof: "w",
            characterId: "2",
            accountId: "2",
            icon: "hero.gif",
          },
        },
      },
    });
    await waitFor(() =>
      expect(result.current.data.map((entry) => entry.notificationId)).toEqual([
        "active",
        "generic",
      ]),
    );

    const requestsBeforeBurst = request.mock.calls.length;

    const participantUpdate = {
      v: 1 as const,
      type: "party-gathering.updated" as const,
      data: {
        organizationId: "guild-1",
        payload: {
          notificationId: "generic",
          guildId: "guild-1",
          discordId: "organizer-discord",
          world: "luvia",
          createdAt: room.createdAt,
          character: {
            nick: "Organizer",
            lvl: 100,
            prof: "w",
            characterId: "2",
            accountId: "2",
            icon: "hero.gif",
          },
        },
      },
    };

    request.mockImplementation(async () =>
      Response.json([room, { ...genericRoom, applicantCount: 5 }]),
    );
    await harness.receive(
      ...Array.from({ length: 5 }, () => participantUpdate),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    await waitFor(() =>
      expect(
        result.current.data.find((entry) => entry.notificationId === "generic")
          ?.applicantCount,
      ).toBe(5),
    );
    expect(request.mock.calls.length - requestsBeforeBurst).toBeLessThanOrEqual(
      2,
    );

    const npc = {
      id: 1,
      name: "Titan",
      wt: 100,
      lvl: 100,
      prof: "w",
      type: "TITAN",
    };

    const npcRoom = { ...room, notificationId: "npc", npc };
    request.mockImplementation(async () => Response.json([room, npcRoom]));
    await harness.receive({
      v: 1,
      type: "notification.sent",
      data: {
        organizationId: "guild-1",
        payload: {
          notificationId: "npc",
          guildId: "guild-1",
          discordId: "organizer-discord",
          world: "luvia",
          createdAt: room.createdAt,
          isGatheringParty: true,
          npc,
        },
      },
    });
    await waitFor(() =>
      expect(result.current.data.map((entry) => entry.notificationId)).toEqual([
        "active",
        "npc",
      ]),
    );
    request.mockImplementation(async () => Response.json([room]));
    await harness.receive({
      v: 1,
      type: "party-gathering.cancelled",
      data: {
        organizationId: "guild-1",
        payload: { notificationId: "npc" },
      },
    });
    await waitFor(() =>
      expect(result.current.data.map((entry) => entry.notificationId)).toEqual([
        "active",
      ]),
    );
    request.mockImplementation(async () =>
      Response.json({ message: "Unavailable" }, { status: 500 }),
    );
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isStale).toBe(true);
    expect(result.current.data.map((entry) => entry.notificationId)).toEqual([
      "active",
    ]);
    act(() => {
      harness.queryClient.setQueryData(guildsKey, []);
    });
    await waitFor(() => expect(result.current.data).toEqual([]));
    act(() => {
      harness.queryClient.setQueryData(guildsKey, guilds);
    });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    request.mockImplementation(async () =>
      Response.json([{ ...room, notificationId: "recovered" }]),
    );
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() =>
      expect(result.current.data.map((entry) => entry.notificationId)).toEqual([
        "recovered",
      ]),
    );
    expect(result.current.isStale).toBe(false);
    request.mockImplementation(async () =>
      Response.json({ message: "Forbidden" }, { status: 403 }),
    );
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.data).toEqual([]));
  } finally {
    unmount();
    restoreApi();
    vi.useRealTimers();
  }
});

it("recovers missed facts on a bounded cadence despite continuous deltas and pauses recovery while hidden", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const harness = createRealtimeTest();
  harness.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [{ id: "guild-1", name: "Guild" }],
  );
  harness.queryClient.setQueryData(
    getUsersControllerGetUserPreferencesQueryKey(),
    { guildsOrder: [], hiddenGuildIds: [] },
  );

  const room: ActivePartyGatheringSummary = {
    notificationId: "active",
    organizerName: "Hero",
    applicantCount: 0,
    inPartyCount: 0,
    guildIds: ["guild-1"],
    world: "luvia",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    revision: 1,
  };

  const request = vi.fn(async () => Response.json([room]));

  const restoreApi = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: async (input) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
        );

        if (url.pathname === "/messaging/party-gathering/active")
          return request();
        throw new Error(`Unexpected HTTP request: ${url.pathname}`);
      },
    },
  });

  const { result, rerender, unmount } = renderHook(
    ({ visible }) => useActivePartyGatherings({ visible }),
    { wrapper: harness.wrapper, initialProps: { visible: true } },
  );

  const update = (revision: number) => ({
    v: 1 as const,
    type: "active-party-gathering.updated" as const,
    data: {
      organizationId: "guild-1",
      payload: {
        type: "UPSERT",
        guildId: "guild-1",
        revision,
        summary: { ...room, revision, applicantCount: revision },
      },
    },
  });

  try {
    act(() => harness.setSessionDiscordId("current-discord"));
    harness.open();
    await harness.join(["guild-1"], undefined, [
      "lootlog.active-party-gatherings.v1",
    ]);
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(request).toHaveBeenCalledTimes(1);
    request.mockImplementation(async () => Response.json([]));

    for (let revision = 2; revision < 8; revision++) {
      // eslint-disable-next-line no-await-in-loop -- Delivery must precede each clock step to prove deltas cannot postpone recovery.
      await harness.receive(update(revision));
      // eslint-disable-next-line no-await-in-loop -- Advance between deliveries rather than dispatching the burst at one instant.
      await act(async () => vi.advanceTimersByTimeAsync(10_000));
    }

    await act(async () => vi.advanceTimersByTimeAsync(6_100));
    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(request).toHaveBeenCalledTimes(2);
    request.mockImplementation(async () => Response.json({}, { status: 503 }));
    await act(async () => vi.advanceTimersByTimeAsync(66_000));
    await waitFor(() => expect(result.current.isStale).toBe(true));
    await harness.receive(update(10));
    expect(result.current.isStale).toBe(true);
    request.mockImplementation(async () =>
      Response.json([{ ...room, revision: 11 }]),
    );
    await act(async () => vi.advanceTimersByTimeAsync(66_000));
    await waitFor(() => expect(result.current.isStale).toBe(false));
    expect(result.current.data[0]?.revision).toBe(11);

    rerender({ visible: false });
    const beforeHidden = request.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(2 * 60_000));
    expect(request).toHaveBeenCalledTimes(beforeHidden);
    request.mockImplementation(async () => Response.json([]));
    rerender({ visible: true });
    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(request).toHaveBeenCalledTimes(beforeHidden + 1);
  } finally {
    unmount();
    restoreApi();
    vi.useRealTimers();
  }
});

it("applies scoped active summaries without HTTP fanout and reconciles missed updates after reconnect", async () => {
  const harness = createRealtimeTest();
  harness.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [{ id: "guild-1", name: "Guild" }],
  );
  harness.queryClient.setQueryData(
    getUsersControllerGetUserPreferencesQueryKey(),
    {
      guildsOrder: [],
      hiddenGuildIds: [],
    },
  );

  const room = {
    notificationId: "active",
    organizerName: "Hero",
    organizerDiscordId: "organizer",
    applicantCount: 0,
    inPartyCount: 0,
    guildIds: ["guild-1"],
    world: "luvia",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    revision: 1,
  };

  const request = vi.fn(async () => Response.json([room]));

  const restoreApi = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: async (input) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
        );

        if (url.pathname === "/messaging/party-gathering/active")
          return request();
        throw new Error(`Unexpected HTTP request: ${url.pathname}`);
      },
    },
  });

  const { result, unmount } = renderHook(useActivePartyGatherings, {
    wrapper: harness.wrapper,
  });

  const capabilities = ["lootlog.active-party-gatherings.v1"];

  const update = (revision: number, applicantCount: number) => ({
    v: 1 as const,
    type: "active-party-gathering.updated" as const,
    data: {
      organizationId: "guild-1",
      payload: {
        type: "UPSERT",
        guildId: "guild-1",
        revision,
        summary: { ...room, revision, applicantCount },
      },
    },
  });

  try {
    act(() => harness.setSessionDiscordId("current-discord"));
    harness.open();
    await harness.join(["guild-1"], undefined, capabilities);
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(request).toHaveBeenCalledTimes(1);
    await harness.receive(update(3, 2), update(2, 1), update(3, 2));
    await waitFor(() => expect(result.current.data[0]?.applicantCount).toBe(2));
    await harness.receive(
      {
        v: 1,
        type: "chat.updated",
        data: { organizationId: "guild-1", payload: { id: "chat" } },
      },
      {
        v: 1,
        type: "chat.deleted",
        data: { organizationId: "guild-1", payload: { id: "chat" } },
      },
    );
    expect(request).toHaveBeenCalledTimes(1);

    const pending = Promise.withResolvers<Response>();
    request.mockImplementationOnce(() => pending.promise);
    let refresh: ReturnType<typeof result.current.refetch>;
    act(() => {
      refresh = result.current.refetch();
    });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await harness.receive({
      v: 1,
      type: "active-party-gathering.updated",
      data: {
        organizationId: "guild-1",
        payload: {
          type: "REMOVE",
          guildId: "guild-1",
          notificationId: room.notificationId,
          revision: 4,
          organizerDiscordId: "organizer",
        },
      },
    });
    await act(async () => {
      pending.resolve(
        Response.json([{ ...room, revision: 3, applicantCount: 2 }]),
      );
      await refresh;
    });
    await harness.receive(update(3, 2));
    await waitFor(() => expect(result.current.data).toEqual([]));
    request.mockImplementation(async () =>
      Response.json([{ ...room, notificationId: "missed-while-offline" }]),
    );
    act(() => harness.realtime.disconnect());
    act(() => harness.realtime.connect());
    harness.open();
    await harness.join(["guild-1"], undefined, capabilities);
    await waitFor(() =>
      expect(result.current.data.map((entry) => entry.notificationId)).toEqual([
        "missed-while-offline",
      ]),
    );
    expect(request).toHaveBeenCalledTimes(3);
    request.mockImplementation(async () =>
      Response.json([{ ...room, notificationId: "after-character-switch" }]),
    );
    act(() =>
      setTestRuntimeGame({ hero: { accountId: "1", characterId: "2" } }),
    );
    harness.open();
    await harness.join(["guild-1"], undefined, capabilities);
    await waitFor(() =>
      expect(result.current.data.map((entry) => entry.notificationId)).toEqual([
        "after-character-switch",
      ]),
    );
    expect(request).toHaveBeenCalledTimes(4);
    request.mockImplementation(async () =>
      Response.json({ message: "Unavailable" }, { status: 500 }),
    );
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.isStale).toBe(true));
    await harness.receive(update(6, 5));
    await waitFor(() =>
      expect(
        result.current.data.some((entry) => entry.notificationId === "active"),
      ).toBe(true),
    );
    expect(result.current.isStale).toBe(true);
    expect(request).toHaveBeenCalledTimes(5);
    act(() => harness.setSessionDiscordId(null));
    await waitFor(() => expect(result.current.data).toEqual([]));
  } finally {
    unmount();
    restoreApi();
  }
});
