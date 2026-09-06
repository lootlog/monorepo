// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Storage as MemoryStorage } from "happy-dom";
import { afterEach, expect, it, vi } from "vitest";
import "@/i18n/config";
import { DashboardLiveFeed } from "./dashboard-live-feed";
import { feedResponse } from "./live-feed-test-data";
import { GatewayEvent } from "@/config/gateway";
const mocks = vi.hoisted(() => {
  const handlers = new Map<string, Set<(payload?: unknown) => void>>();
  return {
    request: vi.fn(),
    handlers,
    socket: {
      on: (name: string, handler: (payload?: unknown) => void) => {
        const listeners = handlers.get(name) ?? new Set();
        listeners.add(handler);
        handlers.set(name, listeners);
      },
      off: (name: string, handler: (payload?: unknown) => void) => {
        handlers.get(name)?.delete(handler);
      },
      emit: (name: string, payload?: unknown) =>
        handlers.get(name)?.forEach((handler) => handler(payload)),
    },
  };
});
vi.mock("@/hooks/utils/use-gateway", () => ({
  useGateway: () => ({ socket: mocks.socket, connected: false }),
}));
vi.mock("@lootlog/client/main", () => ({
  getUsersControllerGetUserFeedQueryKey: () => ["user-feed"],
  getUsersControllerGetUserFeedQueryOptions: () => ({
    queryKey: ["user-feed"],
    queryFn: mocks.request,
  }),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  mocks.handlers.clear();
});
it("keeps focused visible rows and scroll position until the reader applies a grouped update", async () => {
  vi.stubGlobal("localStorage", new MemoryStorage());
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-06T12:01:00Z"));
  mocks.request
    .mockResolvedValueOnce(feedResponse())
    .mockResolvedValueOnce(feedResponse(4));
  const root = createRootRoute({ component: DashboardLiveFeed });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await act(() => vi.advanceTimersByTimeAsync(0));
  const link = screen.getByRole("link", { name: "Bicie: Heros" });
  link.focus();
  const scroller = screen
    .getByRole("region", { name: "Na żywo" })
    .querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
  if (!scroller) throw new Error("Feed scroll region missing");
  scroller.scrollTop = 120;
  fireEvent.scroll(scroller);
  act(() =>
    mocks.socket.emit(GatewayEvent.FEED_ENTRY, feedResponse(4).items[0]),
  );
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(screen.queryByText("×4")).toBeNull();
  expect(document.activeElement).toBe(link);
  expect(scroller.scrollTop).toBe(120);
  expect(screen.queryByText("Aktualizacje wstrzymane")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Nowe zdarzenia" }));
  expect(screen.getByText("×4")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Wstrzymaj" }));
  expect(screen.getByRole("button", { name: "Wznów" })).toBeTruthy();
  mocks.request.mockResolvedValue(feedResponse(4));
  fireEvent.click(screen.getByRole("button", { name: "Wznów" }));
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(screen.getByRole("button", { name: "Wstrzymaj" })).toBeTruthy();
});
