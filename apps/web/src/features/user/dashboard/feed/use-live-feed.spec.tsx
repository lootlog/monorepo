// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Storage as MemoryStorage } from "happy-dom";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { useLiveFeed } from "./use-live-feed";
import { feedResponse, feedKill } from "./live-feed-test-data";
const mocks = vi.hoisted(() => {
  const handlers = new Map<string, Set<(item?: typeof feedKill) => void>>();
  return {
    request: vi.fn(),
    handlers,
    socket: {
      on: (name: string, handler: (item?: typeof feedKill) => void) => {
        const listeners = handlers.get(name) ?? new Set();
        listeners.add(handler);
        handlers.set(name, listeners);
      },
      off: (name: string, handler: (item?: typeof feedKill) => void) => {
        handlers.get(name)?.delete(handler);
      },
      emit: (name: string, item?: typeof feedKill) =>
        handlers.get(name)?.forEach((handler) => handler(item)),
    },
  };
});
vi.mock("@/hooks/utils/use-gateway", () => ({
  useGateway: () => ({ socket: mocks.socket, connected: true }),
}));
vi.mock("@lootlog/client/main", () => ({
  getUsersControllerGetUserFeedQueryKey: () => ["user-feed"],
  getUsersControllerGetUserFeedQueryOptions: () => ({
    queryKey: ["user-feed"],
    queryFn: mocks.request,
  }),
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-06T12:01:00Z"));
  mocks.handlers.clear();
  mocks.request.mockReset();
  vi.stubGlobal("localStorage", new MemoryStorage());
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function renderFeed() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(() => useLiveFeed(), { wrapper }), queryClient };
}
it("receives complete live entries without further HTTP requests and refetches on reconnect", async () => {
  mocks.request.mockResolvedValue(feedResponse());
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(result.current.state.items).toEqual(feedResponse().items);
  act(() => {
    for (let count = 2; count <= 20; count += 1) {
      mocks.socket.emit(GatewayEvent.FEED_ENTRY, {
        ...feedKill,
        count,
        version: count,
      });
    }
  });
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(mocks.request).toHaveBeenCalledTimes(1);
  expect(result.current.state.items).toEqual(feedResponse(20).items);
  act(() => mocks.socket.emit(GatewayEvent.CONNECT));
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(mocks.request).toHaveBeenCalledTimes(2);
  expect(result.current.state.items).toEqual(feedResponse().items);
  // A kill accepted while session.join is pending must appear in the post-join snapshot.
  mocks.request.mockResolvedValue(feedResponse(21));
  act(() => mocks.socket.emit(GatewayEvent.JOIN));
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(mocks.request).toHaveBeenCalledTimes(3);
  expect(result.current.state.items).toEqual(feedResponse(21).items);
});
it.each([GatewayEvent.PERMISSIONS_UPDATED, GatewayEvent.JOIN])(
  "purges current, buffered and cached entries on %s even if refresh fails",
  async (event) => {
    mocks.request
      .mockResolvedValueOnce(feedResponse())
      .mockRejectedValueOnce(new Error("network"));
    const { result, queryClient } = renderFeed();
    await act(() => vi.advanceTimersByTimeAsync(0));
    act(() => result.current.setAtTop(false));
    act(() =>
      mocks.socket.emit(GatewayEvent.FEED_ENTRY, {
        ...feedKill,
        count: 3,
        version: 3,
      }),
    );
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(result.current.state.pending).toEqual(feedResponse(3).items);
    act(() => mocks.socket.emit(event));
    expect(result.current.state.items).toEqual([]);
    expect(result.current.state.pending).toBeUndefined();
    expect(queryClient.getQueryData(["user-feed"])).toBeUndefined();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(result.current.state.items).toEqual([]);
    expect(result.current.state.isError).toBe(true);
  },
);
it("ignores a pre-permission response that arrives after access was revoked", async () => {
  let finish: (data: ReturnType<typeof feedResponse>) => void = () => undefined;
  mocks.request
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce({ ...feedResponse(), items: [] });
  const { result } = renderFeed();
  act(() => mocks.socket.emit(GatewayEvent.PERMISSIONS_UPDATED));
  await act(async () => {
    finish(feedResponse());
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(result.current.state.items).toEqual([]);
  expect(result.current.state.pending).toBeUndefined();
});

it("remembers pause across remounts while allowing the initial snapshot", async () => {
  mocks.request.mockResolvedValue(feedResponse());
  const first = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => first.result.current.setPaused(true));
  expect(window.localStorage.getItem("lootlog:dashboard:feed-paused")).toBe(
    "true",
  );
  first.unmount();
  const next = renderFeed();
  expect(next.result.current.paused).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(next.result.current.state.items).toEqual(feedResponse().items);
  act(() =>
    mocks.socket.emit(GatewayEvent.FEED_ENTRY, {
      ...feedKill,
      count: 3,
      version: 3,
    }),
  );
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(mocks.request).toHaveBeenCalledTimes(2);
});

it("ignores live entries while paused and fetches a fresh snapshot immediately on resume", async () => {
  mocks.request
    .mockResolvedValueOnce(feedResponse())
    .mockResolvedValueOnce(feedResponse(4));
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => result.current.setPaused(true));
  act(() =>
    mocks.socket.emit(GatewayEvent.FEED_ENTRY, {
      ...feedKill,
      count: 3,
      version: 3,
    }),
  );
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(mocks.request).toHaveBeenCalledTimes(1);
  expect(result.current.state.items).toEqual(feedResponse().items);
  act(() => result.current.setPaused(false));
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(mocks.request).toHaveBeenCalledTimes(2);
  expect(result.current.state.items).toEqual(feedResponse(4).items);
});

it.each([GatewayEvent.PERMISSIONS_UPDATED, GatewayEvent.JOIN])(
  "still purges restricted snapshots while paused on %s without starting a request",
  async (event) => {
    mocks.request.mockResolvedValue(feedResponse());
    const { result, queryClient } = renderFeed();
    await act(() => vi.advanceTimersByTimeAsync(0));
    act(() => result.current.setPaused(true));
    act(() => mocks.socket.emit(event));
    expect(result.current.state.items).toEqual([]);
    expect(result.current.state.pending).toBeUndefined();
    expect(queryClient.getQueryData(["user-feed"])).toBeUndefined();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(mocks.request).toHaveBeenCalledTimes(1);
    act(() => result.current.setPaused(false));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mocks.request).toHaveBeenCalledTimes(2);
  },
);

