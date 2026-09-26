// @vitest-environment happy-dom
import type { RouterContext } from "@/App";
import type { SessionData } from "@/hooks/auth/use-session";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { handleWebApiError } from "@/lib/configure-api-clients";
import {
  getLastOrganization,
  rememberOrganization,
} from "@/lib/last-organization";
import { createInitialNavigation } from "@/lib/router/initial-navigation";
import { useAuthRecoveryStore } from "@/store/auth-recovery.store";
import {
  getGuildsControllerGetGuildByIdQueryKey,
  type GuildResponseDtoOutput,
  type NullableMemberResponseDto,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { Capability } from "@lootlog/domain/access-policy";
import { onlineManager, QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { Route as RootRoute } from "../../routes/__root";
import { Route as AuthenticatedRoute } from "../../routes/_authenticated";
import { Route as OrganizationRoute } from "../../routes/_authenticated/$guildId";
import { Route as OrganizationIndexRoute } from "../../routes/_authenticated/$guildId/index";
import { Route as DashboardRoute } from "../../routes/_authenticated/@me/index";
import { Route as SigninRoute } from "../../routes/signin";

const authFetch = vi.hoisted(() => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  vi.stubGlobal("fetch", fetch);

  return fetch;
});

beforeEach(() => {
  localStorage.clear();
  useAuthRecoveryStore.getState().clearFailure();
});

afterEach(() => {
  onlineManager.setOnline(true);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const sessionFor = (userId: string): SessionData => ({
  user: {
    id: userId,
    discordId: `discord-${userId}`,
    name: "Member",
    email: `${userId}@example.test`,
    emailVerified: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  session: {
    id: `session-${userId}`,
    userId,
    token: "fixture-token",
    expiresAt: new Date("2099-01-01"),
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
});

const guildFor = (id: string): GuildResponseDtoOutput => ({
  id,
  name: `Organization ${id}`,
  ownerId: "owner",
  publicStatsCardEnabled: false,
  reservationMaxDurationMinutes: 120,
  reservationMinDurationMinutes: 5,
  reservationTimeGranularityMinutes: 5,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 1,
});

const memberFor = (
  guildId: string,
  userId: string,
): NullableMemberResponseDto => ({
  id: 1,
  guildId,
  userId,
  type: "USER",
  name: "Member",
  active: true,
  roles: [],
  updatedAt: "2026-09-01T00:00:00.000Z",
});

const createNavigation = ({
  initialEntry = "/@me",
  userId = "user-1",
  permissions = [Capability.LOOTLOG_LOOTS_READ],
  organizationResponse,
}: {
  initialEntry?: string;
  userId?: string;
  permissions?: Capability[];
  organizationResponse?: (
    path: string,
  ) => Response | Promise<Response> | undefined;
} = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: 2, retryDelay: 0, gcTime: Infinity },
    },
  });

  onTestFinished(() => queryClient.clear());

  const apiFetch = vi.fn(async (input: string | URL | Request) => {
    const path = new URL(input instanceof Request ? input.url : input).pathname;

    if (path === "/idp/get-session") {
      return Response.json(sessionFor(userId));
    }

    const customized = organizationResponse?.(path);

    if (customized) return customized;

    const [, resource, requestedId, detail] = path.split("/");

    if (resource !== "guilds" || !requestedId) {
      throw new Error(`Unexpected request: ${path}`);
    }

    const guildId = requestedId === "alias" ? "42" : requestedId;

    if (detail === "members") return Response.json(memberFor(guildId, userId));

    if (detail === "permissions") return Response.json(permissions);

    return Response.json(guildFor(guildId));
  });

  authFetch.mockImplementation(apiFetch);

  const restoreClient = configureApiClients({
    main: {
      baseUrl: "https://api.test",
      fetch: apiFetch,
      onError: handleWebApiError,
    },
  });

  onTestFinished(restoreClient);

  const root = createRootRouteWithContext<RouterContext>()({
    beforeLoad: RootRoute.options.beforeLoad,
  });

  const authenticated = createRoute({
    getParentRoute: () => root,
    id: "_authenticated",
    beforeLoad: (context) => {
      const beforeLoad = AuthenticatedRoute.options.beforeLoad;

      if (!beforeLoad) throw new Error("Missing authentication callback");

      // SAFETY: The callback consumes the real root context and destination location.
      return beforeLoad({
        context: context.context,
        location: context.location,
      } as Parameters<typeof beforeLoad>[0]);
    },
  });

  const dashboard = createRoute({
    getParentRoute: () => authenticated,
    path: "@me",
    beforeLoad: (context) => {
      const beforeLoad = DashboardRoute.options.beforeLoad;

      if (!beforeLoad) throw new Error("Missing dashboard callback");

      // SAFETY: This route has the production authentication/root contexts;
      // only the generated file route's parent/path metadata differs.
      return beforeLoad({
        context: context.context,
        preload: context.preload,
        abortController: context.abortController,
      } as Parameters<typeof beforeLoad>[0]);
    },
  });

  const settings = createRoute({
    getParentRoute: () => authenticated,
    path: "@me/settings/account",
  });

  const organization = createRoute({
    getParentRoute: () => authenticated,
    path: "$guildId",
    beforeLoad: (context) => {
      const beforeLoad = OrganizationRoute.options.beforeLoad;

      if (!beforeLoad) throw new Error("Missing organization context callback");

      // SAFETY: The callback consumes only the matched organization parameter.
      return beforeLoad({ params: context.params } as Parameters<
        typeof beforeLoad
      >[0]);
    },
    loader: (context) => {
      const loader = OrganizationRoute.options.loader;

      if (!loader || "handler" in loader)
        throw new Error("Missing organization loader");

      // SAFETY: The test tree supplies the same authenticated context and guild params.
      return loader({
        context: context.context,
        params: context.params,
        abortController: context.abortController,
      } as Parameters<typeof loader>[0]);
    },
    onEnter: (match) => {
      const onEnter = OrganizationRoute.options.onEnter;

      if (!onEnter) throw new Error("Missing organization entry callback");
      // SAFETY: The match has production loader data and authentication context.
      onEnter(match as Parameters<typeof onEnter>[0]);
    },
    onStay: (match) => {
      const onStay = OrganizationRoute.options.onStay;

      if (!onStay) throw new Error("Missing organization stay callback");
      // SAFETY: The match has production loader data and authentication context.
      onStay(match as Parameters<typeof onStay>[0]);
    },
  });

  const index = createRoute({
    getParentRoute: () => organization,
    path: "/",
    loader: (context) => {
      const loader = OrganizationIndexRoute.options.loader;

      if (!loader || "handler" in loader)
        throw new Error("Missing organization landing loader");

      // SAFETY: The test tree supplies the same authenticated context and guild params.
      return loader({
        context: context.context,
        params: context.params,
      } as Parameters<typeof loader>[0]);
    },
  });

  const timers = createRoute({
    getParentRoute: () => organization,
    path: "timers",
  });

  const signin = createRoute({
    getParentRoute: () => root,
    path: "signin",
    validateSearch: SigninRoute.options.validateSearch,
    beforeLoad: SigninRoute.options.beforeLoad,
  });

  const invite = createRoute({ getParentRoute: () => root, path: "init" });

  const battle = createRoute({
    getParentRoute: () => root,
    path: "battles/$battleId",
  });

  const initialNavigation = createInitialNavigation();

  const router = createRouter({
    routeTree: root.addChildren([
      authenticated.addChildren([
        dashboard,
        settings,
        organization.addChildren([index, timers]),
      ]),
      signin,
      invite,
      battle,
    ]),
    context: { queryClient, initialNavigation },
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });

  onTestFinished(initialNavigation.track(router));

  const requestCount = (path: string) =>
    apiFetch.mock.calls.filter(([input]) => {
      return (
        new URL(input instanceof Request ? input.url : input).pathname === path
      );
    }).length;

  return { router, queryClient, apiFetch, requestCount };
};

it("remembers the last committed organization and restores it without fetching it twice", async () => {
  const firstVisit = createNavigation();
  await firstVisit.router.load();
  await firstVisit.router.navigate({ href: "/42" });
  await firstVisit.router.navigate({ href: "/43" });
  expect(getLastOrganization("user-1")).toBe("43");

  const reopened = createNavigation();
  await reopened.router.load();
  expect(reopened.router.state.location.pathname).toBe("/43");
  expect(reopened.router.history.length).toBe(1);
  expect(reopened.requestCount("/guilds/43")).toBe(1);
  expect(reopened.requestCount("/guilds/43/members/@me")).toBe(1);
  expect(reopened.requestCount("/guilds/43/permissions")).toBe(1);
});

it("keeps organization choices separate when another account uses the same browser", async () => {
  const firstAccount = createNavigation({ initialEntry: "/42" });
  await firstAccount.router.load();
  const secondAccount = createNavigation({ userId: "user-2" });
  await secondAccount.router.load();
  expect(secondAccount.router.state.location.pathname).toBe("/@me");
  await secondAccount.router.navigate({ href: "/43" });

  const firstAccountReturns = createNavigation();
  await firstAccountReturns.router.load();
  expect(firstAccountReturns.router.state.location.pathname).toBe("/42");
  expect(getLastOrganization("user-2")).toBe("43");
});

it("restores the saved organization when the initial session lookup succeeds on retry", async () => {
  rememberOrganization("user-1", "42");

  const { router } = createNavigation();
  authFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

  await router.load();
  expect(router.state.matches.some((match) => match.status === "error")).toBe(
    true,
  );
  expect(router.state.location.pathname).toBe("/@me");

  await router.invalidate();
  expect(router.state.location.pathname).toBe("/42");
});

it("does not restore the saved organization when leaving a failed initial page for the dashboard", async () => {
  rememberOrganization("user-1", "42");

  const { router, requestCount } = createNavigation({
    initialEntry: "/43/timers",
  });

  authFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

  await router.load();
  expect(router.state.matches.some((match) => match.status === "error")).toBe(
    true,
  );

  await router.navigate({ href: "/@me" });
  expect(router.state.location.pathname).toBe("/@me");
  expect(requestCount("/guilds/42")).toBe(0);
});

it("keeps the dashboard after its completed startup fallback is revalidated", async () => {
  rememberOrganization("user-1", "42");
  let unavailable = true;

  const { router, requestCount } = createNavigation({
    organizationResponse: (path) =>
      path === "/guilds/42" && unavailable
        ? Response.json({ message: "Unavailable" }, { status: 503 })
        : undefined,
  });

  await router.load();
  expect(router.state.location.pathname).toBe("/@me");

  unavailable = false;
  await router.invalidate();
  expect(router.state.location.pathname).toBe("/@me");
  expect(requestCount("/guilds/42")).toBe(1);
  expect(getLastOrganization("user-1")).toBe("42");
});

it("persists the canonical organization ID when visiting a vanity URL", async () => {
  const visit = createNavigation({ initialEntry: "/alias" });
  await visit.router.load();
  expect(getLastOrganization("user-1")).toBe("42");
  const reopened = createNavigation();
  await reopened.router.load();
  expect(reopened.router.state.location.pathname).toBe("/42");
});

it("does not let link preloading change the remembered organization", async () => {
  const { router } = createNavigation({ initialEntry: "/42" });
  await router.load();
  await router.preloadRoute({ to: "/$guildId", params: { guildId: "43" } });
  expect(getLastOrganization("user-1")).toBe("42");
  await router.navigate({ href: "/43" });
  expect(getLastOrganization("user-1")).toBe("43");
});

it("still restores the initial dashboard after an earlier route preload", async () => {
  rememberOrganization("user-1", "42");
  const { router } = createNavigation();
  await router.preloadRoute({ to: "/$guildId", params: { guildId: "43" } });
  await router.load();
  expect(router.state.location.pathname).toBe("/42");
});

it("keeps a canceled organization load from overwriting the last completed visit", async () => {
  let finishRequest: (response: Response) => void = () => {
    throw new Error("Pending request was not initialized");
  };

  const pending = new Promise<Response>((resolve) => {
    finishRequest = resolve;
  });

  const { router, requestCount } = createNavigation({
    initialEntry: "/42",
    organizationResponse: (path) =>
      path === "/guilds/43" ? pending : undefined,
  });

  await router.load();
  const canceledNavigation = router.navigate({ href: "/43" });
  await vi.waitFor(() => expect(requestCount("/guilds/43")).toBe(1));
  await router.navigate({ href: "/@me" });
  finishRequest(Response.json(guildFor("43")));
  await canceledNavigation;
  expect(router.state.location.pathname).toBe("/@me");
  expect(getLastOrganization("user-1")).toBe("42");
});

it("keeps the previous organization after a denied visit", async () => {
  const { router } = createNavigation({
    initialEntry: "/42",
    organizationResponse: (path) =>
      path === "/guilds/43"
        ? Response.json({ message: "Forbidden" }, { status: 403 })
        : undefined,
  });

  await router.load();
  await router.navigate({ href: "/43" });
  expect(router.state.matches.some((match) => match.status === "error")).toBe(
    true,
  );
  expect(getLastOrganization("user-1")).toBe("42");
});

it("allows a manual dashboard visit after startup restoration", async () => {
  rememberOrganization("user-1", "42");
  const { router } = createNavigation();
  await router.load();
  await router.navigate({ href: "/@me" });
  expect(router.state.location.pathname).toBe("/@me");
});

it.each([
  "/43/timers",
  "/@me/settings/account",
  "/battles/public-battle",
  "/init",
])(
  "preserves the direct destination %s and later allows opening the dashboard",
  async (initialEntry) => {
    rememberOrganization("user-1", "42");
    const { router, requestCount } = createNavigation({ initialEntry });
    await router.load();
    expect(router.state.location.pathname).toBe(initialEntry);
    expect(requestCount("/guilds/42")).toBe(0);
    await router.navigate({ href: "/@me" });
    expect(router.state.location.pathname).toBe("/@me");
  },
);

it.each([
  ["/signin", "/42"],
  ["/signin?redirect=%2F43%2Ftimers", "/43/timers"],
  ["/signin?redirect=%2F%40me", "/@me"],
  ["/signin?error=access_denied", "/signin"],
])(
  "opens %s at its intended destination",
  async (initialEntry, expectedPath) => {
    rememberOrganization("user-1", "42");
    const { router } = createNavigation({ initialEntry });
    await router.load();
    expect(router.state.location.pathname).toBe(expectedPath);
  },
);

it("uses the organization's permitted landing section after restoration", async () => {
  rememberOrganization("user-1", "42");

  const { router } = createNavigation({
    permissions: [Capability.LOOTLOG_TIMERS_READ],
  });

  await router.load();
  expect(router.state.location.pathname).toBe("/42/timers");
});

it.each([403, 404])(
  "forgets inaccessible organizations after HTTP %s without retrying",
  async (status) => {
    rememberOrganization("user-1", "42");

    const { router, requestCount } = createNavigation({
      organizationResponse: (path) =>
        path === "/guilds/42"
          ? Response.json({ message: "Unavailable" }, { status })
          : undefined,
    });

    await router.load();
    expect(router.state.location.pathname).toBe("/@me");
    expect(getLastOrganization("user-1")).toBeNull();
    expect(requestCount("/guilds/42")).toBe(1);
  },
);

it("rechecks stale organization access before restoring a signed-in user", async () => {
  rememberOrganization("user-1", "42");
  let accessRevoked = false;

  const { router, queryClient, requestCount } = createNavigation({
    initialEntry: "/signin",
    organizationResponse: (path) =>
      path === "/guilds/42" && accessRevoked
        ? Response.json({ message: "Forbidden" }, { status: 403 })
        : undefined,
  });

  await router.preloadRoute({ to: "/$guildId", params: { guildId: "42" } });
  accessRevoked = true;
  await queryClient.invalidateQueries({
    queryKey: getGuildsControllerGetGuildByIdQueryKey({ guildId: "42" }),
  });
  await router.load();
  expect(router.state.location.pathname).toBe("/@me");
  expect(getLastOrganization("user-1")).toBeNull();
  expect(requestCount("/guilds/42")).toBe(2);
});

it.each([null, { ...memberFor("42", "user-1"), active: false }])(
  "forgets an organization when its former member no longer has access: %j",
  async (member) => {
    rememberOrganization("user-1", "42");

    const { router } = createNavigation({
      organizationResponse: (path) =>
        path === "/guilds/42/members/@me" ? Response.json(member) : undefined,
    });

    await router.load();
    expect(router.state.location.pathname).toBe("/@me");
    expect(getLastOrganization("user-1")).toBeNull();
  },
);

it("restores an owner's organization even without an active membership record", async () => {
  rememberOrganization("user-1", "42");

  const { router } = createNavigation({
    permissions: [Capability.OWNER],
    organizationResponse: (path) =>
      path === "/guilds/42/members/@me" ? Response.json(null) : undefined,
  });

  await router.load();
  expect(router.state.location.pathname).toBe("/42");
});

it.each([
  [401, "/@me"],
  [403, "/@me"],
  [401, "/signin"],
  [403, "/signin"],
])(
  "preserves the remembered organization during HTTP %s session recovery from %s",
  async (status, initialEntry) => {
    rememberOrganization("user-1", "42");

    const { router } = createNavigation({
      initialEntry,
      organizationResponse: (path) =>
        path === "/guilds/42"
          ? Response.json(
              { message: "Session expired", requiresReauth: status === 403 },
              { status },
            )
          : undefined,
    });

    await router.load();
    expect(router.state.location.pathname).toBe("/@me");
    expect(getLastOrganization("user-1")).toBe("42");
    expect(useAuthRecoveryStore.getState().failure).toMatchObject({ status });
  },
);

it.each(["network", "server", "offline"])(
  "opens the dashboard without forgetting or retrying after a %s failure",
  async (failure) => {
    rememberOrganization("user-1", "42");

    const { router, queryClient, requestCount } = createNavigation({
      organizationResponse: (path) => {
        if (path !== "/guilds/42") return undefined;

        if (failure === "server")
          return Response.json({ message: "Unavailable" }, { status: 503 });
        throw new TypeError("Failed to fetch");
      },
    });

    if (failure === "offline") {
      await queryClient.fetchQuery(sessionQueryOptions);
      onlineManager.setOnline(false);
    }

    await router.load();
    expect(router.state.location.pathname).toBe("/@me");
    expect(getLastOrganization("user-1")).toBe("42");
    expect(requestCount("/guilds/42")).toBe(1);
  },
);

it.each([null, "not-an-id", "../../signin"])(
  "keeps the dashboard usable with a missing or invalid preference: %s",
  async (stored) => {
    if (stored !== null)
      localStorage.setItem("lootlog:user:user-1:last-organization", stored);
    const { router, requestCount } = createNavigation();
    await router.load();
    expect(router.state.location.pathname).toBe("/@me");
    expect(requestCount(`/guilds/${stored}`)).toBe(0);
  },
);

it("keeps navigation usable when browser storage is blocked", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Storage blocked", "SecurityError");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Storage blocked", "SecurityError");
  });
  const { router } = createNavigation();
  await router.load();
  expect(router.state.location.pathname).toBe("/@me");
  await router.navigate({ href: "/42" });
  expect(
    router.state.matches.every((match) => match.status === "success"),
  ).toBe(true);
});

it("returns to the dashboard even if the inaccessible preference cannot be removed", async () => {
  rememberOrganization("user-1", "42");
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
    throw new DOMException("Storage blocked", "SecurityError");
  });

  const { router } = createNavigation({
    organizationResponse: (path) =>
      path === "/guilds/42"
        ? Response.json({ message: "Not found" }, { status: 404 })
        : undefined,
  });

  await router.load();
  expect(router.state.location.pathname).toBe("/@me");
  expect(
    router.state.matches.every((match) => match.status === "success"),
  ).toBe(true);
});
