// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetCurrentUserGuildsQueryKey,
  type GuildResponseDtoOutput,
  type UserCurrentGuildResponseDtoOutput,
} from "@lootlog/client/main";
import {
  configureApiClients,
  type ApiServiceConfig,
} from "@lootlog/client/transport";
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  defaultStringifySearch,
  RouterProvider,
} from "@tanstack/react-router";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { Route } from "../../routes/init";
import { Init } from "./init";

await initializeTestTranslations();

afterEach(() => {
  cleanup();
  onlineManager.setOnline(true);
});

const guild = {
  id: "guild-1",
  name: "Guild",
  ownerId: "owner",
  publicStatsCardEnabled: false,
  reservationMaxDurationMinutes: 120,
  reservationMinDurationMinutes: 5,
  reservationTimeGranularityMinutes: 5,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 1,
} satisfies GuildResponseDtoOutput;

const refreshedGuilds = [
  {
    id: guild.id,
    name: guild.name,
    ownerId: guild.ownerId,
    publicStatsCardEnabled: false,
    hasLootlogAccess: true,
    isAccessDataStale: false,
  },
] satisfies UserCurrentGuildResponseDtoOutput[];

const renderInit = async (
  fetchGuild: NonNullable<ApiServiceConfig["fetch"]>,
  {
    initialEntry = "/init?guild_id=guild-1",
    stringifySearch = defaultStringifySearch,
    refreshGuilds = async () => Response.json(refreshedGuilds),
  }: {
    initialEntry?: string;
    stringifySearch?: typeof defaultStringifySearch;
    refreshGuilds?: NonNullable<ApiServiceConfig["fetch"]>;
  } = {},
) => {
  const apiFetch = vi.fn<NonNullable<ApiServiceConfig["fetch"]>>(
    async (input, init) => {
      const path = new URL(input instanceof Request ? input.url : input)
        .pathname;

      if (path === "/users/@me/guilds/refresh" && init?.method === "POST") {
        return refreshGuilds(input, init);
      }

      if (path === "/guilds/guild-1") return fetchGuild(input, init);

      throw new Error(`Unexpected request: ${init?.method} ${path}`);
    },
  );

  const restoreClient = configureApiClients({
    main: {
      baseUrl: "https://api.test",
      fetch: apiFetch,
    },
  });

  onTestFinished(restoreClient);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } },
  });

  onTestFinished(() => queryClient.clear());
  queryClient.setQueryData(
    getUsersControllerGetCurrentUserGuildsQueryKey(),
    [],
  );
  queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [],
  );

  const root = createRootRoute();

  const init = createRoute({
    getParentRoute: () => root,
    path: "init",
    component: Init,
    validateSearch: Route.options.validateSearch,
  });

  const dashboard = createRoute({ getParentRoute: () => root, path: "@me" });
  const signin = createRoute({ getParentRoute: () => root, path: "signin" });

  const organization = createRoute({
    getParentRoute: () => root,
    path: "$guildId",
  });

  const router = createRouter({
    routeTree: root.addChildren([init, dashboard, signin, organization]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    stringifySearch,
    defaultPendingMinMs: 0,
  });

  await router.load();

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { router, queryClient, apiFetch };
};

it.each([
  "/init",
  "/init?guild_id=",
  "/init?guild_id=%20",
  "/init?guild_id=one&guild_id=two",
])(
  "allows leaving %s without requesting an unspecified organization",
  async (initialEntry) => {
    const fetch = vi.fn<NonNullable<ApiServiceConfig["fetch"]>>();
    const { router, apiFetch } = await renderInit(fetch, { initialEntry });

    fireEvent.click(
      await screen.findByRole("button", {
        name: "common.routeErrors.actions.goToDashboard",
      }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe("/@me"));
    expect(apiFetch).not.toHaveBeenCalled();
  },
);

it.each([404, 503])(
  "stops automatic retries for HTTP %s and completes installation after a manual retry",
  async (status) => {
    const fetch = vi
      .fn<NonNullable<ApiServiceConfig["fetch"]>>()
      .mockImplementation(async () =>
        Response.json({ message: "Unavailable" }, { status }),
      );

    const { router, queryClient } = await renderInit(fetch);

    const retry = await screen.findByRole("button", {
      name: "common.routeErrors.actions.retry",
    });

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(fetch).toHaveBeenCalledTimes(3);

    fetch.mockImplementation(async () => Response.json(guild));
    fireEvent.click(retry);

    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/guild-1"),
    );
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(
      queryClient.getQueryData(
        getUsersControllerGetCurrentUserGuildsQueryKey(),
      ),
    ).toEqual(refreshedGuilds);
    expect(
      queryClient.getQueryState(
        getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      )?.isInvalidated,
    ).toBe(true);
  },
);

