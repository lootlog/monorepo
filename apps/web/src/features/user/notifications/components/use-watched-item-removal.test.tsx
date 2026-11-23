// @vitest-environment happy-dom
import { configureApiClients } from "@lootlog/client/transport";
import type { WatchedItemResponseDto } from "@lootlog/client/main";
import { Toaster } from "@lootlog/ui/components/sonner";
import { toast } from "@lootlog/ui/lib/toast";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  act,
  cleanup,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { useWatchedItemRemoval } from "./use-watched-item-removal";

await initializeTestTranslations();

const watchedItem: WatchedItemResponseDto = {
  id: 7,
  userId: "user",
  itemId: 42,
  itemName: "Hełm",
  world: "tempest",
  enabled: true,
  notificationRuleId: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  itemSnapshot: null,
  notificationRule: null,
};

const UNDO_WINDOW_MS = 5000;

const deletes = vi.fn<() => Response>();

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  deletes.mockImplementation(() => Response.json({}));
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (_input, init) =>
          init?.method === "DELETE" ? deletes() : Response.json([]),
      },
    }),
  );
});

afterEach(() => {
  toast.dismiss();
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const setup = () => {
  const queryClient = new QueryClient();
  onTestFinished(() => queryClient.clear());

  const { result } = renderHook(() => useWatchedItemRemoval(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    ),
  });

  act(() => result.current.remove(watchedItem));

  return result;
};

it("restores the item without deleting it when the removal is undone", async () => {
  const result = setup();

  expect(result.current.removingIds.has(watchedItem.id)).toBe(true);
  fireEvent.click(
    await screen.findByRole("button", { name: "common.actions.undo" }),
  );
  await act(() => vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS * 2));

  expect(result.current.removingIds.has(watchedItem.id)).toBe(false);
  expect(deletes).not.toHaveBeenCalled();
});

it("deletes the item once the undo window closes", async () => {
  const result = setup();

  await screen.findByRole("button", { name: "common.actions.undo" });
  await act(() => vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS * 2));

  await waitFor(() => expect(deletes).toHaveBeenCalledOnce());
  expect(result.current.removingIds.has(watchedItem.id)).toBe(true);
});

it("shows the item again when the delayed deletion fails", async () => {
  deletes.mockImplementation(() => Response.json({}, { status: 500 }));
  const result = setup();

  await screen.findByRole("button", { name: "common.actions.undo" });
  await act(() => vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS * 2));

  await waitFor(() =>
    expect(result.current.removingIds.has(watchedItem.id)).toBe(false),
  );
  expect(
    document.querySelector('[data-sonner-toast][data-type="error"]'),
  ).not.toBeNull();
});
