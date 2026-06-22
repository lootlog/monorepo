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

vi.mock("@/api", () => ({
  cancelPartyGathering: (...args: unknown[]) =>
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
    });
  });

  it("should handle 200 response with guildIds", async () => {
    mockCancelPartyGathering.mockResolvedValue({
      success: true,
      guildIds: ["guild-1"],
      requestSummary: {
        totalRequests: 2,
        successCount: 2,
        failureCount: 0,
      },
    });

    const { result } = renderHook(() => useCancelPartyGathering(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCancelPartyGathering).toHaveBeenCalledWith(
      expect.objectContaining({
        partyGathering: expect.objectContaining({
          notificationId: "notif-123",
        }),
      }),
    );
    expect(mockSetOpen).toHaveBeenCalledWith("party-finder", false);
  });

  it("should handle 204 response with no body", async () => {
    mockCancelPartyGathering.mockResolvedValue({
      success: true,
      guildIds: [],
      requestSummary: {
        totalRequests: 1,
        successCount: 1,
        failureCount: 0,
      },
    });

    const { result } = renderHook(() => useCancelPartyGathering(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(usePartyFinderStore.getState().partyGathering).toBeNull();
    expect(mockSetOpen).toHaveBeenCalledWith("party-finder", false);
  });
});
