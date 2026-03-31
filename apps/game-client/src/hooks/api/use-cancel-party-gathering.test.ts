import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useCancelPartyGathering } from "./use-cancel-party-gathering";
import { usePartyFinderStore } from "@/store/party-finder.store";

const mockDelete = vi.fn();
const mockPatch = vi.fn();

vi.mock("@/hooks/api/use-api-client", () => ({
  useAuthenticatedApiClient: () => ({
    client: { delete: mockDelete, patch: mockPatch },
  }),
}));

vi.mock("@/store/windows.store", () => ({
  useWindowsStore: (selector: any) => selector({ setOpen: vi.fn() }),
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
    usePartyFinderStore.setState({
      partyGathering: {
        notificationId: "notif-123",
        discordId: "user-1",
        character: {
          nick: "Test",
          lvl: 100,
          prof: "w",
          characterId: "1",
          accountId: "1",
          icon: "test.gif",
        },
        world: "pandora",
        createdAt: new Date().toISOString(),
      },
      chatMessageIds: { "guild-1": "msg-1" },
    });
  });

  it("should handle 200 response with guildIds", async () => {
    mockDelete.mockResolvedValue({
      status: 200,
      data: { success: true, guildIds: ["guild-1"] },
    });
    mockPatch.mockResolvedValue({});

    const { result } = renderHook(() => useCancelPartyGathering(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockDelete).toHaveBeenCalledWith(
      "/messaging/party-gathering/notif-123",
    );
    expect(mockPatch).toHaveBeenCalledWith(
      "/guilds/guild-1/chat-messages/msg-1",
      { message: "TestPlayer zakończył zbieranie grupy" },
    );
  });

  it("should handle 204 response with no body", async () => {
    mockDelete.mockResolvedValue({
      status: 204,
      data: undefined,
    });

    const { result } = renderHook(() => useCancelPartyGathering(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPatch).not.toHaveBeenCalled();
    expect(usePartyFinderStore.getState().partyGathering).toBeNull();
  });
});
