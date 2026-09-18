import { act, render, waitFor } from "@testing-library/react";
import { QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { getSocket } from "@/lib/socket";
import { SocketProvider } from "@/contexts/socket-context";
import { queryKeys } from "@/features/public-api/query-keys";
import { createTimerFixture } from "../timer-fixtures";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { createTimerRealtimeFixture } from "../timer-realtime-fixtures";
import { useTimersSocket } from "./use-timers-socket";

function TimerListener() {
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
  const fixture = createTimerHttpFixture();
  const gateway = createTimerRealtimeFixture();
  const key = queryKeys.timers("luvia");
  const policy = createAccessPolicySnapshot([], "user-1");
  const timer = createTimerFixture();
  const fetchTimers = vi.fn().mockResolvedValue([]);

  const observer = new QueryObserver(fixture.queryClient, {
    queryKey: key,
    queryFn: fetchTimers,
    staleTime: Infinity,
  });

  const unsubscribe = observer.subscribe(() => {});

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <SocketProvider>
        <TimerListener />
      </SocketProvider>
    </QueryClientProvider>,
  );

  try {
    act(() => gateway.wire.open());
    await gateway.join(["guild-1"], policy);
    await waitFor(() => expect(fetchTimers).toHaveBeenCalledTimes(1));
    act(() => getSocket().disconnect());
    fetchTimers.mockResolvedValue([timer]);
    act(() => {
      getSocket().connect();
      gateway.wire.open();
    });
    await gateway.join(["guild-1"], policy);
    await waitFor(() => expect(fetchTimers).toHaveBeenCalledTimes(2));
    expect(fixture.queryClient.getQueryData(key)).toEqual([timer]);
    await gateway.receive({
      v: 1,
      type: "timer.deleted",
      data: { organizationId: "guild-1", payload: timer },
    });
    expect(fixture.queryClient.getQueryData(key)).toEqual([]);
    expect(fetchTimers).toHaveBeenCalledTimes(2);
    await gateway.receive({
      v: 1,
      type: "timer.created",
      data: { organizationId: "guild-1", payload: timer },
    });
    expect(fixture.queryClient.getQueryData(key)).toEqual([
      { ...timer, isPending: false },
    ]);
    expect(fetchTimers).toHaveBeenCalledTimes(2);
  } finally {
    unsubscribe();
    view.unmount();
    gateway.cleanup();
    fixture.cleanup();
  }
});
