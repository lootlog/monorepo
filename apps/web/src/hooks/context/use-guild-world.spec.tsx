// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { Storage as MemoryStorage } from "happy-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  readStoredGuildWorld,
  storeGuildWorld,
  useGuildWorld,
  useGuildWorldUrlSync,
} from "./use-guild-world";

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function OrganizationPages() {
  useGuildWorldUrlSync();

  return <Outlet />;
}

function WorldProbe() {
  const { world, setWorld } = useGuildWorld();

  return (
    <>
      <output>{world ?? "all"}</output>
      <button type="button" onClick={() => setWorld(null)}>
        All worlds
      </button>
    </>
  );
}

async function mount(initialEntry: string) {
  const root = createRootRoute();

  const organization = createRoute({
    getParentRoute: () => root,
    path: "$guildId",
    component: OrganizationPages,
  });

  const page = createRoute({
    getParentRoute: () => organization,
    path: "$page",
    component: WorldProbe,
  });

  const router = createRouter({
    routeTree: root.addChildren([organization.addChildren([page])]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });

  await router.load();
  render(<RouterProvider router={router} />);
  await act(async () => undefined);

  const navigate = async (to: string) => {
    await act(async () => {
      await router.navigate({ to });
    });
  };

  return { router, navigate };
}

it("keeps a shared link's world for the Organization's other pages", async () => {
  storeGuildWorld("one", "tempest");
  const { router, navigate } = await mount("/one/timers?world=pandora");

  expect(screen.getByRole("status").textContent).toBe("pandora");
  expect(readStoredGuildWorld("one")).toBe("pandora");

  await navigate("/one/loots");

  expect(screen.getByRole("status").textContent).toBe("pandora");
  await waitFor(() =>
    expect(router.state.location.search).toMatchObject({ world: "pandora" }),
  );
});

it("opens another Organization on its own world, never the previous one's", async () => {
  storeGuildWorld("one", "tempest");
  const { router, navigate } = await mount("/one/timers");

  expect(screen.getByRole("status").textContent).toBe("tempest");
  await waitFor(() =>
    expect(router.state.location.search).toMatchObject({ world: "tempest" }),
  );

  await navigate("/two/timers");

  expect(screen.getByRole("status").textContent).toBe("all");
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
  expect(router.state.location.search).not.toHaveProperty("world");
  expect(readStoredGuildWorld("two")).toBeNull();
});

it("keeps all worlds once chosen on a page whose link named a world", async () => {
  const { router } = await mount("/one/timers?world=pandora");

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "All worlds" }));
  });

  expect(screen.getByRole("status").textContent).toBe("all");
  expect(router.state.location.search).not.toHaveProperty("world");
  expect(readStoredGuildWorld("one")).toBeNull();
});
