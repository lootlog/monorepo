import {
  Capability,
  createAccessPolicy,
  type Capability as CapabilityName,
} from "@lootlog/domain/access-policy";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import type { Battle } from "@/lib/api/battlelog-types";
import {
  createBattle as buildBattle,
  createBattleWarrior,
} from "@/lib/testing/battle";
import { routeTree } from "../routeTree.gen";
import {
  getOrganizationLandingItemId,
  hideTabBarSections,
  resolveAppNavigation,
  resolveTabBarSections,
} from "./app-navigation";

const router = createRouter({
  routeTree,
  history: createMemoryHistory(),
  context: { queryClient: new QueryClient() },
});

type RouteId = keyof typeof router.routesById;

/** What the loaders that navigation reads return, in the parts it reads. */
type LoaderData = {
  guild?: { name: string };
  event?: { name: string; heroNpcs: { id: number; npcName: string }[] };
  rankings?: [];
  document?: { title: string };
  battle?: Battle;
};

type PageState = {
  /** Loader data by route, as the router stores it on each match. */
  loaderData?: Partial<Record<RouteId, LoaderData>>;
  /** Match status by route; every other match has loaded. */
  status?: Partial<Record<RouteId, "error" | "notFound">>;
};

/** The router's matches for a URL, as the app resolves its navigation from them. */
function matchPage(
  href: string,
  { loaderData = {}, status = {} }: PageState = {},
) {
  const url = new URL(href, "https://lootlog.test");

  return router
    .matchRoutes(url.pathname, Object.fromEntries(url.searchParams))
    .map((match) => ({
      ...match,
      loaderData: loaderData[match.routeId],
      status: status[match.routeId] ?? "success",
    }));
}

const organization: PageState["loaderData"] = {
  "/_authenticated/$guildId": { guild: { name: "Nocna Straż" } },
};

const policy = (...capabilities: CapabilityName[]) =>
  createAccessPolicy({ capabilities });

function createDuelBattle(id: string): Battle {
  return buildBattle({
    id,
    type: "1v1",
    warriors: [
      createBattleWarrior({ name: "gorilla banana", team: 1 }),
      createBattleWarrior({ name: "imbi woj", team: 2 }),
    ],
  });
}

