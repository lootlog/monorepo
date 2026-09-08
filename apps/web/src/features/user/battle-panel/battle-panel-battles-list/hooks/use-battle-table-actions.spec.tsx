import { configureApiClients } from "@lootlog/client/transport";
import { getBattlesControllerGetDashboardBattlesQueryKey } from "@lootlog/client/battlelog";
import { toast } from "sonner";
// @vitest-environment happy-dom
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { createBattle } from "@/lib/testing/battle";
import { useBattleTableActions } from "./use-battle-table-actions";

const mocks = {
  update: vi.fn<() => Promise<void>>(),
  remove: vi.fn<() => Promise<void>>(),
  copy: vi.fn<(text: string) => Promise<void>>(),
  error: vi.fn(),
};
await initializeTestTranslations();
const dashboardKey = getBattlesControllerGetDashboardBattlesQueryKey();

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const battles = [
  createBattle({ id: "one", public: false }),
  createBattle({ id: "two", public: false }),
];
const setup = () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(dashboardKey, { battles: [] });
  onTestFinished(() => queryClient.clear());
  const removeBattleFromSelection = vi.fn();
  return {
    removeBattleFromSelection,
    queryClient,
    ...renderHook(
      () =>
        useBattleTableActions({
          clearSelection: vi.fn(),
          removeBattleFromSelection,
          selectedBattles: battles,
        }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      },
    ),
  };
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(navigator.clipboard, "writeText").mockImplementation(mocks.copy);
  vi.spyOn(toast, "error").mockImplementation(mocks.error);
  onTestFinished(
    configureApiClients({
      battlelog: {
        baseUrl: "https://battlelog.test",
        fetch: async (_input, init) => {
          if (init?.method === "DELETE") await mocks.remove();
          else await mocks.update();
          return Response.json({});
        },
      },
    }),
  );
});

it("keeps bulk sharing busy through clipboard completion and rejects duplicate clicks", async () => {
  const clipboard = deferred();
  mocks.update.mockResolvedValue(undefined);
  mocks.copy.mockReturnValue(clipboard.promise);
  const { result } = setup();
  let operation: Promise<void>;
  await act(async () => {
    operation = result.current.handleBulkShare();
  });
  expect(result.current.isBulkSharePending).toBe(true);
  await act(async () => {
    await result.current.handleBulkShare();
  });
  expect(mocks.update).toHaveBeenCalledTimes(2);
  await act(async () => {
    clipboard.resolve();
    await operation;
  });
  expect(result.current.isBulkBusy).toBe(false);
});

it("waits for every deletion after a partial failure and retains the failed selection for retry", async () => {
  const first = deferred();
  const second = deferred();
  mocks.remove
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const { result, removeBattleFromSelection, queryClient } = setup();
  let operation: Promise<void>;
  act(() => {
    result.current.setIsBulkDeleteDialogOpen(true);
  });
  await act(async () => {
    operation = result.current.handleBulkDelete();
    await Promise.resolve();
    first.reject(new Error("offline"));
  });
  expect(result.current.isDeletePending).toBe(true);
  expect(mocks.error).not.toHaveBeenCalled();
  await act(async () => {
    second.resolve();
    await operation;
  });
  expect(result.current.isDeletePending).toBe(false);
  expect(result.current.isBulkDeleteDialogOpen).toBe(true);
  expect(removeBattleFromSelection).toHaveBeenCalledExactlyOnceWith("two");
  expect(queryClient.getQueryState(dashboardKey)?.isInvalidated).toBe(true);
  expect(mocks.error).toHaveBeenCalledWith(
    "battlePanel.toasts.bulkBattleDeleteError",
    { duration: 3000 },
  );
});

it("identifies only the battle being shared while other row actions are blocked", async () => {
  const update = deferred();
  mocks.update.mockReturnValue(update.promise);
  mocks.copy.mockResolvedValue(undefined);
  const { result } = setup();
  let operation: Promise<void>;
  act(() => {
    operation = result.current.handleShare("one");
  });
  expect(result.current.pendingBattleId).toBe("one");
  expect(result.current.isRowActionBusy).toBe(true);
  await act(async () => {
    await result.current.handleShare("two");
  });
  expect(mocks.update).toHaveBeenCalledTimes(1);
  await act(async () => {
    update.resolve();
    await operation;
  });
  expect(result.current.pendingBattleId).toBeUndefined();
  expect(result.current.isRowActionBusy).toBe(false);
});
