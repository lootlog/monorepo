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
  const handlers = new Map<string, Set<(item?: unknown) => void>>();
  return {
    request: vi.fn(),
    handlers,
    socket: {
      on: (name: string, handler: (item?: unknown) => void) => {
        const listeners = handlers.get(name) ?? new Set();
        listeners.add(handler);
        handlers.set(name, listeners);
      },
      off: (name: string, handler: (item?: unknown) => void) => {
        handlers.get(name)?.delete(handler);
      },
      emit: (name: string, item?: unknown) =>
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
function deferredResponse() {
  let resolve: (data: ReturnType<typeof feedResponse>) => void = () =>
    undefined;
  const promise = new Promise<ReturnType<typeof feedResponse>>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
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
it.each([GatewayEvent.JOIN])(
  "retains the populated list and marks it stale when %s revalidation fails",
  async (event) => {
    mocks.request
      .mockResolvedValueOnce(feedResponse())
      .mockRejectedValueOnce(new Error("network"));
    const { result } = renderFeed();
    await act(() => vi.advanceTimersByTimeAsync(0));
    const original = result.current.state.items;
    act(() => mocks.socket.emit(event));
    expect(result.current.state.items).toBe(original);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.state.items).toBe(original);
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

it.each([GatewayEvent.JOIN])(
  "keeps a paused list until %s resolves its authoritative access snapshot",
  async (event) => {
    const response = deferredResponse();
    mocks.request
      .mockResolvedValueOnce(feedResponse())
      .mockReturnValueOnce(response.promise);
    const { result } = renderFeed();
    await act(() => vi.advanceTimersByTimeAsync(0));
    const original = result.current.state.items;
    act(() => result.current.setPaused(true));
    act(() => mocks.socket.emit(event));
    expect(result.current.state.items).toBe(original);
    expect(mocks.request).toHaveBeenCalledTimes(2);
    await act(async () => {
      response.resolve({ ...feedResponse(), items: [] });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.state.items).toEqual([]);
    expect(result.current.state.pending).toBeUndefined();
    expect(result.current.paused).toBe(true);
  },
);

it("finishes mandatory access revalidation when the user pauses during the request", async () => {
  const response = deferredResponse();
  mocks.request
    .mockResolvedValueOnce(feedResponse())
    .mockReturnValueOnce(response.promise);
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => mocks.socket.emit(GatewayEvent.PERMISSIONS_UPDATED));
  act(() => result.current.setPaused(true));
  expect(result.current.state.items).toEqual([]);
  await act(async () => {
    response.resolve({ ...feedResponse(), items: [] });
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.state.items).toEqual([]);
});

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

it.each([GatewayEvent.PERMISSIONS_UPDATED])(
  "replaces a scrolled feed atomically after %s revalidation",
  async (event) => {
    const replacement = {
      ...feedResponse(4),
      items: [{ ...feedKill, id: "authorized-replacement" }],
    };
    mocks.request
      .mockResolvedValueOnce(feedResponse())
      .mockResolvedValueOnce(replacement);
    const { result } = renderFeed();
    await act(() => vi.advanceTimersByTimeAsync(0));
    act(() => result.current.setAtTop(false));
    act(() => mocks.socket.emit(event));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.state.items).toEqual(replacement.items);
    expect(result.current.state.pending).toBeUndefined();
  },
);

it("keeps the initial HTTP snapshot visible while the first successful join refreshes it", async () => {
  let finish: (data: ReturnType<typeof feedResponse>) => void = () => undefined;
  mocks.request.mockResolvedValueOnce(feedResponse()).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  const original = result.current.state.items;
  act(() =>
    mocks.socket.emit(GatewayEvent.JOIN, {
      status: "success",
      guildIds: [feedKill.guild.id],
    }),
  );
  expect(result.current.state.items).toBe(original);
  expect(result.current.state.isFetching).toBe(true);
  await act(async () => {
    finish(feedResponse(2));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.state.items).toEqual(feedResponse(2).items);
});

it("keeps visible entries when an ordinary refresh fails", async () => {
  mocks.request
    .mockResolvedValueOnce(feedResponse())
    .mockRejectedValueOnce(new Error("offline"));
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  const original = result.current.state.items;
  act(() => result.current.refresh());
  expect(result.current.state.items).toBe(original);
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(result.current.state.items).toBe(original);
  expect(result.current.state.isError).toBe(true);
});

it("retains the snapshot throughout repeated joins and reconnect requests", async () => {
  mocks.request
    .mockResolvedValueOnce(feedResponse())
    .mockImplementation(() => new Promise(() => {}));
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  const original = result.current.state.items;
  for (const event of [
    GatewayEvent.JOIN,
    GatewayEvent.DISCONNECT,
    GatewayEvent.CONNECT,
    GatewayEvent.JOIN,
  ]) {
    act(() => mocks.socket.emit(event, { status: "success" }));
    expect(result.current.state.items).toBe(original);
  }
  expect(result.current.state.isFetching).toBe(true);
});

it("preserves live entries and their provenance across superseding refreshes", async () => {
  const first = deferredResponse();
  const second = deferredResponse();
  mocks.request
    .mockResolvedValueOnce(feedResponse())
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => result.current.refresh());
  const live = { ...feedKill, id: "new-live-kill", groupKey: "new-live-kill" };
  act(() => mocks.socket.emit(GatewayEvent.FEED_ENTRY, live));
  act(() => mocks.socket.emit(GatewayEvent.JOIN));
  await act(async () => {
    first.resolve({ ...feedResponse(), items: [] });
    second.resolve(feedResponse());
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.state.items).toContainEqual(live);
  expect(result.current.state.animatedKeys).toContain("new-live-kill");
});

it("does not restore pre-permission buffered entries after the authoritative snapshot removes them", async () => {
  const first = deferredResponse();
  const second = deferredResponse();
  mocks.request
    .mockResolvedValueOnce(feedResponse())
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => result.current.refresh());
  act(() =>
    mocks.socket.emit(GatewayEvent.FEED_ENTRY, {
      ...feedKill,
      version: 2,
      count: 2,
    }),
  );
  act(() => mocks.socket.emit(GatewayEvent.PERMISSIONS_UPDATED));
  expect(result.current.state.items).toEqual([]);
  await act(async () => {
    first.resolve(feedResponse(2));
    second.resolve({ ...feedResponse(), items: [] });
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.state.items).toEqual([]);
});

it.each([false, true])(
  "purges displayed, pending and cached entries immediately on permissions change (paused: %s), even if revalidation fails",
  async (paused) => {
    mocks.request
      .mockResolvedValueOnce(feedResponse())
      .mockRejectedValueOnce(new Error("offline"));
    const { result, queryClient } = renderFeed();
    await act(() => vi.advanceTimersByTimeAsync(0));
    act(() => {
      result.current.setAtTop(false);
      mocks.socket.emit(GatewayEvent.FEED_ENTRY, {
        ...feedKill,
        id: "pending",
      });
    });
    expect(result.current.state.pending).toBeDefined();
    act(() => result.current.setPaused(paused));
    act(() => mocks.socket.emit(GatewayEvent.PERMISSIONS_UPDATED));
    expect(result.current.state.items).toEqual([]);
    expect(result.current.state.pending).toBeUndefined();
    expect(queryClient.getQueryData(["user-feed"])).toBeUndefined();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.state.items).toEqual([]);
    expect(result.current.state.isError).toBe(true);
    expect(queryClient.getQueryData(["user-feed"])).toBeUndefined();
  },
);

it.each(["refresh", "reconnect"] as const)(
  "buffers rolling snapshot changes during %s while reading older entries",
  async (trigger) => {
    const replacement = {
      ...feedResponse(),
      items: [{ ...feedKill, id: "newest" }],
    };
    mocks.request
      .mockResolvedValueOnce(feedResponse())
      .mockResolvedValueOnce(replacement);
    const { result } = renderFeed();
    await act(() => vi.advanceTimersByTimeAsync(0));
    const original = result.current.state.items;
    act(() => result.current.setAtTop(false));
    act(() => {
      if (trigger === "refresh") result.current.refresh();
      else mocks.socket.emit(GatewayEvent.CONNECT);
    });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.state.items).toBe(original);
    expect(result.current.state.pending).toEqual(replacement.items);
    act(() => result.current.applyPending());
    expect(result.current.state.items).toEqual(replacement.items);
  },
);

it("applies explicit join access revalidation while scrolled", async () => {
  mocks.request
    .mockResolvedValueOnce(feedResponse())
    .mockResolvedValueOnce({ ...feedResponse(), items: [] });
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => result.current.setAtTop(false));
  act(() => mocks.socket.emit(GatewayEvent.JOIN));
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(result.current.state.items).toEqual([]);
  expect(result.current.state.pending).toBeUndefined();
});
