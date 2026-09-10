import { configureApiClients } from "@lootlog/client/transport";
import { useWindowsStore } from "@/store/windows.store";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, onTestFinished } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useCancelPartyGathering } from "./use-cancel-party-gathering";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { getChatControllerGetChatMessagesQueryKey } from "@lootlog/client/main";

const requests: Request[] = [];

function createWrapper(
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  }),
) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useCancelPartyGathering", () => {
  beforeEach(() => {
    requests.length = 0;
    useWindowsStore.getState().setOpen("party-finder", true);

    const restore = configureApiClients({
      main: {
        baseUrl: "https://api.example.test",
        fetch: (input, init) => {
          requests.push(new Request(input, init));

          return Promise.resolve(
            Response.json({
              schemaVersion: 3,
              type: "REMOVE",
              notificationId: "notif-123",
              revision: 2,
            }),
          );
        },
      },
    });

    onTestFinished(restore);
    usePartyFinderStore.getState().clearReadyRooms();
    usePartyFinderStore.getState().mergeProjection({
      schemaVersion: 3,
      notificationId: "notif-123",
      organizerDiscordId: "user-1",
      organizerCharacter: {
        nick: "Test",
        lvl: 100,
        prof: "w",
        characterId: "1",
        accountId: "1",
        icon: "test.gif",
      },
      guildIds: ["guild-1"],
      world: "pandora",
      status: "ACTIVE",
      revision: 1,
      createdAt: "2026-07-13T10:00:00.000Z",
      updatedAt: "2026-07-13T10:00:00.000Z",
      expiresAt: "2026-07-13T10:30:00.000Z",
      viewer: "ORGANIZER",
      participants: {},
      ownedParticipantIds: [],
    });
  });

  it("cancels with the current revision and removes the local projection", async () => {
    const { result } = renderHook(() => useCancelPartyGathering(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toContain("notif-123");
    expect(await requests[0]?.json()).toEqual({ expectedRevision: 1 });
    expect(usePartyFinderStore.getState()).toMatchObject({
      projections: {},
      roomVersions: {
        "notif-123": { revision: 2, presence: "REMOVED" },
      },
    });
    expect(useWindowsStore.getState()["party-finder"].open).toBe(false);
  });

  it("invalidates affected chat histories after cancellation", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });

    const chatQueryKey = getChatControllerGetChatMessagesQueryKey({
      guildId: "guild-1",
    });

    queryClient.setQueryData(chatQueryKey, [{ id: "message-1" }]);

    const { result } = renderHook(() => useCancelPartyGathering(), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryState(chatQueryKey)?.isInvalidated).toBe(true);
  });
});
