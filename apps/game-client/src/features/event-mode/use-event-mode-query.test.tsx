import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import {
  createEventModeQueryKey,
  useEventModeQuery,
} from "./use-event-mode-query";

const mocks = vi.hoisted(() => ({
  connected: false,
  getEventMode: vi.fn(),
}));

type RuntimeQueryOptions = {
  enabled?: boolean;
  refetchInterval?: false | number;
  refetchOnWindowFocus?: boolean | "always";
};

vi.mock("@/contexts/socket-context", () => ({
  useSocket: () => ({ connected: mocks.connected, socket: null }),
}));

vi.mock("@/hooks/auth/use-session", () => ({
  useSession: () => ({
    data: { user: { id: "user-1" } },
    isPending: false,
  }),
}));

vi.mock("@lootlog/api-client/react-query/main/event-mode", () => ({
  eventModeControllerGetEventMode: mocks.getEventMode,
}));

describe("useEventModeQuery", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mocks.connected = false;
    mocks.getEventMode.mockReset();
    mocks.getEventMode.mockResolvedValue({
      generatedAt: "2026-07-13T12:00:00.000Z",
      events: [],
    });
    useGlobalStore.getState().setGameState({ gameInitialized: true });
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "account-1",
        characterId: "1",
        currentHp: 1,
        icon: "hero.gif",
        level: 300,
        maxHp: 1,
        name: "Hero",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 1, name: "Map", visibility: 30 },
      world: "Tempest",
    });
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
    const game = useGameStore.getState().game;
    if (!game) throw new Error("Expected game fixture");
    useGameStore.getState().replaceGame({ ...game, world: "unknown" });

    const { result } = renderHook(() => useEventModeQuery({ active: true }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.enabled).toBe(false);
    expect(mocks.getEventMode).not.toHaveBeenCalled();
  });

  it("queries the normalized world and refetches after socket reconnection", async () => {
    const { rerender } = renderHook(() => useEventModeQuery({ active: true }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(mocks.getEventMode).toHaveBeenCalledTimes(1));
    expect(mocks.getEventMode).toHaveBeenLastCalledWith({ world: "tempest" });

    mocks.connected = true;
    rerender();

    await waitFor(() => expect(mocks.getEventMode).toHaveBeenCalledTimes(2));
  });

  it("does not query or poll while Event Mode presentation is hidden", () => {
    const { result } = renderHook(() => useEventModeQuery({ active: false }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.enabled).toBe(false);
    expect(mocks.getEventMode).not.toHaveBeenCalled();
    const query = queryClient.getQueryCache().find({
      exact: true,
      queryKey: result.current.queryKey,
    });
    const queryOptions = query?.options as RuntimeQueryOptions | undefined;
    expect(queryOptions?.enabled).toBe(false);
    expect(queryOptions?.refetchInterval).toBe(false);
    expect(queryOptions?.refetchOnWindowFocus).toBe(false);
  });

  it("queries when Event Mode presentation becomes visible", async () => {
    let active = false;
    const { result, rerender } = renderHook(
      () => useEventModeQuery({ active }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    expect(mocks.getEventMode).not.toHaveBeenCalled();
    active = true;
    rerender();

    await waitFor(() => expect(mocks.getEventMode).toHaveBeenCalledTimes(1));
    const query = queryClient.getQueryCache().find({
      exact: true,
      queryKey: result.current.queryKey,
    });
    const queryOptions = query?.options as RuntimeQueryOptions | undefined;
    expect(queryOptions?.refetchInterval).toBe(15_000);
    expect(queryOptions?.refetchOnWindowFocus).toBe("always");
  });

  it("refetches on focus even while cached data is fresh", async () => {
    mocks.connected = true;
    renderHook(() => useEventModeQuery({ active: true }), {
      wrapper: createWrapper(queryClient),
    });
    await waitFor(() => expect(mocks.getEventMode).toHaveBeenCalledTimes(1));

    focusManager.setFocused(false);
    focusManager.setFocused(true);

    await waitFor(() => expect(mocks.getEventMode).toHaveBeenCalledTimes(2));
  });

  it("does not rerender for an unchanged polling response", async () => {
    mocks.connected = true;
    mocks.getEventMode
      .mockResolvedValueOnce({
        generatedAt: "2026-07-13T12:00:00.000Z",
        events: [],
      })
      .mockResolvedValueOnce({
        generatedAt: "2026-07-13T12:00:15.000Z",
        events: [],
      });
    let renderCount = 0;
    const { result } = renderHook(
      () => {
        renderCount += 1;
        return useEventModeQuery({ active: true });
      },
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => expect(result.current.data).toEqual({ events: [] }));
    const renderCountAfterInitialFetch = renderCount;

    await act(async () => {
      await queryClient.refetchQueries({
        exact: true,
        queryKey: result.current.queryKey,
      });
    });

    expect(mocks.getEventMode).toHaveBeenCalledTimes(2);
    expect(renderCount).toBe(renderCountAfterInitialFetch);
  });

  it("does not rerender when only the hero coordinates change", async () => {
    let renderCount = 0;
    const { result } = renderHook(
      () => {
        renderCount += 1;
        return useEventModeQuery({ active: true });
      },
      {
        wrapper: createWrapper(queryClient),
      },
    );
    await waitFor(() => expect(result.current.data).toEqual({ events: [] }));
    const renderCountBeforeMovement = renderCount;
    const game = useGameStore.getState().game;
    if (!game) throw new Error("Expected game fixture");

    act(() => {
      useGameStore.getState().replaceGame({
        ...game,
        hero: { ...game.hero, x: game.hero.x + 1 },
      });
    });

    expect(renderCount).toBe(renderCountBeforeMovement);
  });
});

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}