it("waits briefly for Discord installation to become visible before opening the organization", async () => {
  const fetch = vi
    .fn<NonNullable<ApiServiceConfig["fetch"]>>()
    .mockResolvedValueOnce(
      Response.json({ message: "Not found" }, { status: 404 }),
    )
    .mockResolvedValueOnce(Response.json(guild));

  const { router } = await renderInit(fetch);

  await waitFor(() => expect(router.state.location.pathname).toBe("/guild-1"));
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("recovers from failed organization navigation without fetching installation again", async () => {
  let rejectNavigation = true;

  const fetch = vi
    .fn<NonNullable<ApiServiceConfig["fetch"]>>()
    .mockImplementation(async () => Response.json(guild));

  const { router } = await renderInit(fetch, {
    stringifySearch: (search) => {
      if (rejectNavigation && Object.keys(search).length === 0) {
        throw new Error("Navigation search could not be serialized");
      }

      return defaultStringifySearch(search);
    },
  });

  const retry = await screen.findByRole("button", {
    name: "common.routeErrors.actions.retry",
  });

  expect(router.state.location.pathname).toBe("/init");
  rejectNavigation = false;
  fireEvent.click(retry);

  await waitFor(() => expect(router.state.location.pathname).toBe("/guild-1"));
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("opens the initialized organization even when refreshing the Discord server list fails", async () => {
  const fetchGuild = vi
    .fn<NonNullable<ApiServiceConfig["fetch"]>>()
    .mockImplementation(async () => Response.json(guild));

  const refreshGuilds = vi
    .fn<NonNullable<ApiServiceConfig["fetch"]>>()
    .mockImplementation(async () =>
      Response.json({ message: "Unavailable" }, { status: 503 }),
    );

  const { router, queryClient } = await renderInit(fetchGuild, {
    refreshGuilds,
  });

  await waitFor(() => expect(router.state.location.pathname).toBe("/guild-1"));
  expect(refreshGuilds).toHaveBeenCalledTimes(1);
  expect(
    queryClient.getQueryData(getUsersControllerGetCurrentUserGuildsQueryKey()),
  ).toEqual([]);
});

it("lets an expired session return to sign-in without retrying unauthorized requests", async () => {
  const fetch = vi
    .fn<NonNullable<ApiServiceConfig["fetch"]>>()
    .mockImplementation(async () =>
      Response.json({ message: "Unauthorized" }, { status: 401 }),
    );

  const { router } = await renderInit(fetch);

  fireEvent.click(
    await screen.findByRole("button", {
      name: "common.routeErrors.actions.goToSignIn",
    }),
  );

  await waitFor(() => expect(router.state.location.pathname).toBe("/signin"));
  expect(router.state.location.search).toMatchObject({
    redirect: "/init?guild_id=guild-1",
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("lets a forbidden organization return to the dashboard without automatic retries", async () => {
  const fetch = vi
    .fn<NonNullable<ApiServiceConfig["fetch"]>>()
    .mockImplementation(async () =>
      Response.json({ message: "Forbidden" }, { status: 403 }),
    );

  const { router } = await renderInit(fetch);

  fireEvent.click(
    await screen.findByRole("button", {
      name: "common.routeErrors.actions.goToDashboard",
    }),
  );

  await waitFor(() => expect(router.state.location.pathname).toBe("/@me"));
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("offers an exit when initialization is paused while offline", async () => {
  onlineManager.setOnline(false);
  const fetch = vi.fn<NonNullable<ApiServiceConfig["fetch"]>>();
  const { router, apiFetch } = await renderInit(fetch);

  fireEvent.click(
    await screen.findByRole("button", {
      name: "common.routeErrors.actions.goToDashboard",
    }),
  );

  await waitFor(() => expect(router.state.location.pathname).toBe("/@me"));
  expect(apiFetch).not.toHaveBeenCalled();
});
