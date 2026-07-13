import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useCancelPartyGathering } from "./use-cancel-party-gathering";
import { usePartyFinderStore } from "@/store/party-finder.store";

const mockCancelPartyGathering = vi.fn();
const mockSetOpen = vi.fn();

type MockWindowsStoreState = {
  setOpen: typeof mockSetOpen;
};

vi.mock("@/lib/api/generated/main/party-ready-room/party-ready-room", () => ({
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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useCancelPartyGathering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePartyFinderStore.getState().clearReadyRooms();
    usePartyFinderStore.getState().mergeProjection({
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
      readyCheck: null,
      viewer: "ORGANIZER",
      participants: {},
    });
  });

  it("cancels with the current revision and stores the terminal projection", async () => {
    mockCancelPartyGathering.mockResolvedValue({
      notificationId: "notif-123",
      guildIds: ["guild-1"],
      status: "CANCELLED",
      revision: 2,
      viewer: "ORGANIZER",
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
    expect(
      usePartyFinderStore.getState().projections["notif-123"],
    ).toMatchObject({ status: "CANCELLED", revision: 2 });
    expect(mockSetOpen).toHaveBeenCalledWith("party-finder", false);
  });
});
