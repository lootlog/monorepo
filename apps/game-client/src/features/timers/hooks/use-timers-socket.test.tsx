import { act, render, waitFor } from "@testing-library/react";
import { QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { getSocket } from "@/lib/socket";
import { SocketProvider } from "@/contexts/socket-context";
import { queryKeys } from "@/features/public-api/query-keys";
import {
  createTimerFixture,
  createTimerHistoryFixture,
} from "../timer-fixtures";
import {
  getTimersControllerGetRecentTimerHistoryQueryOptions,
  getTimersControllerGetTimerHistoryQueryOptions,
} from "@lootlog/client/main";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { createTimerRealtimeFixture } from "../timer-realtime-fixtures";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useGlobalStore } from "@/store/global.store";
import { useTimers } from "@/hooks/api/use-timers";
import { useTimersSocket } from "./use-timers-socket";

function TimerListener({ readSnapshot = false }: { readSnapshot?: boolean }) {
  useTimers({ world: readSnapshot ? "luvia" : undefined });
  useTimersSocket();

  return null;
}

it("updates world cache only while joined and subscribed, including listener cleanup", async () => {
  const fixture = createTimerHttpFixture();
  const gateway = createTimerRealtimeFixture();
  const key = queryKeys.timers("luvia");

  const content = (listening: boolean) => (
    <QueryClientProvider client={fixture.queryClient}>
      <SocketProvider>{listening && <TimerListener />}</SocketProvider>
    </QueryClientProvider>
  );

  const view = render(content(true));
  const timer = createTimerFixture();

  const created = {
    v: 1,
    type: "timer.created",
    data: { organizationId: "guild-1", payload: timer },
  } as const;

  try {
    act(() => gateway.wire.open());
    await gateway.receive(created);
    expect(fixture.queryClient.getQueryData(key)).toEqual([]);
    expect(fixture.requests).toHaveLength(0);
    await gateway.join(["guild-1"]);
    await gateway.receive(created);
    expect(fixture.queryClient.getQueryData(key)).toEqual([
      { ...timer, isPending: false },
    ]);
    await gateway.receive({
      v: 1,
      type: "timer.deleted",
      data: {
        organizationId: "guild-1",
        payload: {
          guildId: timer.guildId,
          timerKey: timer.timerKey,
          world: timer.world,
        },
      },
    });
    expect(fixture.queryClient.getQueryData(key)).toEqual([]);
    view.rerender(content(false));
    await gateway.receive(created);
    expect(fixture.queryClient.getQueryData(key)).toEqual([]);
  } finally {
    view.unmount();
    gateway.cleanup();
    fixture.cleanup();
  }
});

