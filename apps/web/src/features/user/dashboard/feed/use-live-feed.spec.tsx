import { createTestGateway } from "@/lib/testing/gateway";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getUsersControllerGetUserFeedQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
} from "@lootlog/client/main";
// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { DEFAULT_ACTIVITY_FEED_SETTINGS } from "@lootlog/domain/activity-feed";
import { useLiveFeed } from "./use-live-feed";
import type { FeedFilters } from "./live-feed-state";
import { feedResponse, feedKill } from "./live-feed-test-data";

const mocks = {
  request: vi.fn<(url: string) => Promise<ReturnType<typeof feedResponse>>>(),
};

let gateway: ReturnType<typeof createTestGateway>;

function deliverLifecycleEvent(
  event: GatewayEvent,
  organizationIds = [feedKill.guild.id],
) {
  if (event === GatewayEvent.CONNECT) {
    gateway.setConnectionState("ready");

    return;
  }

  if (event === GatewayEvent.DISCONNECT) {
    gateway.setConnectionState("disconnected");

    return;
  }

  if (event === GatewayEvent.JOIN) {
    gateway.deliver({
      v: 1,
      type: "session.joined",
      data: {
        connectionId: "connection-1",
        organizationIds,
        subscriptionScopes: [],
      },
    });

    return;
  }

  if (event === GatewayEvent.PERMISSIONS_UPDATED) {
    gateway.deliver({
      v: 1,
      type: "permissions.updated",
      data: { organizationIds, subscriptionScopes: [] },
    });

    return;
  }

  throw new Error("Unexpected gateway lifecycle event");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-06T12:01:00Z"));
  gateway = createTestGateway();
  gateway.request.mockResolvedValue(undefined);
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input) =>
          Response.json(
            await mocks.request(
              input instanceof Request ? input.url : String(input),
            ),
          ),
      },
    }),
  );
  mocks.request.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderFeed(
  organizationIds = [feedKill.guild.id],
  initial: { paused?: boolean; filters?: FeedFilters } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });

  queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    organizationIds.map((id) => ({ id })),
  );
  onTestFinished(() => queryClient.clear());
  const GatewayWrapper = gateway.wrapper;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <GatewayWrapper>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </GatewayWrapper>
  );

  let props = {
    filters: initial.filters ?? DEFAULT_ACTIVITY_FEED_SETTINGS,
    paused: initial.paused ?? false,
    ready: true,
  };

  const rendered = renderHook((current) => useLiveFeed(current), {
    wrapper,
    initialProps: props,
  });

  const rerenderWith = (next: Partial<typeof props>) => {
    props = { ...props, ...next };
    act(() => rendered.rerender(props));
  };

  return {
    ...rendered,
    queryClient,
    setPaused: (paused: boolean) => rerenderWith({ paused }),
    setFilters: (filters: FeedFilters) => rerenderWith({ filters }),
  };
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
      gateway.deliver({
        v: 1,
        type: "feed.entry",
        data: {
          ...feedKill,
          count,
          version: count,
        },
      });
    }
  });
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(mocks.request).toHaveBeenCalledTimes(1);
  expect(result.current.state.items).toEqual(feedResponse(20).items);
  act(() => deliverLifecycleEvent(GatewayEvent.CONNECT));
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(mocks.request).toHaveBeenCalledTimes(1);
  expect(result.current.state.items).toEqual(feedResponse(20).items);
  // A kill accepted while session.join is pending must appear in the post-join snapshot.
  mocks.request.mockResolvedValue(feedResponse(21));
  act(() => deliverLifecycleEvent(GatewayEvent.JOIN));
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(mocks.request).toHaveBeenCalledTimes(2);
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
    await act(() => vi.advanceTimersByTimeAsync(0));
    const original = result.current.state.items;
    act(() => deliverLifecycleEvent(event));
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
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => deliverLifecycleEvent(GatewayEvent.PERMISSIONS_UPDATED));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
    finish(feedResponse());
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(result.current.state.items).toEqual([]);
  expect(result.current.state.pending).toBeUndefined();
});

it("loads the initial snapshot while the stored pause ignores live entries", async () => {
  mocks.request.mockResolvedValue(feedResponse());
  const { result } = renderFeed(undefined, { paused: true });
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(result.current.state.items).toEqual(feedResponse().items);
  act(() =>
    gateway.deliver({
      v: 1,
      type: "feed.entry",
      data: {
        ...feedKill,
        count: 3,
        version: 3,
      },
    }),
  );
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(result.current.state.items).toEqual(feedResponse().items);
  expect(mocks.request).toHaveBeenCalledTimes(1);
});

