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
    world: "pandora",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
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
          world: "pandora",
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
          world: "pandora",
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
  }
});
