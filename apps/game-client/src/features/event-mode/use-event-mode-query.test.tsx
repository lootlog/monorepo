import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Game } from "@/lib/game";
import { useGlobalStore } from "@/store/global.store";
import {
  createEventModeQueryKey,
  useEventModeQuery,
} from "./use-event-mode-query";

const mocks = vi.hoisted(() => ({
  connected: false,
  getEventMode: vi.fn(),
}));

vi.mock("@/contexts/socket-context", () => ({
  useSocket: () => ({ connected: mocks.connected, socket: null }),
}));

vi.mock("@/hooks/auth/use-session", () => ({
  useSession: () => ({
    data: { user: { id: "user-1" } },
    isPending: false,
  }),
}));

vi.mock("@/lib/api/generated/main/event-mode/event-mode", () => ({
  eventModeControllerGetEventMode: mocks.getEventMode,
}));

describe("useEventModeQuery", () => {
  let queryClient: QueryClient;
  let getAccountIdSpy: ReturnType<typeof vi.spyOn>;
  let getWorldNameSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mocks.connected = false;
    mocks.getEventMode.mockReset();
    mocks.getEventMode.mockResolvedValue({
      generatedAt: "2026-07-13T12:00:00.000Z",
      events: [],
    });
    useGlobalStore.getState().setGameState({ gameInitialized: true });
    getAccountIdSpy = vi
      .spyOn(Game, "getAccountId")
      .mockReturnValue("account-1");
    getWorldNameSpy = vi.spyOn(Game, "getWorldName").mockReturnValue("Tempest");
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 30_000,
        },
      },
    });
  });

  afterEach(() => {
    getAccountIdSpy.mockRestore();
    getWorldNameSpy.mockRestore();
    queryClient.clear();
    focusManager.setFocused(undefined);
  });

  it("uses the authenticated user, Margonem account, and world in the key", () => {
    expect(
      createEventModeQueryKey({
        authenticatedLootlogUserId: "user-1",
        margonemAccountId: "account-1",
        normalizedWorld: "tempest",
      }),
    ).toEqual(["event-mode", "user-1", "account-1", "tempest"]);
  });

  it("does not query while the game exposes the fallback world", () => {
    getWorldNameSpy.mockReturnValue("unknown");

    const { result } = renderHook(() => useEventModeQuery(), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.enabled).toBe(false);
    expect(mocks.getEventMode).not.toHaveBeenCalled();
  });

  it("queries the normalized world and refetches after socket reconnection", async () => {
    const { rerender } = renderHook(() => useEventModeQuery(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(mocks.getEventMode).toHaveBeenCalledTimes(1));
    expect(mocks.getEventMode).toHaveBeenLastCalledWith({ world: "tempest" });

    mocks.connected = true;
    rerender();

    await waitFor(() => expect(mocks.getEventMode).toHaveBeenCalledTimes(2));
  });

  it("refetches on focus even while cached data is fresh", async () => {
    mocks.connected = true;
    renderHook(() => useEventModeQuery(), {
      wrapper: createWrapper(queryClient),
    });
    await waitFor(() => expect(mocks.getEventMode).toHaveBeenCalledTimes(1));

    focusManager.setFocused(false);
    focusManager.setFocused(true);

    await waitFor(() => expect(mocks.getEventMode).toHaveBeenCalledTimes(2));
  });
});

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}