it("replaces the list with the filtered history when filters change, even while paused", async () => {
  const other = { id: "other", name: "Inny Lootlog", vanityUrl: null };
  const otherKill = { ...feedKill, id: "kill:other", guild: other };
  mocks.request
    .mockResolvedValueOnce({
      ...feedResponse(),
      items: [...feedResponse().items, otherKill],
    })
    .mockResolvedValueOnce(feedResponse());

  const { result, setFilters } = renderFeed([feedKill.guild.id, other.id], {
    paused: true,
  });

  await act(() => vi.advanceTimersByTimeAsync(0));
  result.current.setAtTop(false);

  const filters = {
    ...DEFAULT_ACTIVITY_FEED_SETTINGS,
    excludedGuildIds: [other.id],
    excludedNpcCategories: ["TITAN" as const],
  };

  setFilters(filters);
  expect(result.current.state.items?.map(({ id }) => id)).toEqual([
    feedKill.id,
  ]);
  await act(() => vi.advanceTimersByTimeAsync(0));
  const url = new URL(mocks.request.mock.lastCall?.[0] ?? "");
  expect(url.searchParams.getAll("excludedGuildIds")).toEqual([other.id]);
  expect(url.searchParams.getAll("excludedNpcCategories")).toEqual(["TITAN"]);
  expect(result.current.state.pending).toBeUndefined();
});

it("drops live entries from excluded Lootlogs", async () => {
  mocks.request.mockResolvedValue(feedResponse());

  const { result } = renderFeed(undefined, {
    filters: {
      ...DEFAULT_ACTIVITY_FEED_SETTINGS,
      excludedGuildIds: ["other"],
    },
  });

  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() =>
    gateway.deliver({
      v: 1,
      type: "feed.entry",
      data: {
        ...feedKill,
        id: "kill:other",
        guild: { id: "other", name: "Inny", vanityUrl: null },
      },
    }),
  );
  expect(result.current.state.items?.map(({ id }) => id)).toEqual([
    feedKill.id,
  ]);
});

it("ignores live entries while paused and fetches a fresh snapshot immediately on resume", async () => {
  mocks.request
    .mockResolvedValueOnce(feedResponse())
    .mockResolvedValueOnce(feedResponse(4));
  const { result, setPaused } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  setPaused(true);
  act(() =>
    gateway.deliver({
      v: 1,
      type: "feed.entry",
      data: {
        ...feedKill,
        count: 3,
        version: 3,
      },
    }),
  );
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(mocks.request).toHaveBeenCalledTimes(1);
  expect(result.current.state.items).toEqual(feedResponse().items);
  setPaused(false);
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
    const { result, setPaused } = renderFeed();
    await act(() => vi.advanceTimersByTimeAsync(0));
    await act(() => vi.advanceTimersByTimeAsync(0));
    const original = result.current.state.items;
    setPaused(true);
    act(() => deliverLifecycleEvent(event));
    expect(result.current.state.items).toBe(original);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(mocks.request).toHaveBeenCalledTimes(2);
    await act(async () => {
      response.resolve({ ...feedResponse(), items: [] });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.state.items).toEqual([]);
    expect(result.current.state.pending).toBeUndefined();
  },
);

it("finishes mandatory access revalidation when the user pauses during the request", async () => {
  const response = deferredResponse();
  mocks.request
    .mockResolvedValueOnce(feedResponse())
    .mockReturnValueOnce(response.promise);
  const { result, setPaused } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => deliverLifecycleEvent(GatewayEvent.PERMISSIONS_UPDATED));
  setPaused(true);
  expect(result.current.state.items).toEqual(feedResponse().items);
  await act(() => vi.advanceTimersByTimeAsync(5000));
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
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => {
    gateway.deliver({
      v: 1,
      type: "feed.entry",
      data: {
        ...feedKill,
        count: 3,
        version: 3,
      },
    });
    gateway.deliver({
      v: 1,
      type: "feed.entry",
      data: {
        ...feedKill,
        count: 2,
        version: 2,
      },
    });
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
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
  const { result, setPaused } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  setPaused(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
    finish(feedResponse(3));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.state.items ?? []).toEqual([]);
  expect(result.current.state.isFetching).toBe(false);
  setPaused(false);
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
    await act(() => vi.advanceTimersByTimeAsync(0));
    act(() => result.current.setAtTop(false));
    act(() => deliverLifecycleEvent(event));
    await act(() => vi.advanceTimersByTimeAsync(5000));
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
  act(() => deliverLifecycleEvent(GatewayEvent.JOIN));
  expect(result.current.state.items).toBe(original);
  expect(result.current.state.isFetching).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
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
    act(() => deliverLifecycleEvent(event));
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
  act(() => gateway.deliver({ v: 1, type: "feed.entry", data: live }));
  act(() => deliverLifecycleEvent(GatewayEvent.JOIN));
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
    gateway.deliver({
      v: 1,
      type: "feed.entry",
      data: {
        ...feedKill,
        version: 2,
        count: 2,
      },
    }),
  );
  act(() => deliverLifecycleEvent(GatewayEvent.PERMISSIONS_UPDATED));
  expect(result.current.state.items).toEqual(feedResponse().items);
  await act(() => vi.advanceTimersByTimeAsync(5000));
  await act(async () => {
    first.resolve(feedResponse(2));
    second.resolve({ ...feedResponse(), items: [] });
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.state.items).toEqual([]);
});

it.each([false, true])(
  "retains only the displayed snapshot until access revalidation fails (paused: %s)",
  async (paused) => {
    mocks.request
      .mockResolvedValueOnce(feedResponse())
      .mockRejectedValueOnce(new Error("offline"));
    const { result, queryClient, setPaused } = renderFeed();
    await act(() => vi.advanceTimersByTimeAsync(0));
    act(() => {
      result.current.setAtTop(false);
      gateway.deliver({
        v: 1,
        type: "feed.entry",
        data: {
          ...feedKill,
          id: "pending",
        },
      });
    });
    expect(result.current.state.pending).toBeDefined();
    setPaused(paused);
    act(() => deliverLifecycleEvent(GatewayEvent.PERMISSIONS_UPDATED));
    expect(result.current.state.items).toEqual(feedResponse().items);
    expect(result.current.state.pending).toBeUndefined();
    expect(
      queryClient.getQueryData(getUsersControllerGetUserFeedQueryKey()),
    ).toBeUndefined();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(result.current.state.items).toEqual([]);
    expect(result.current.state.isError).toBe(true);
    expect(
      queryClient.getQueryData(getUsersControllerGetUserFeedQueryKey()),
    ).toBeUndefined();
  },
);

it("buffers rolling snapshot changes during manual refresh while reading older entries", async () => {
  const replacement = {
    ...feedResponse(),
    items: [{ ...feedKill, id: "newest" }],
  };

  mocks.request
    .mockResolvedValueOnce(feedResponse())
    .mockResolvedValueOnce(replacement);
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  await act(() => vi.advanceTimersByTimeAsync(0));
  const original = result.current.state.items;
  act(() => result.current.setAtTop(false));
  act(() => result.current.refresh());
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(result.current.state.items).toBe(original);
  expect(result.current.state.pending).toEqual(replacement.items);
  act(() => result.current.applyPending());
  expect(result.current.state.items).toEqual(replacement.items);
});

it("applies explicit join access revalidation while scrolled", async () => {
  mocks.request
    .mockResolvedValueOnce(feedResponse())
    .mockResolvedValueOnce({ ...feedResponse(), items: [] });
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => result.current.setAtTop(false));
  act(() => deliverLifecycleEvent(GatewayEvent.JOIN));
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(result.current.state.items).toEqual([]);
  expect(result.current.state.pending).toBeUndefined();
});

