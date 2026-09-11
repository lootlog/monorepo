import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, onTestFinished } from "vitest";
import { useGameStore } from "@/store/game.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { createTimerHttpFixture } from "@/features/timers/timer-http-fixtures";
import { getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey } from "@lootlog/client/main";
import { useUpdateLootlogCharactersConfig } from "./use-update-lootlog-characters-config";

it("waits for canonical identity before submitting character config", async () => {
  const savedEntry = {
    userId: "user-1",
    accountId: "202",
    characterId: "101",
    catchingGuildIds: ["12"],
  };

  const fixture = createTimerHttpFixture(() => Response.json(savedEntry));
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

  // The saved entry lands in the account map without a refetch.
  const queryKey =
    getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
      accountId: "202",
    });

  expect(fixture.queryClient.getQueryData(queryKey)).toEqual({
    "101": savedEntry,
  });
  expect(fixture.queryClient.getQueryState(queryKey)?.isInvalidated).toBe(
    false,
  );
});
