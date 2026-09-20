// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { configureApiClients } from "@lootlog/client/transport";
import { afterEach, expect, it, vi } from "vitest";
import "@/i18n/config";
import { LootDetailsActions } from "./loot-details-actions";

afterEach(cleanup);

it("deletes only after confirmation and reports completion once the request finishes", async () => {
  let resolveResponse: (response: Response) => void = () => {};

  const response = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });

  const fetch = vi.fn(
    (_input: RequestInfo | URL, _init?: RequestInit) => response,
  );

  const restore = configureApiClients({
    main: { baseUrl: "http://api.test", fetch },
  });

  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  const onDeleted = vi.fn();

  const loot = {
    id: 1,
    uniqueId: "loot-1",
    mapPlayersSnapshot: null,
    world: "tempest",
    source: "FIGHT" as const,
    location: "Map",
    items: [],
    players: [],
    npcs: [],
    lootShare: {},
    createdAt: "2026-09-06T10:00:00.000Z",
    updatedAt: "2026-09-06T10:00:00.000Z",
    commentsCount: 0,
  };

  const root = createRootRoute();

  const route = createRoute({
    getParentRoute: () => root,
    path: "$guildId/loots",
    component: () => <LootDetailsActions loot={loot} onDeleted={onDeleted} />,
  });

  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/guild-1/loots"] }),
  });

  try {
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Usuń" }));
    expect(fetch).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", { name: "Usuń" });
    fireEvent.click(confirm);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    fireEvent.click(confirm);
    expect(fetch).toHaveBeenCalledOnce();
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      "http://api.test/guilds/guild-1/loots/1",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(onDeleted).not.toHaveBeenCalled();

    resolveResponse(new Response(null, { status: 204 }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  } finally {
    cleanup();
    client.clear();
    restore();
  }
});
