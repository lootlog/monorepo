import { act, renderHook, waitFor } from "@testing-library/react";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  type ActivePartyGatheringSummary,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { createRealtimeTest } from "@/test/realtime-test";
import { useActivePartyGatherings } from "./use-active-party-gatherings";

it("retains visible unexpired gatherings after failed refresh and recovers on success", async () => {
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
