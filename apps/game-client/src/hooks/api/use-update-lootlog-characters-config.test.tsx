import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, onTestFinished } from "vitest";
import { useGameStore } from "@/store/game.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { createTimerHttpFixture } from "@/features/timers/timer-http-fixtures";
import { useUpdateLootlogCharactersConfig } from "./use-update-lootlog-characters-config";

it("waits for canonical identity before submitting character config", async () => {
  const fixture = createTimerHttpFixture(() => Response.json({}));
  onTestFinished(fixture.cleanup);
  useGameStore.getState().clearGame();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={fixture.queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result } = renderHook(() => useUpdateLootlogCharactersConfig(), {
    wrapper,
  });

  await expect(
    act(() =>
      result.current.mutateAsync({ catchingGuildIds: [], characterId: "101" }),
    ),
  ).rejects.toThrow("Canonical game identity is unavailable");
  expect(fixture.requests).toHaveLength(0);
  setTestRuntimeGame({ hero: { accountId: "202" } });
  await act(() =>
    result.current.mutateAsync({
      catchingGuildIds: ["12"],
      characterId: "101",
    }),
  );
  expect(fixture.requests).toHaveLength(1);
  expect(new URL(fixture.requests[0].url).pathname).toContain("202");
  expect(await fixture.requests[0].json()).toEqual({
    catchingGuildIds: ["12"],
    characterId: "101",
  });
});
