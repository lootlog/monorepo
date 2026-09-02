import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useCancelPartyGathering } from "./use-cancel-party-gathering";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { getChatControllerGetChatMessagesQueryKey } from "@lootlog/client/main";

const mockCancelPartyGathering = vi.fn();
const mockSetOpen = vi.fn();

type MockWindowsStoreState = {
  setOpen: typeof mockSetOpen;
};

vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  partyReadyRoomControllerCancel: (...args: unknown[]) =>
    mockCancelPartyGathering(...args),
}));

vi.mock("@/store/windows.store", () => ({
  useWindowsStore: (selector: (state: MockWindowsStoreState) => unknown) =>
    selector({ setOpen: mockSetOpen }),
}));

vi.stubGlobal("message", vi.fn());

vi.mock("@/lib/game", () => ({
  Game: { hero: { nick: "TestPlayer" } },
}));

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
    vi.clearAllMocks();
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
    mockCancelPartyGathering.mockResolvedValue({
      schemaVersion: 3,
      type: "REMOVE",
      notificationId: "notif-123",
      revision: 2,
    });

    const { result } = renderHook(() => useCancelPartyGathering(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCancelPartyGathering).toHaveBeenCalledWith(
      { notificationId: "notif-123" },
      { expectedRevision: 1 },
    );
    expect(usePartyFinderStore.getState()).toMatchObject({
      projections: {},
      roomVersions: {
        "notif-123": { revision: 2, presence: "REMOVED" },
      },
    });
    expect(mockSetOpen).toHaveBeenCalledWith("party-finder", false);
  });

  it("invalidates affected chat histories after cancellation", async () => {
    mockCancelPartyGathering.mockResolvedValue({
      schemaVersion: 3,
      type: "REMOVE",
      notificationId: "notif-123",
      revision: 2,
    });
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
