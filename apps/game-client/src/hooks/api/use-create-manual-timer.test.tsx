import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, onTestFinished } from "vitest";
import { queryKeys } from "@/features/public-api/query-keys";
import { createTimerHttpFixture } from "@/features/timers/timer-http-fixtures";
import { useCreateManualTimer } from "./use-create-manual-timer";

it("creates a manual timer and invalidates the timer query family", async () => {
  const fixture = createTimerHttpFixture(() =>
    Response.json({ guildId: "guild-1" }),
  );

  onTestFinished(fixture.cleanup);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={fixture.queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result } = renderHook(() => useCreateManualTimer(), { wrapper });
  await act(() =>
    result.current.mutateAsync({
      guildIds: ["guild-1"],
      name: "Tanroth",
      world: "pandora",
      minSeconds: 30,
      maxSeconds: 60,
    }),
  );
  expect(fixture.requests).toHaveLength(1);
  expect(await fixture.requests[0].json()).toMatchObject({
    name: "Tanroth",
    world: "pandora",
    minSeconds: 30,
    maxSeconds: 60,
  });
  expect(
    fixture.queryClient.getQueryState(queryKeys.timers("pandora"))
      ?.isInvalidated,
  ).toBe(true);
});
