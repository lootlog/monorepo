// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  getListEventMapsQueryKey,
  useListEventMaps,
  type EventMapsResponseDtoOutput,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, onTestFinished } from "vitest";
import { useMapManageDialog } from "./use-map-manage-dialog";

await initializeTestTranslations();

afterEach(cleanup);

const pathParams = { guildId: "guild-1", eventId: "event-1" };

const queryKey = getListEventMapsQueryKey(pathParams);

const firstLocation = { id: "location-1", name: "Las", order: 0, maps: [] };

const secondLocation = { id: "location-2", name: "Góry", order: 1, maps: [] };

const hero = {
  id: "hero-1",
  npcId: 1,
  npcName: "Heros",
  npcIcon: null,
  npcLvl: 100,
  locations: [firstLocation, secondLocation],
  maps: [],
} satisfies EventMapsResponseDtoOutput["heroNpcs"][number];

function renderMapManagement(
  fetch: NonNullable<
    Parameters<typeof configureApiClients>[0]["main"]
  >["fetch"],
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  onTestFinished(() => client.clear());
  onTestFinished(
    configureApiClients({ main: { baseUrl: "https://api.test", fetch } }),
  );
  client.setQueryData(queryKey, { eventId: "event-1", heroNpcs: [hero] });

  const hook = renderHook(
    () => {
      const { data } = useListEventMaps(pathParams);

      return useMapManageDialog({
        ...pathParams,
        hero: data?.heroNpcs[0] ?? hero,
        open: true,
        onOpenChange: () => {},
      });
    },
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  );

  return { ...hook, client };
}

it("shows created and deleted locations after mutations refresh an open dialog", async () => {
  const newLocation = {
    id: "location-3",
    name: "Jaskinia",
    order: 2,
    maps: [],
  };

  let locations = hero.locations;

  const { result } = renderMapManagement(async (input, init) => {
    const request = new Request(input, init);
    const pathname = new URL(request.url).pathname;

    if (request.method === "POST" && pathname.endsWith("/locations")) {
      locations = [...locations, newLocation];

      return new Response(null, { status: 204 });
    }

    if (request.method === "DELETE" && pathname.endsWith("/location-1")) {
      locations = locations.filter((location) => location.id !== "location-1");

      return new Response(null, { status: 204 });
    }

    if (pathname.endsWith("/events/event-1/maps")) {
      return Response.json({
        eventId: "event-1",
        heroNpcs: [{ ...hero, locations }],
      });
    }

    return Response.json([]);
  });

  act(() => result.current.setNewLocationName("Jaskinia"));
  await act(() => result.current.handleCreateLocation());
  await waitFor(() =>
    expect(result.current.displayedLocations).toEqual([
      firstLocation,
      secondLocation,
      newLocation,
    ]),
  );

  await act(() => result.current.handleDeleteLocation("location-1"));
  await waitFor(() =>
    expect(result.current.displayedLocations).toEqual([
      secondLocation,
      newLocation,
    ]),
  );
});

it("restores the latest server locations when saving a reordered list fails", async () => {
  let finishRequest = (_response: Response) => {};

  const request = new Promise<Response>((resolve) => {
    finishRequest = resolve;
  });

  const { result, client } = renderMapManagement(async (input, init) => {
    if (new Request(input, init).url.endsWith("/locations/reorder")) {
      return request;
    }

    return Response.json([]);
  });

  act(() => result.current.handleReorder([secondLocation, firstLocation]));
  act(() => result.current.handleDragEnd());
  expect(
    result.current.displayedLocations.map((location) => location.id),
  ).toEqual(["location-2", "location-1"]);

  const updatedFirstLocation = { ...firstLocation, name: "Nowy las" };

  const newLocation = {
    id: "location-3",
    name: "Jaskinia",
    order: 2,
    maps: [],
  };

  const currentLocations = [updatedFirstLocation, secondLocation, newLocation];
  act(() => {
    client.setQueryData(queryKey, {
      eventId: "event-1",
      heroNpcs: [{ ...hero, locations: currentLocations }],
    });
  });
  await waitFor(() =>
    expect(result.current.heroLocations).toEqual(currentLocations),
  );

  await act(async () => {
    finishRequest(Response.json({ message: "Failed" }, { status: 500 }));
    await request;
  });
  await waitFor(() =>
    expect(result.current.displayedLocations).toEqual(currentLocations),
  );
});

it("keeps the reordered list until its refresh completes, then follows later server changes", async () => {
  let finishRefresh = (_response: Response) => {};

  const refresh = new Promise<Response>((resolve) => {
    finishRefresh = resolve;
  });

  let refreshStarted = false;

  const { result, client } = renderMapManagement(async (input, init) => {
    const request = new Request(input, init);

    if (request.url.endsWith("/locations/reorder")) {
      return new Response(null, { status: 204 });
    }

    if (request.url.endsWith("/events/event-1/maps")) {
      refreshStarted = true;

      return refresh;
    }

    return Response.json([]);
  });

  act(() => result.current.handleReorder([secondLocation, firstLocation]));
  act(() => result.current.handleDragEnd());
  await waitFor(() => expect(refreshStarted).toBe(true));
  expect(result.current.displayedLocations).toEqual([
    secondLocation,
    firstLocation,
  ]);

  await act(async () => {
    finishRefresh(
      Response.json({
        eventId: "event-1",
        heroNpcs: [{ ...hero, locations: [secondLocation, firstLocation] }],
      }),
    );
    await refresh;
  });
  await waitFor(() => expect(result.current.isReordering).toBe(false));

  act(() => {
    client.setQueryData(queryKey, {
      eventId: "event-1",
      heroNpcs: [{ ...hero, locations: [firstLocation] }],
    });
  });
  await waitFor(() =>
    expect(result.current.displayedLocations).toEqual([firstLocation]),
  );
});
