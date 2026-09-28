import type { ServerEvent } from "@lootlog/client/realtime";
import type { PartyGatheringSummary } from "@lootlog/schema/party-ready-room";
import { getSocket } from "@/lib/socket";
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

    expect(requestsAfterJoin).toBe(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
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
      location: "Test map",
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

it("patches observer rosters without HTTP and preserves pushes over delayed discovery", async () => {
  const harness = createRealtimeTest();
  harness.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [{ id: "guild-1", name: "Guild" }],
  );
  harness.queryClient.setQueryData(
    getUsersControllerGetUserPreferencesQueryKey(),
    { guildsOrder: [], hiddenGuildIds: [] },
  );

  const room = {
    notificationId: "observed-room",
    organizerName: "Organizer",
    applicantCount: 0,
    inPartyCount: 0,
    guildIds: ["guild-1"],
    world: "luvia",
    revision: 1,
    volunteers: [],
    partyState: { status: "UNKNOWN" as const },
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  };

  const initial = Promise.withResolvers<Response>();
  const request = vi.fn(() => initial.promise);

  const restoreApi = configureApiClients({
    main: { baseUrl: "https://api.example.test", fetch: async () => request() },
  });

  const { result, unmount } = renderHook(useActivePartyGatherings, {
    wrapper: harness.wrapper,
  });

  try {
    act(() => harness.setSessionDiscordId("observer"));
    harness.open();
    await harness.join(["guild-1"], undefined, [
      "lootlog.party-gathering-state.v1",
    ]);
    await waitFor(() => expect(request).toHaveBeenCalled());
    const requestsAfterJoin = request.mock.calls.length;

    expect(requestsAfterJoin).toBe(1);

    const volunteer = {
      characterId: "applicant",
      nick: "Chętny",
      icon: "hero.gif",
      lvl: 100,
      prof: "w",
      partyPresence: "OUTSIDE" as const,
    };

    const event = (gathering: PartyGatheringSummary): ServerEvent => ({
      v: 1 as const,
      type: "party-gathering.state-updated" as const,
      data: {
        organizationId: "guild-1",
        payload: { type: "UPSERT", gathering },
      },
    });

    const volunteered = {
      ...room,
      revision: 2,
      applicantCount: 1,
      volunteers: [volunteer],
    };

    await harness.receive(event(volunteered));
    await waitFor(() =>
      expect(result.current.data[0]?.volunteers).toEqual([volunteer]),
    );
    await act(async () => {
      initial.resolve(Response.json([room]));
    });
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.data[0]?.revision).toBe(2);

    const observed = {
      ...volunteered,
      revision: 3,
      partyMemberCount: 1,
      partyState: {
        status: "OBSERVED" as const,
        observedAt: new Date().toISOString(),
        members: [{ characterId: "other", nick: "Spoza zbiórki" }],
      },
    };

    await harness.receive(event(observed), event(volunteered), event(observed));
    await waitFor(() =>
      expect(result.current.data[0]?.partyState).toEqual(observed.partyState),
    );
    expect(result.current.data[0]?.volunteers).toEqual([volunteer]);

    const departed = {
      ...observed,
      revision: 4,
      partyMemberCount: 0,
      partyState: { ...observed.partyState, members: [] },
      volunteers: [],
      applicantCount: 0,
    };

    await harness.receive(event(departed));
    await waitFor(() =>
      expect(result.current.data[0]?.partyState).toEqual(departed.partyState),
    );
    expect(result.current.data[0]?.volunteers).toEqual([]);
    await harness.receive(
      event({ ...departed, notificationId: "wrong-world", world: "other" }),
    );
    expect(result.current.data).toHaveLength(1);
    expect(request).toHaveBeenCalledTimes(requestsAfterJoin);
    const refresh = Promise.withResolvers<Response>();
    request.mockImplementation(() => refresh.promise);
    let pending: Promise<unknown> | undefined;
    act(() => {
      pending = result.current.refetch();
    });
    await waitFor(() =>
      expect(request).toHaveBeenCalledTimes(requestsAfterJoin + 1),
    );
    await harness.receive({
      v: 1,
      type: "party-gathering.state-updated",
      data: {
        organizationId: "guild-1",
        payload: {
          type: "REMOVE",
          notificationId: room.notificationId,
          revision: 5,
        },
      },
    });
    await waitFor(() => expect(result.current.data).toEqual([]));
    await act(async () => {
      refresh.resolve(Response.json([departed]));
      await pending;
    });
    await harness.receive(event(departed));
    expect(result.current.data).toEqual([]);
    expect(request).toHaveBeenCalledTimes(requestsAfterJoin + 1);

    const requestsBeforeReconnect = request.mock.calls.length;

    const restored = {
      ...room,
      notificationId: "created-while-offline",
      revision: 1,
    };

    request.mockImplementation(async () => Response.json([restored]));
    act(() => harness.wire.close());
    act(() => {
      getSocket().connect();
      harness.wire.open();
    });
    await harness.join(["guild-1"], undefined, [
      "lootlog.party-gathering-state.v1",
    ]);
    await waitFor(() =>
      expect(result.current.data.map((entry) => entry.notificationId)).toEqual([
        restored.notificationId,
      ]),
    );

    expect(request).toHaveBeenCalledTimes(requestsBeforeReconnect + 1);
    act(() =>
      harness.queryClient.setQueryData(
        getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
        [
          { id: "guild-1", name: "First" },
          { id: "guild-2", name: "Second" },
        ],
      ),
    );
    request.mockImplementation(async () =>
      Response.json([{ ...restored, guildIds: ["guild-1", "guild-2"] }]),
    );
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() =>
      expect(result.current.data[0]?.guildIds).toEqual(["guild-1", "guild-2"]),
    );
    const narrowed = { ...restored, guildIds: ["guild-2"] };
    request.mockImplementation(async () => Response.json([narrowed]));
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() =>
      expect(result.current.data[0]?.guildIds).toEqual(["guild-2"]),
    );
    request.mockImplementation(async () => Response.json([]));
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.data).toEqual([]));
    request.mockImplementation(async () => Response.json([narrowed]));
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() =>
      expect(result.current.data[0]?.notificationId).toBe(
        restored.notificationId,
      ),
    );

    const permissionRefresh = Promise.withResolvers<Response>();
    request.mockImplementation(() => permissionRefresh.promise);
    await harness.receive({
      v: 1,
      type: "permissions.updated",
      data: { organizationIds: [], subscriptionScopes: [] },
    });
    await waitFor(() => expect(result.current.data).toEqual([]));
    await act(async () => {
      permissionRefresh.resolve(Response.json([]));
    });
  } finally {
    unmount();
    restoreApi();
  }
});