it("keeps the snapshot through a rebalance burst and fetches five seconds after the last notification", async () => {
  mocks.request.mockResolvedValue(feedResponse());
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));

  for (let index = 0; index < 4; index += 1) {
    act(() => deliverLifecycleEvent(GatewayEvent.PERMISSIONS_UPDATED));
    expect(result.current.state.items).toEqual(feedResponse().items);
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(result.current.state.items).toEqual(feedResponse().items);
  }

  await act(() => vi.advanceTimersByTimeAsync(3999));
  expect(mocks.request).toHaveBeenCalledTimes(1);
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(mocks.request).toHaveBeenCalledTimes(2);
  expect(result.current.state.items).toEqual(feedResponse().items);
});

it("cancels a scheduled rebalance refresh on unmount", async () => {
  mocks.request.mockResolvedValue(feedResponse());
  const { unmount } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => deliverLifecycleEvent(GatewayEvent.PERMISSIONS_UPDATED));
  unmount();
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(mocks.request).toHaveBeenCalledTimes(1);
});

it("does not let joins or live entries bypass pending access revalidation", async () => {
  mocks.request.mockResolvedValue(feedResponse());
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => {
    deliverLifecycleEvent(GatewayEvent.PERMISSIONS_UPDATED);
    deliverLifecycleEvent(GatewayEvent.CONNECT);
    deliverLifecycleEvent(GatewayEvent.JOIN);
    gateway.deliver({ v: 1, type: "feed.entry", data: feedKill });
  });
  expect(result.current.state.items).toEqual(feedResponse().items);
  expect(mocks.request).toHaveBeenCalledTimes(1);
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(mocks.request).toHaveBeenCalledTimes(2);
});

