import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, onTestFinished } from "vitest";
import { createTimerHttpFixture } from "@/features/timers/timer-http-fixtures";
import { queryKeys } from "@/features/public-api/query-keys";
import { useTimers } from "./use-timers";
import { createGameAccessCache } from "@/lib/game-access-cache";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { createTimerFixture } from "@/features/timers/timer-fixtures";

it("does not refetch fresh timer data on focus or remount", async () => {
  const fixture = createTimerHttpFixture(() => Response.json([]));
  onTestFinished(fixture.cleanup);
  fixture.queryClient.removeQueries({ queryKey: queryKeys.allTimers() });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={fixture.queryClient}>
      {children}
    </QueryClientProvider>
  );

  const first = renderHook(() => useTimers({ world: "luvia" }), { wrapper });
  await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
  expect(fixture.requests).toHaveLength(1);
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
  expect(fixture.requests).toHaveLength(1);
  first.unmount();
  renderHook(() => useTimers({ world: "luvia" }), { wrapper });
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
  expect(fixture.requests).toHaveLength(1);
});

it("completes one initial request while applying the latest policy before exposing its rows", async () => {
  const allowed = createTimerFixture({ guildId: "a" });
  const removed = createTimerFixture({ guildId: "removed" });
  const response = Promise.withResolvers<Response>();
  const fixture = createTimerHttpFixture(() => response.promise);
  fixture.queryClient.removeQueries({ queryKey: queryKeys.allTimers() });
  const access = createGameAccessCache(fixture.queryClient);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={fixture.queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result, unmount } = renderHook(() => useTimers({ world: "luvia" }), {
    wrapper,
  });

  try {
    await waitFor(() => expect(fixture.requests).toHaveLength(1));
    act(() =>
      access.apply({
        accessPolicy: createAccessPolicySnapshot(
          [
            {
              guild: { id: "a", ownerId: "owner" },
              roles: [
                {
                  permissions: [
                    Permission.LOOTLOG_ACCESS,
                    Permission.LOOTLOG_TIMERS_READ,
                    Permission.LOOTLOG_TIMERS_HEROES_READ,
                  ],
                  lvlRangeFrom: 0,
                  lvlRangeTo: 500,
                },
              ],
            },
          ],
          "reader",
        ),
      }),
    );
    expect(fixture.requests).toHaveLength(1);
    response.resolve(Response.json([allowed, removed]));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((row) => row.guildId)).toEqual(["a"]);
    expect(fixture.requests).toHaveLength(1);
  } finally {
    unmount();
    access.dispose();
    fixture.cleanup();
  }
});
