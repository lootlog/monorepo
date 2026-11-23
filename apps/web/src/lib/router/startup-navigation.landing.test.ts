import { Capability } from "@lootlog/schema/permissions";
// @vitest-environment happy-dom
import "./startup-navigation.fetch.fixtures";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import {
  getLastOrganization,
  rememberOrganization,
} from "@/lib/last-organization";
import { useAuthRecoveryStore } from "@/store/auth-recovery.store";
import {
  getGuildsControllerGetGuildByIdQueryKey,
  getListPinnedEventsQueryKey,
} from "@lootlog/client/main";
import { onlineManager } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { createNavigation, memberFor } from "./startup-navigation.fixtures";

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

it.each([401, 403])(
  "preserves the remembered organization during HTTP %s session recovery",
  async (status) => {
    rememberOrganization("user-1", "42");

    const { router } = createNavigation({
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

it("opens an organization with its sidebar pins and loot list already loaded", async () => {
  const { router, queryClient } = createNavigation({
    permissions: [
      Capability.LOOTLOG_LOOTS_READ,
      Capability.LOOTLOG_EVENTS_READ,
    ],
    organizationResponse: (path) => {
      if (path === "/guilds/42/pinned-events")
        return new Promise<Response>((resolve) =>
          setTimeout(() => resolve(Response.json([])), 20),
        );

      if (path === "/guilds/42/events" || path === "/guilds/42/worlds")
        return Response.json([]);

      if (path === "/guilds/42/loots")
        return Response.json({ items: [], nextCursor: null });

      return undefined;
    },
  });

  await router.load();
  await router.navigate({ href: "/42?rarities=legendary" });

  expect(
    queryClient.getQueryData(getListPinnedEventsQueryKey({ guildId: "42" })),
  ).toEqual([]);
  expect(
    queryClient
      .getQueryCache()
      .find({ queryKey: ["/guilds/42/loots"], exact: false })?.state.data,
  ).toBeDefined();
});