describe("resolveAppNavigation", () => {
  it("names every routed page instead of falling back to the app name", () => {
    const pages = Object.values(router.routesById).filter(
      (route) => !route.children && route.options.component,
    );

    const unnamed = pages
      .map((route) => route.fullPath.replaceAll(/\$(\w+)/g, "$1-1"))
      .filter(
        (path) =>
          resolveAppNavigation({ matches: matchPage(path) }).documentTitle ===
          "Lootlog - Lootlog.pl",
      );

    expect(pages.length).toBeGreaterThan(50);
    expect(unnamed).toEqual([]);
  });

  it("separates personal statistics from dashboard and battle navigation", () => {
    const navigation = resolveAppNavigation({
      matches: matchPage("/@me/statistics"),
    });

    expect(navigation.heading).toEqual({
      title: "Statystyki",
      trail: [],
      section: "user-statistics",
    });
    expect(navigation.documentTitle).toBe("Statystyki - Lootlog.pl");
  });

  it("resolves one Organization hierarchy for heading, title, and sidebar", () => {
    const navigation = resolveAppNavigation({
      currentEntityLabel: "Alicja",
      matches: matchPage("/guild-1/settings/members/member-1", {
        loaderData: organization,
      }),
      accessPolicy: policy(Capability.ADMIN),
    });

    // The sidebar names the Organization, so the top bar starts below it.
    expect(navigation.heading).toEqual({
      title: "Alicja",
      trail: [
        { label: "Ustawienia", path: "/guild-1/settings" },
        { label: "Członkowie", path: "/guild-1/settings/members" },
      ],
      section: "organization-settings",
    });
    expect(navigation.documentTitle).toBe("Alicja - Nocna Straż - Lootlog.pl");
    expect(
      navigation.sidebarItems.find(({ id }) => id === "organization-settings"),
    ).toMatchObject({ active: true, visible: true });
  });

  it("titles a section's tab by the section, with no way back to a sibling", () => {
    const navigation = resolveAppNavigation({
      matches: matchPage("/guild-1/stats/kills", { loaderData: organization }),
      accessPolicy: policy(Capability.ADMIN),
    });

    expect(navigation.heading).toEqual({
      title: "Statystyki",
      trail: [],
      section: "organization-stats",
    });
    expect(navigation.documentTitle).toBe(
      "Statystyki bić - Nocna Straż - Lootlog.pl",
    );
  });

  it("keeps scoped navigation when an Organization child route is in error", () => {
    const navigation = resolveAppNavigation({
      matches: matchPage("/guild-1/settings", {
        loaderData: organization,
        status: { "/_authenticated/$guildId/settings/": "error" },
      }),
      accessPolicy: policy(Capability.ADMIN),
    });

    expect(navigation.heading).toEqual({
      title: "Ustawienia",
      trail: [],
      section: "organization-settings",
    });
    expect(navigation.documentTitle).toBe("Wystąpił błąd - Lootlog.pl");
  });

  it("uses a translated dynamic fallback immediately", () => {
    const navigation = resolveAppNavigation({
      matches: matchPage("/guild-1/settings/roles/role-7", {
        loaderData: organization,
      }),
      accessPolicy: policy(Capability.ADMIN),
    });

    expect(navigation.heading.title).toBe("Rola #role-7");
    expect(
      navigation.heading.trail[navigation.heading.trail.length - 1]?.path,
    ).toBe("/guild-1/settings/roles");
  });

  it.each([
    {
      href: "/guild-1/notifications",
      heading: { title: "Powiadomienia", trail: [] },
      title: "Powiadomienia - Nocna Straż - Lootlog.pl",
    },
    {
      href: "/guild-1/notifications/create",
      heading: {
        title: "Nowa reguła",
        trail: [{ label: "Powiadomienia", path: "/guild-1/notifications" }],
      },
      title: "Nowa reguła - Nocna Straż - Lootlog.pl",
    },
    {
      href: "/guild-1/notifications/history",
      heading: { title: "Powiadomienia", trail: [] },
      title: "Historia - Nocna Straż - Lootlog.pl",
    },
    {
      href: "/guild-1/notifications/channels",
      heading: { title: "Powiadomienia", trail: [] },
      title: "Kanały - Nocna Straż - Lootlog.pl",
    },
    {
      href: "/guild-1/notifications/rule-1",
      heading: {
        title: "Edycja reguły",
        trail: [{ label: "Powiadomienia", path: "/guild-1/notifications" }],
      },
      title: "Edycja reguły - Nocna Straż - Lootlog.pl",
    },
  ])(
    "resolves the Organization notification hierarchy for $href",
    ({ href, heading, title }) => {
      const navigation = resolveAppNavigation({
        matches: matchPage(href, { loaderData: organization }),
        accessPolicy: policy(Capability.ADMIN),
      });

      expect(navigation.heading).toEqual({
        ...heading,
        section: "organization-notifications",
      });
      expect(navigation.documentTitle).toBe(title);
    },
  );

  it("names event pages after the event and returns through its hierarchy", () => {
    const navigation = resolveAppNavigation({
      matches: matchPage("/guild-1/events/event-1/heroes/7/kills", {
        loaderData: {
          ...organization,
          "/_authenticated/$guildId/events_/$eventId_": {
            event: {
              name: "Letni event",
              heroNpcs: [{ id: 7, npcName: "Kic" }],
            },
            rankings: [],
          },
        },
      }),
    });

    expect(navigation.heading.trail).toEqual([
      { label: "Eventy", path: "/guild-1/events" },
      { label: "Letni event", path: "/guild-1/events/event-1" },
      { label: "Kic", path: "/guild-1/events/event-1/heroes/7" },
    ]);
    expect(navigation.documentTitle).toBe(
      "Historia bić - Letni event - Lootlog.pl",
    );
  });

  it("resolves personal navigation through the same seam", () => {
    const navigation = resolveAppNavigation({
      matches: matchPage("/@me/battle-panel/statistics/player-vs-player/1/2"),
    });

    expect(navigation.heading).toEqual({
      title: "Gracz vs Gracz",
      trail: [
        { label: "Panel walk", path: "/@me/battle-panel" },
        { label: "Przeciwnicy", path: "/@me/battle-panel/opponents" },
      ],
      section: "user-battles",
    });
    expect(navigation.documentTitle).toBe(
      "Gracz vs Gracz - Panel walk - Lootlog.pl",
    );
  });

  it("returns a head-to-head opened from an Abyss season to that season", () => {
    const navigation = resolveAppNavigation({
      matches: matchPage(
        "/@me/battle-panel/statistics/player-vs-player/1/2?characterId=1&seasonId=abyss-10-20",
      ),
    });

    expect(navigation.heading.trail).toContainEqual({
      label: "Sezon",
      path: "/@me/battle-panel/abyss/abyss-10-20/opponents",
      search: { characterId: "1" },
    });
  });

  it.each([
    {
      name: "loader battle",
      loaderData: { battle: createDuelBattle("battle-1") },
      currentBattle: undefined,
      battleId: "battle-1",
      title: "gorilla banana vs imbi woj - Panel walk - Lootlog.pl",
    },
    {
      name: "cached battle",
      loaderData: undefined,
      currentBattle: createDuelBattle("battle-1"),
      battleId: "battle-1",
      title: "gorilla banana vs imbi woj - Panel walk - Lootlog.pl",
    },
    {
      name: "stale loader battle",
      loaderData: { battle: createDuelBattle("battle-1") },
      currentBattle: undefined,
      battleId: "battle-2",
      title: "Walka #battle-2 - Panel walk - Lootlog.pl",
    },
    {
      name: "stale cached battle",
      loaderData: undefined,
      currentBattle: createDuelBattle("battle-1"),
      battleId: "battle-2",
      title: "Walka #battle-2 - Panel walk - Lootlog.pl",
    },
  ])(
    "titles a battle from its $name",
    ({ loaderData, currentBattle, battleId, title }) => {
      const navigation = resolveAppNavigation({
        currentBattle,
        matches: matchPage(`/@me/battle-panel/battles/${battleId}`, {
          loaderData: {
            "/_authenticated/@me/battle-panel/battles_/$battleId": loaderData,
          },
        }),
      });

      expect(navigation.documentTitle).toBe(title);
      expect(navigation.heading.trail).toEqual([
        { label: "Panel walk", path: "/@me/battle-panel" },
      ]);
    },
  );

  it("titles an Organization document from its loader", () => {
    expect(
      resolveAppNavigation({
        matches: matchPage("/guild-1/docs/doc-1", {
          loaderData: {
            ...organization,
            "/_authenticated/$guildId/docs/$docId": {
              document: { title: "Zasady tytanów" },
            },
          },
        }),
      }).documentTitle,
    ).toBe("Zasady tytanów - Nocna Straż - Lootlog.pl");
  });

  it.each([
    { href: "/signin", title: "Logowanie - Lootlog.pl" },
    {
      href: "/guild-1/reservations/",
      title: "Rezerwacje - Nocna Straż - Lootlog.pl",
    },
    {
      href: "/guild-1/stats/members/123",
      title: "Członek #123 - Nocna Straż - Lootlog.pl",
    },
  ])("titles $href", ({ href, title }) => {
    expect(
      resolveAppNavigation({
        matches: matchPage(href, { loaderData: organization }),
      }).documentTitle,
    ).toBe(title);
  });

  it("uses the not found title for not found route matches", () => {
    expect(
      resolveAppNavigation({
        matches: matchPage("/guild-1/timers", {
          status: { "/_authenticated/$guildId/timers": "notFound" },
        }),
      }).documentTitle,
    ).toBe("Nie znaleziono strony - Lootlog.pl");
  });

  it("derives Organization sidebar visibility from Access policy permissions", () => {
    const navigation = resolveAppNavigation({
      matches: matchPage("/guild-1/timers"),
      accessPolicy: policy(Capability.LOOTLOG_TIMERS_READ),
    });

    expect(
      navigation.sidebarItems.find(({ id }) => id === "organization-timers"),
    ).toMatchObject({ active: true, visible: true });
    expect(
      navigation.sidebarItems.find(({ id }) => id === "organization-loots"),
    ).toMatchObject({ label: "Lista łupów", visible: false });
    expect(
      navigation.sidebarItems.find(({ id }) => id === "organization-settings"),
    ).toMatchObject({ visible: false });
  });

  it("fills the phone tab bar with the sections a member may see, the rest under More", () => {
    const sectionIds = (accessPolicy: ReturnType<typeof policy>) => {
      const { sidebarItems } = resolveAppNavigation({
        matches: matchPage("/guild-1/reservations"),
        accessPolicy,
      });

      const { tabs, overflow } = resolveTabBarSections(sidebarItems);

      // The More sheet lists exactly what the bar has no tab for.
      expect(
        hideTabBarSections(sidebarItems)
          .filter(({ visible }) => visible)
          .map(({ id }) => id),
      ).toEqual(overflow.map(({ id }) => id));

      return {
        tabs: tabs.map(({ id }) => id),
        overflow: overflow.map(({ id }) => id),
      };
    };

    expect(
      sectionIds(
        policy(
          Capability.LOOTLOG_TIMERS_READ,
          Capability.LOOTLOG_RESERVATIONS_READ,
          Capability.LOOTLOG_EVENTS_READ,
        ),
      ),
    ).toEqual({
      tabs: [
        "organization-timers",
        "organization-reservations",
        "organization-events",
      ],
      overflow: [],
    });

    expect(
      sectionIds(
        policy(
          Capability.LOOTLOG_LOOTS_READ,
          Capability.LOOTLOG_TIMERS_READ,
          Capability.LOOTLOG_TIMERS_HEROES_READ,
          Capability.LOOTLOG_RESERVATIONS_READ,
          Capability.LOOTLOG_DOCS_READ,
        ),
      ),
    ).toEqual({
      tabs: [
        "organization-loots",
        "organization-timers",
        "organization-hero-sightings",
        "organization-reservations",
      ],
      overflow: ["organization-docs", "organization-stats"],
    });
  });

  it("lands a member without loot access on the first section they may read", () => {
    expect(
      getOrganizationLandingItemId(
        "org",
        policy(Capability.LOOTLOG_ACCESS, Capability.LOOTLOG_RESERVATIONS_READ),
      ),
    ).toBe("organization-reservations");
    expect(
      getOrganizationLandingItemId(
        "org",
        policy(Capability.LOOTLOG_LOOTS_READ, Capability.LOOTLOG_TIMERS_READ),
      ),
    ).toBe("organization-loots");
    expect(getOrganizationLandingItemId("org", policy())).toBeNull();
  });
});
