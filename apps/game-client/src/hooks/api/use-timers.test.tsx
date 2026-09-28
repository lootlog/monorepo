import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, onTestFinished, vi } from "vitest";
import { createTimerHttpFixture } from "@/features/timers/timer-http-fixtures";
import { queryKeys } from "@/features/public-api/query-keys";
import { AppSocket, disposeSocket } from "@/lib/socket";
import { useTimers } from "./use-timers";

it("does not refetch fresh timer data on focus or remount", async () => {
  const fixture = createTimerHttpFixture(() => Response.json([]));
  onTestFinished(fixture.cleanup);

  // No realtime session here; use-timers-socket.test covers the wait for one.
  const wait = vi
    .spyOn(AppSocket.prototype, "waitForSession")
    .mockResolvedValue();

  onTestFinished(() => wait.mockRestore());
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

it("loads the timer list without realtime once the session wait expires", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  onTestFinished(() => {
    vi.useRealTimers();
  });
  disposeSocket();
  onTestFinished(disposeSocket);
  const fixture = createTimerHttpFixture(() => Response.json([]));
  onTestFinished(fixture.cleanup);
  fixture.queryClient.removeQueries({ queryKey: queryKeys.allTimers() });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={fixture.queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result } = renderHook(() => useTimers({ world: "luvia" }), {
    wrapper,
  });

  // The window shows loading, not an empty list, while it waits.
  expect(result.current.isLoading).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(5_000));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(fixture.requests).toHaveLength(1);
});