it("refreshes an active timer snapshot after a socket reconnect with unchanged permissions", async () => {
  setTestRuntimeGame();
  useGlobalStore.setState({ gameState: { gameInitialized: true } });
  const timer = createTimerFixture();
  let snapshot = [timer];
  let unavailable = false;

  const fixture = createTimerHttpFixture(() =>
    unavailable
      ? Response.json({ message: "temporarily unavailable" }, { status: 503 })
      : Response.json(snapshot),
  );

  const gateway = createTimerRealtimeFixture();
  const key = queryKeys.timers("luvia");
  const policy = createAccessPolicySnapshot([], "user-1");

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <SocketProvider>
        <TimerListener readSnapshot />
      </SocketProvider>
    </QueryClientProvider>,
  );

  try {
    act(() => gateway.wire.open());
    await gateway.acknowledgeJoin(["guild-1"], policy);
    await waitFor(() => expect(fixture.requests).toHaveLength(1));
    await waitFor(() =>
      expect(fixture.queryClient.getQueryState(key)?.fetchStatus).toBe("idle"),
    );
    act(() => getSocket().disconnect());
    snapshot = [createTimerFixture({ ...timer, wasReset: true })];
    act(() => {
      getSocket().connect();
      gateway.wire.open();
    });
    await gateway.acknowledgeJoin(["guild-1"], policy);
    await waitFor(() => expect(fixture.requests).toHaveLength(2));
    await waitFor(() =>
      expect(fixture.queryClient.getQueryData(key)).toMatchObject([
        { timerKey: timer.timerKey, wasReset: true },
      ]),
    );
    await gateway.receive({
      v: 1,
      type: "timer.deleted",
      data: { organizationId: "guild-1", payload: timer },
    });
    expect(fixture.queryClient.getQueryData(key)).toEqual([]);
    expect(fixture.requests).toHaveLength(2);
    await gateway.receive({
      v: 1,
      type: "timer.created",
      data: { organizationId: "guild-1", payload: timer },
    });
    expect(fixture.queryClient.getQueryData(key)).toEqual([
      { ...timer, isPending: false },
    ]);
    expect(fixture.requests).toHaveLength(2);
    unavailable = true;
    act(() => getSocket().disconnect());
    act(() => {
      getSocket().connect();
      gateway.wire.open();
    });
    await gateway.acknowledgeJoin(["guild-1"], policy);
    await waitFor(() =>
      expect(fixture.queryClient.getQueryState(key)?.status).toBe("error"),
    );
    expect(fixture.requests).toHaveLength(3);
    unavailable = false;
    snapshot = [];
    act(() => getSocket().disconnect());
    act(() => {
      getSocket().connect();
      gateway.wire.open();
    });
    await gateway.acknowledgeJoin(["guild-1"], policy);
    await waitFor(() =>
      expect(fixture.queryClient.getQueryData(key)).toEqual([]),
    );
    expect(fixture.requests).toHaveLength(4);
  } finally {
    view.unmount();
    gateway.cleanup();
    fixture.cleanup();
    useGlobalStore.setState({ gameState: { gameInitialized: false } });
  }
});

it("recovers missed history changes on reconnect without fetching closed histories or other organizations", async () => {
  let history = createTimerHistoryFixture();
  const fixture = createTimerHttpFixture(() => Response.json([history]));
  const gateway = createTimerRealtimeFixture();

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <SocketProvider>
        <TimerListener />
      </SocketProvider>
    </QueryClientProvider>,
  );

  const active = getTimersControllerGetRecentTimerHistoryQueryOptions(
    { guildId: "guild-1", world: "luvia", limit: 10 },
    { query: { staleTime: 30_000 } },
  );

  const closed = getTimersControllerGetTimerHistoryQueryOptions(
    { guildId: "guild-1", timerIdentifier: history.timerKey },
    { world: "zemyna", limit: 5 },
    { query: { staleTime: 30_000 } },
  );

  const unrelated = getTimersControllerGetRecentTimerHistoryQueryOptions(
    { guildId: "guild-2", world: "luvia", limit: 10 },
    { query: { staleTime: 30_000 } },
  );

  let unsubscribe = () => {};

  try {
    act(() => gateway.wire.open());
    await gateway.join(["guild-1"]);
    await Promise.all([
      fixture.queryClient.fetchQuery(active),
      fixture.queryClient.fetchQuery(closed),
      fixture.queryClient.fetchQuery(unrelated),
    ]);
    const observer = new QueryObserver(fixture.queryClient, active);
    unsubscribe = observer.subscribe(() => {});
    expect(fixture.requests).toHaveLength(3);
    act(() => getSocket().disconnect());
    history = { ...history, canRestore: false };
    act(() => {
      getSocket().connect();
      gateway.wire.open();
    });
    await gateway.join(["guild-1"]);
    await waitFor(() =>
      expect(fixture.queryClient.getQueryData(active.queryKey)).toMatchObject([
        { canRestore: false },
      ]),
    );
    expect(fixture.requests).toHaveLength(4);
    expect(
      fixture.queryClient.getQueryState(closed.queryKey)?.isInvalidated,
    ).toBe(true);
    expect(
      fixture.queryClient.getQueryState(unrelated.queryKey)?.isInvalidated,
    ).toBe(false);
    const reopened = await fixture.queryClient.fetchQuery(closed);
    expect(reopened).toMatchObject([{ canRestore: false }]);
    expect(fixture.requests).toHaveLength(5);
  } finally {
    unsubscribe();
    view.unmount();
    gateway.cleanup();
    fixture.cleanup();
  }
});
