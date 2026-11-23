// @vitest-environment happy-dom
import { authFetch } from "./startup-navigation.fetch.fixtures";
import {
  getLastOrganization,
  rememberOrganization,
} from "@/lib/last-organization";
import { expect, it, vi } from "vitest";
import { createNavigation, guildFor } from "./startup-navigation.fixtures";

it("remembers the last committed organization and restores it without fetching it twice", async () => {
  const firstVisit = createNavigation({ initialEntry: "/42" });
  await firstVisit.router.load();
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
  expect(router.state.location.pathname).toBe("/signin");

  await router.invalidate();
  expect(router.state.location.pathname).toBe("/42");
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
  await router.preloadRoute({ to: "/@me" });
  expect(getLastOrganization("user-1")).toBe("42");
  await router.navigate({ href: "/43" });
  expect(getLastOrganization("user-1")).toBe("43");
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
  await router.navigate({ href: "/42/timers" });
  finishRequest(Response.json(guildFor("43")));
  await canceledNavigation;
  expect(router.state.location.pathname).toBe("/42/timers");
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

it.each([
  "/@me",
  "/@me/settings/account",
  "/43/timers",
  "/battles/public-battle",
  "/init",
])("opens or reloads the direct destination %s", async (initialEntry) => {
  rememberOrganization("user-1", "42");
  const { router, requestCount } = createNavigation({ initialEntry });
  await router.load();
  expect(router.state.location.pathname).toBe(initialEntry);
  expect(requestCount("/guilds/42")).toBe(0);
});

it("remembers the personal panel as the last visited space", async () => {
  const organizationVisit = createNavigation({ initialEntry: "/42" });
  await organizationVisit.router.load();
  await organizationVisit.router.navigate({ href: "/@me/settings/account" });

  const reopened = createNavigation();
  await reopened.router.load();
  expect(reopened.router.state.location.pathname).toBe("/@me");
  expect(reopened.requestCount("/guilds/42")).toBe(0);
});

it("keeps the organization when a personal panel visit is superseded", async () => {
  let finishLoad: () => void = () => {
    throw new Error("Pending load was not initialized");
  };

  const personalPageLoader = vi.fn(
    () => new Promise<void>((resolve) => (finishLoad = resolve)),
  );

  const { router } = createNavigation({
    initialEntry: "/42",
    personalPageLoader,
  });

  await router.load();

  const supersededNavigation = router.navigate({
    href: "/@me/settings/account",
  });

  await vi.waitFor(() => expect(personalPageLoader).toHaveBeenCalled());
  await router.navigate({ href: "/battles/public-battle" });
  finishLoad();
  await supersededNavigation;
  expect(router.state.location.pathname).toBe("/battles/public-battle");
  expect(getLastOrganization("user-1")).toBe("42");
});

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
