import { Capability } from "@lootlog/schema/permissions";
import { authFetch } from "./startup-navigation.fetch.fixtures";
import type { RouterContext } from "@/App";
import type { SessionData } from "@/hooks/auth/use-session";
import { handleWebApiError } from "@/lib/configure-api-clients";
import { loadOrganizationRoute } from "@/lib/router/organization-loader";
import { useAuthRecoveryStore } from "@/store/auth-recovery.store";
import type {
  GuildResponseDtoOutput,
  NullableMemberResponseDto,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { onlineManager, QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, beforeEach, onTestFinished, vi } from "vitest";
import { Route as AuthenticatedRoute } from "../../routes/_authenticated";
import { Route as OrganizationRoute } from "../../routes/_authenticated/$guildId";
import { Route as OrganizationIndexRoute } from "../../routes/_authenticated/$guildId/index";
import { Route as PersonalPanelRoute } from "../../routes/_authenticated/@me";
import { Route as SigninRoute } from "../../routes/signin";

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

export const guildFor = (id: string): GuildResponseDtoOutput => ({
  id,
  name: `Organization ${id}`,
  ownerId: "owner",
  publicStatsCardEnabled: false,
  reservationMaxDurationMinutes: 120,
  reservationMinDurationMinutes: 5,
  reservationTimeGranularityMinutes: 5,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 1,
  lootDrawExcludedNpcTypes: ["HERO", "EVENT_HERO", "TITAN"],
});

export const memberFor = (
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

export const createNavigation = ({
  initialEntry = "/signin",
  userId = "user-1",
  permissions = [Capability.LOOTLOG_LOOTS_READ],
  organizationResponse,
  personalPageLoader,
}: {
  initialEntry?: string;
  userId?: string;
  permissions?: Capability[];
  personalPageLoader?: () => Promise<void>;
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

    if (customized) return await customized;

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

  const root = createRootRouteWithContext<RouterContext>()();

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

  const personalPanel = createRoute({
    getParentRoute: () => authenticated,
    path: "@me",
    beforeLoad: (context) => {
      const beforeLoad = PersonalPanelRoute.options.beforeLoad;

      if (!beforeLoad) throw new Error("Missing personal panel callback");

      // SAFETY: The callback consumes only the destination location.
      return beforeLoad({ location: context.location } as Parameters<
        typeof beforeLoad
      >[0]);
    },
    onEnter: (match) => {
      const onEnter = PersonalPanelRoute.options.onEnter;

      if (!onEnter) throw new Error("Missing personal panel entry callback");
      // SAFETY: The match has production authentication and route context.
      onEnter(match as Parameters<typeof onEnter>[0]);
    },
    onStay: (match) => {
      const onStay = PersonalPanelRoute.options.onStay;

      if (!onStay) throw new Error("Missing personal panel stay callback");
      // SAFETY: The match has production authentication and route context.
      onStay(match as Parameters<typeof onStay>[0]);
    },
  });

  const dashboard = createRoute({
    getParentRoute: () => personalPanel,
    path: "/",
  });

  const settings = createRoute({
    getParentRoute: () => personalPanel,
    path: "settings/account",
    loader: () => personalPageLoader?.(),
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
    loader: loadOrganizationRoute,
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
        location: context.location,
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

  const router = createRouter({
    routeTree: root.addChildren([
      authenticated.addChildren([
        personalPanel.addChildren([dashboard, settings]),
        organization.addChildren([index, timers]),
      ]),
      signin,
      invite,
      battle,
    ]),
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });

  const requestCount = (path: string) =>
    apiFetch.mock.calls.filter(([input]) => {
      return (
        new URL(input instanceof Request ? input.url : input).pathname === path
      );
    }).length;

  return { router, queryClient, apiFetch, requestCount };
};
