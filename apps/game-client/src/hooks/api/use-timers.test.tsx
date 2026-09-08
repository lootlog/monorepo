import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, onTestFinished } from "vitest";
import { createTimerHttpFixture } from "@/features/timers/timer-http-fixtures";
import { queryKeys } from "@/features/public-api/query-keys";
import { useTimers } from "./use-timers";
it("does not refetch fresh timer data on focus or remount", async () => {
  const fixture = createTimerHttpFixture(() => Response.json([]));
  onTestFinished(fixture.cleanup);
  fixture.queryClient.removeQueries({ queryKey: queryKeys.allTimers() });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={fixture.queryClient}>
      {children}
    </QueryClientProvider>
  );
  const first = renderHook(() => useTimers({ world: "pandora" }), { wrapper });
  await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
  expect(fixture.requests).toHaveLength(1);
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
  expect(fixture.requests).toHaveLength(1);
  first.unmount();
  renderHook(() => useTimers({ world: "pandora" }), { wrapper });
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
  expect(fixture.requests).toHaveLength(1);
});
