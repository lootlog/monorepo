import { act, render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { expect, it } from "vitest";
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
  const key = queryKeys.timers("pandora");

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