it("does not replay buffered live entries when permission revalidation fails", async () => {
  let fail: (error: Error) => void = () => undefined;
  mocks.request.mockResolvedValueOnce(feedResponse()).mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
  );
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => deliverLifecycleEvent(GatewayEvent.PERMISSIONS_UPDATED));
  await act(() => vi.advanceTimersByTimeAsync(5000));
  act(() =>
    gateway.deliver({
      v: 1,
      type: "feed.entry",
      data: { ...feedKill, id: "buffered" },
    }),
  );
  await act(async () => {
    fail(new Error("offline"));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.state.items).toEqual([]);
  expect(result.current.state.pending).toBeUndefined();
  expect(result.current.state.isError).toBe(true);
});

it("prunes revoked organizations immediately while retaining allowed rows during a stalled refresh", async () => {
  const allowed = feedKill;

  const revoked = {
    ...feedKill,
    id: "revoked",
    guild: { ...feedKill.guild, id: "revoked" },
  };

  mocks.request
    .mockResolvedValueOnce({ ...feedResponse(), items: [allowed, revoked] })
    .mockImplementation(() => new Promise(() => {}));
  const { result, queryClient } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));

  const originalAllowed = result.current.state.items?.find(
    (item) => item.guild.id === allowed.guild.id,
  );

  act(() => result.current.setAtTop(false));
  act(() =>
    gateway.deliver({
      v: 1,
      type: "feed.entry",
      data: {
        ...revoked,
        id: "pending-revoked",
      },
    }),
  );
  act(() => deliverLifecycleEvent(GatewayEvent.PERMISSIONS_UPDATED));
  expect(result.current.state.items).toEqual([allowed]);
  expect(result.current.state.items?.[0]).toBe(originalAllowed);
  expect(result.current.state.pending).toBeUndefined();
  expect(
    queryClient.getQueryData(getUsersControllerGetUserFeedQueryKey()),
  ).toBeUndefined();
  expect(mocks.request).toHaveBeenCalledTimes(1);
  await act(() => vi.advanceTimersByTimeAsync(65000));
  expect(result.current.state.items).toEqual([allowed]);
  expect(mocks.request).toHaveBeenCalledTimes(2);
});

it("clears all visible data immediately when no organizations are authorized", async () => {
  const late = deferredResponse();
  mocks.request
    .mockResolvedValueOnce(feedResponse())
    .mockReturnValueOnce(late.promise)
    .mockResolvedValueOnce({ ...feedResponse(), items: [] });
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => result.current.refresh());
  act(() => deliverLifecycleEvent(GatewayEvent.PERMISSIONS_UPDATED, []));
  expect(result.current.state.items).toEqual([]);
  await act(async () => {
    late.resolve(feedResponse());
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.state.items).toEqual([]);
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(result.current.state.items).toEqual([]);
});

it("loads history without a gateway connection and only catches up after a successful join", async () => {
  gateway = createTestGateway({ connected: false });
  mocks.request.mockResolvedValue(feedResponse());
  const { result } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(mocks.request).toHaveBeenCalledTimes(1);
  expect(result.current.state.items).toEqual(feedResponse().items);
  act(() => deliverLifecycleEvent(GatewayEvent.CONNECT));
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(mocks.request).toHaveBeenCalledTimes(1);
  act(() => deliverLifecycleEvent(GatewayEvent.JOIN));
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(mocks.request).toHaveBeenCalledTimes(2);
  expect(result.current.state.items).toEqual(feedResponse().items);
});

it("shows an empty feed without waiting for a join when no Organizations are accessible", async () => {
  gateway = createTestGateway({ joined: false });
  const { result } = renderFeed([]);
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(result.current.state.items).toEqual([]);
  expect(mocks.request).not.toHaveBeenCalled();
});

it("keeps an empty feed healthy on resume during an outage and loads history when an Organization becomes accessible", async () => {
  mocks.request.mockRejectedValue(new Error("offline"));
  const { result, queryClient, setPaused } = renderFeed([]);
  await act(() => vi.advanceTimersByTimeAsync(0));
  setPaused(true);
  setPaused(false);
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(result.current.state.items).toEqual([]);
  expect(result.current.state.isError).toBe(false);
  expect(result.current.state.isFetching).toBe(false);
  expect(mocks.request).not.toHaveBeenCalled();

  mocks.request.mockResolvedValue(feedResponse());
  act(() =>
    queryClient.setQueryData(
      getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      [{ id: feedKill.guild.id }],
    ),
  );
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(result.current.state.items).toEqual(feedResponse().items);
  expect(mocks.request).toHaveBeenCalledTimes(1);
});

it("clears a scrolled feed when the last accessible Organization is removed", async () => {
  mocks.request.mockResolvedValue(feedResponse());
  const { result, queryClient } = renderFeed();
  await act(() => vi.advanceTimersByTimeAsync(0));
  act(() => result.current.setAtTop(false));
  act(() =>
    queryClient.setQueryData(
      getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      [],
    ),
  );
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(result.current.state.items).toEqual([]);
  expect(result.current.state.pending).toBeUndefined();
});
