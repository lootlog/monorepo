// @vitest-environment happy-dom

import { createEventOverview } from "@/lib/testing/event";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  getListEventMapsQueryKey,
  getShowEventOverviewQueryKey,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, onTestFinished } from "vitest";
import { useEventDetail } from "./use-event-detail";
import { HeroManageDialog } from "./components/dialogs/hero-manage-dialog";

await initializeTestTranslations();

afterEach(cleanup);

it("keeps selected hero maps current and closes management if that hero disappears", async () => {
  const hero = {
    id: "hero-1",
    npcId: 1,
    npcName: "Heros",
    npcIcon: null,
    npcLvl: 100,
  };

  const event = createEventOverview({ heroNpcs: [hero] });

  const map = {
    id: "map-1",
    mapId: 1,
    mapName: "Las",
    locationId: null,
    assignedMembers: [],
  };

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  onTestFinished(() => client.clear());
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input, init) => {
          const path = new URL(new Request(input, init).url).pathname;

          if (path.endsWith("/overview")) return Response.json(event);

          if (path.endsWith("/maps")) {
            return Response.json({
              eventId: event.id,
              heroNpcs: [{ ...hero, locations: [], maps: [map] }],
            });
          }

          return Response.json([]);
        },
      },
    }),
  );

  const root = createRootRoute();

  const route = createRoute({
    getParentRoute: () => root,
    path: "$guildId/events/$eventId",
    component: function EventMapSelection() {
      const {
        heroes,
        selectedHero,
        mapDialogOpen,
        handleManageMaps,
        heroDialogOpen,
        setHeroDialogOpen,
        handleEditHero,
      } = useEventDetail();

      return (
        <>
          {heroes.map((entry) => (
            <button key={entry.id} onClick={() => handleManageMaps(entry)}>
              {entry.npcName}
            </button>
          ))}
          {heroes.map((entry) => (
            <button key={entry.id} onClick={() => handleEditHero(entry)}>
              Edit {entry.npcName}
            </button>
          ))}
          {mapDialogOpen && <output>{JSON.stringify(selectedHero)}</output>}
          {heroDialogOpen && (
            <HeroManageDialog
              key={selectedHero?.id ?? "new"}
              open={heroDialogOpen}
              onOpenChange={setHeroDialogOpen}
              guildId="guild-1"
              eventId="event-1"
              hero={selectedHero}
            />
          )}
        </>
      );
    },
  });

  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({
      initialEntries: ["/guild-1/events/event-1"],
    }),
  });

  await router.load();
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Heros" }));
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain("Las"),
  );

  const updatedHero = {
    ...hero,
    maps: [],
    locations: [
      {
        id: "location-1",
        name: "Zachód",
        order: 0,
        maps: [{ ...map, locationId: "location-1" }],
      },
    ],
  };

  act(() => {
    client.setQueryData(
      getListEventMapsQueryKey({ guildId: "guild-1", eventId: "event-1" }),
      {
        eventId: event.id,
        heroNpcs: [updatedHero],
      },
    );
  });

  await waitFor(() =>
    expect(
      JSON.parse(screen.getByRole("status").textContent ?? "null"),
    ).toEqual(updatedHero),
  );

  fireEvent.click(screen.getByRole("button", { name: "Edit Heros" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  act(() => {
    client.setQueryData(
      getShowEventOverviewQueryKey({ guildId: "guild-1", eventId: "event-1" }),
      {
        ...event,
        heroNpcs: [],
      },
    );
  });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.queryByRole("status")).toBeNull();
});
