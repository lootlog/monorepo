// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, expect, it, vi } from "vitest";
import { useBattleSwitch } from "./use-battle-switch";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const Probe = () => {
  const { openBattle, pendingBattleId } = useBattleSwitch();

  return (
    <>
      <button
        type="button"
        onClick={(event) => void openBattle(event, "battle-a")}
      >
        A
      </button>
      <button
        type="button"
        onClick={(event) => void openBattle(event, "battle-b")}
      >
        B
      </button>
      <output>{pendingBattleId}</output>
      <Outlet />
    </>
  );
};

it("opens the battle picked last when an earlier pick loads later", async () => {
  const loads = new Map<string, () => void>();
  const queryClient = new QueryClient();

  vi.spyOn(queryClient, "ensureQueryData").mockImplementation(
    ({ queryKey }) => {
      const battleId = JSON.stringify(queryKey).includes("battle-a")
        ? "battle-a"
        : "battle-b";

      return new Promise((resolve) => {
        const previous = loads.get(battleId);

        loads.set(battleId, () => {
          previous?.();
          resolve(null);
        });
      });
    },
  );

  const root = createRootRoute({ component: Probe });

  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({ getParentRoute: () => root, path: "/start" }),
      createRoute({
        getParentRoute: () => root,
        path: "/@me/battle-panel/battles/$battleId",
      }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/start"] }),
  });

  await router.load();
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "A" }));
  fireEvent.click(screen.getByRole("button", { name: "B" }));

  await act(async () => loads.get("battle-b")?.());
  await waitFor(() =>
    expect(router.state.location.pathname).toBe(
      "/@me/battle-panel/battles/battle-b",
    ),
  );

  // The earlier pick finishes loading last and must not take over.
  await act(async () => {
    loads.get("battle-a")?.();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  expect(router.state.location.pathname).toBe(
    "/@me/battle-panel/battles/battle-b",
  );
  expect(screen.getByRole("status").textContent).toBe("");
});