it("merges entries received while the initial HTTP snapshot is in flight", async () => {
  let finish: (data: ReturnType<typeof feedResponse>) => void = () => undefined;
  mocks.request.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result } = renderFeed();
  act(() => {
    mocks.socket.emit(GatewayEvent.FEED_ENTRY, {
      ...feedKill,
      count: 3,
      version: 3,
    });
    mocks.socket.emit(GatewayEvent.FEED_ENTRY, {
      ...feedKill,
      count: 2,
      version: 2,
    });
  });
  await act(async () => {
    finish(feedResponse());
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.state.items).toEqual(feedResponse(3).items);
  expect(mocks.request).toHaveBeenCalledTimes(1);
});

it("ignores an in-flight HTTP snapshot after pause and refreshes on resume", async () => {
  let finish: (data: ReturnType<typeof feedResponse>) => void = () => undefined;
  mocks.request
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce(feedResponse(4));
  const { result } = renderFeed();
  act(() => result.current.setPaused(true));
  await act(async () => {
    finish(feedResponse(3));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.state.items ?? []).toEqual([]);
  expect(result.current.state.isFetching).toBe(false);
  act(() => result.current.setPaused(false));
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(result.current.state.items).toEqual(feedResponse(4).items);
});

it.each([GatewayEvent.PERMISSIONS_UPDATED, GatewayEvent.JOIN])(
  "shows the refreshed snapshot after %s clears a scrolled feed",
  async (event) => {
    mocks.request
      .mockResolvedValueOnce(feedResponse())
      .mockResolvedValueOnce(feedResponse(4));
    const { result } = renderFeed();
    await act(() => vi.advanceTimersByTimeAsync(0));
    act(() => result.current.setAtTop(false));
    act(() => mocks.socket.emit(event));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.state.items).toEqual(feedResponse(4).items);
    expect(result.current.state.pending).toBeUndefined();
  },
);
