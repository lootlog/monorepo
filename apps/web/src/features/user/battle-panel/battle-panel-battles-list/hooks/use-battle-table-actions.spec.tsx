// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Battle } from "@/lib/api/battlelog-types";
import { useBattleTableActions } from "./use-battle-table-actions";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  remove: vi.fn(),
  invalidate: vi.fn().mockResolvedValue(undefined),
  copy: vi.fn().mockResolvedValue(true),
  error: vi.fn(),
}));
vi.mock("@lootlog/client/battlelog", () => ({
  useBattlesControllerUpdateBattle: () => ({ mutateAsync: mocks.update }),
  useBattlesControllerDeleteBattle: () => ({ mutateAsync: mocks.remove }),
  invalidateBattlesControllerGetBattle: mocks.invalidate,
  invalidateBattlesControllerGetDashboardBattles: mocks.invalidate,
  invalidatePublicBattlesControllerGetPublicBattle: mocks.invalidate,
  invalidatePublicBattlesControllerGetPublicBattleRaw: mocks.invalidate,
  invalidatePublicBattlesControllerGetPublicBattleTimeline: mocks.invalidate,
}));
vi.mock("usehooks-ts", () => ({
  useCopyToClipboard: () => [null, mocks.copy],
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: mocks.error } }));

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
  { id: "one", public: false },
  { id: "two", public: false },
] as Battle[];
const setup = () => {
  const queryClient = new QueryClient();
  const removeBattleFromSelection = vi.fn();
  return {
    removeBattleFromSelection,
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
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
});

it("keeps bulk sharing busy through clipboard completion and rejects duplicate clicks", async () => {
  const clipboard = deferred();
  mocks.update.mockResolvedValue({});
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
  const { result, removeBattleFromSelection } = setup();
  let operation: Promise<void>;
  act(() => {
    result.current.setIsBulkDeleteDialogOpen(true);
  });
  await act(async () => {
    operation = result.current.handleBulkDelete();
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
  expect(mocks.invalidate).toHaveBeenCalled();
  expect(mocks.error).toHaveBeenCalledWith(
    "battlePanel.toasts.bulkBattleDeleteError",
    { duration: 3000 },
  );
});

it("identifies only the battle being shared while other row actions are blocked", async () => {
  const update = deferred();
  mocks.update.mockReturnValue(update.promise);
  mocks.copy.mockResolvedValue(true);
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
