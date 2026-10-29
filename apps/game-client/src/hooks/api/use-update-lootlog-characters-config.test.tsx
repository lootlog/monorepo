import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, onTestFinished } from "vitest";
import { useGameStore } from "@/store/game.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { createTimerHttpFixture } from "@/features/timers/timer-http-fixtures";
import { getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey } from "@lootlog/client/main";
import { queryClient } from "@/lib/query-client";
import { getFreshCharacterCatchingGuildIds } from "./use-lootlog-characters-config";
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

// A rollback may restore an earlier optimistic write that failed as well;
// treated as confirmed, it would let the game client skip loot the API
// accepts.
it("leaves the catching scope unknown after queued saves fail", async () => {
  const fixture = createTimerHttpFixture(
    () => new Response(null, { status: 500 }),
  );

  onTestFinished(fixture.cleanup);
  setTestRuntimeGame({ hero: { accountId: "202" } });

  const queryKey =
    getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
      accountId: "202",
    });

  queryClient.setQueryData(queryKey, { "101": { catchingGuildIds: ["12"] } });
  onTestFinished(() => queryClient.clear());

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(() => useUpdateLootlogCharactersConfig(), {
    wrapper,
  });

  act(() => {
    result.current.mutate({ catchingGuildIds: [], characterId: "101" });
    result.current.mutate({ catchingGuildIds: ["12"], characterId: "101" });
  });
  await waitFor(() => expect(fixture.requests).toHaveLength(2));
  await waitFor(() => expect(queryClient.isMutating()).toBe(0));
  expect(queryClient.getQueryData(queryKey)).toEqual({
    "101": { catchingGuildIds: [] },
  });
  expect(getFreshCharacterCatchingGuildIds("202", "101")).toBeUndefined();
});
