import {
  Capability,
  createAccessPolicy,
  type Capability as CapabilityName,
} from "@lootlog/domain/access-policy";
import { describe, expect, it } from "vitest";
import {
  resolveAppNavigation,
  type AppNavigationMatch,
} from "./app-navigation";

function createMatch(
  overrides: Partial<AppNavigationMatch>,
): AppNavigationMatch {
  return {
    params: {},
    pathname: "/",
    routeId: "__root__",
    status: "success",
    ...overrides,
  };
}

const policy = (...capabilities: CapabilityName[]) =>
  createAccessPolicy({ capabilities });

describe("resolveAppNavigation", () => {
  it("resolves one Organization hierarchy for breadcrumbs, title, parent, and sidebar", () => {
    const navigation = resolveAppNavigation({
      currentEntityLabel: "Alicja",
      matches: [
        createMatch({
          loaderData: { guild: { name: "Nocna Straż" } },
          params: { guildId: "guild-1" },
          pathname: "/guild-1",
          routeId: "/_authenticated/$guildId",
        }),
        createMatch({
          params: { guildId: "guild-1", memberId: "member-1" },
          pathname: "/guild-1/settings/members/member-1",
          routeId: "/_authenticated/$guildId/settings/members/$memberId",
        }),
      ],
      accessPolicy: policy(Capability.ADMIN),
    });

    expect(navigation.breadcrumbs).toEqual([
      { label: "Nocna Straż", path: "/guild-1" },
      { label: "Ustawienia", path: "/guild-1/settings" },
      { label: "Członkowie", path: "/guild-1/settings/members" },
      { label: "Alicja", path: null },
    ]);
    expect(navigation.parentPath).toBe("/guild-1/settings/members");
    expect(navigation.documentTitle).toBe("Alicja — Nocna Straż — Lootlog.pl");
    expect(
      navigation.sidebarItems.find(({ id }) => id === "organization-settings"),
    ).toMatchObject({ active: true, visible: true });
  });

  it("keeps scoped navigation when an Organization child route is in error", () => {
    const navigation = resolveAppNavigation({
      matches: [
        createMatch({
          loaderData: { guild: { name: "Nocna Straż" } },
          params: { guildId: "guild-1" },
          pathname: "/guild-1",
          routeId: "/_authenticated/$guildId",
        }),
        createMatch({
          params: { guildId: "guild-1" },
          pathname: "/guild-1/settings",
          routeId: "/_authenticated/$guildId/settings/",
          status: "error",
        }),
      ],
      accessPolicy: policy(Capability.ADMIN),
    });

    expect(navigation.scope).toBe("organization");
    expect(navigation.breadcrumbs).toEqual([
      { label: "Nocna Straż", path: "/guild-1" },
      { label: "Ustawienia", path: null },
    ]);
    expect(navigation.parentPath).toBe("/guild-1");
    expect(navigation.documentTitle).toBe("Wystąpił błąd — Lootlog.pl");
    expect(
      navigation.sidebarItems.find(({ id }) => id === "organization-settings"),
    ).toMatchObject({ active: true, visible: true });
  });

  it("uses a translated dynamic fallback immediately", () => {
    const navigation = resolveAppNavigation({
      matches: [
        createMatch({
          loaderData: { guild: { name: "Nocna Straż" } },
          params: { guildId: "guild-1" },
          pathname: "/guild-1",
          routeId: "/_authenticated/$guildId",
        }),
        createMatch({
          params: { guildId: "guild-1", roleId: "role-7" },
          pathname: "/guild-1/settings/roles/role-7",
          routeId: "/_authenticated/$guildId/settings/roles/$roleId",
        }),
      ],
      accessPolicy: policy(Capability.ADMIN),
    });

    expect(navigation.breadcrumbs[navigation.breadcrumbs.length - 1]).toEqual({
      label: "Rola #role-7",
      path: null,
    });
    expect(navigation.parentPath).toBe("/guild-1/settings/roles");
  });

  it("keeps the nearest parent for an unknown Organization subroute", () => {
    const navigation = resolveAppNavigation({
      matches: [
        createMatch({
          loaderData: { guild: { name: "Nocna Straż" } },
          params: { guildId: "guild-1" },
          pathname: "/guild-1",
          routeId: "/_authenticated/$guildId",
        }),
        createMatch({
          params: { guildId: "guild-1" },
          pathname: "/guild-1/settings/unknown",
          routeId: "/_authenticated/$guildId/settings/$",
        }),
      ],
      accessPolicy: policy(Capability.ADMIN),
    });

    expect(navigation.breadcrumbs).toEqual([
      { label: "Nocna Straż", path: "/guild-1" },
      { label: "Ustawienia", path: "/guild-1/settings" },
      { label: "Strona", path: null },
    ]);
    expect(navigation.parentPath).toBe("/guild-1/settings");
    expect(navigation.documentTitle).toBe("Strona — Nocna Straż — Lootlog.pl");
  });

  it.each([
    {
      breadcrumbs: [{ label: "Powiadomienia", path: null }],
      parentPath: "/guild-1",
      pathname: "/guild-1/notifications",
      routeId: "/_authenticated/$guildId/notifications/",
      title: "Powiadomienia — Nocna Straż — Lootlog.pl",
    },
    {
      breadcrumbs: [
        { label: "Powiadomienia", path: "/guild-1/notifications" },
        { label: "Nowa reguła", path: null },
      ],
      parentPath: "/guild-1/notifications",
      pathname: "/guild-1/notifications/create",
      routeId: "/_authenticated/$guildId/notifications/create",
      title: "Nowa reguła — Nocna Straż — Lootlog.pl",
    },
    {
      breadcrumbs: [
        { label: "Powiadomienia", path: "/guild-1/notifications" },
        { label: "Historia", path: null },
      ],
      parentPath: "/guild-1/notifications",
      pathname: "/guild-1/notifications/history",
      routeId: "/_authenticated/$guildId/notifications/history",
      title: "Historia — Nocna Straż — Lootlog.pl",
    },
    {
      breadcrumbs: [
        { label: "Powiadomienia", path: "/guild-1/notifications" },
        { label: "Edycja reguły", path: null },
      ],
      parentPath: "/guild-1/notifications",
      pathname: "/guild-1/notifications/rule-1",
      routeId: "/_authenticated/$guildId/notifications/$ruleId",
      title: "Edycja reguły — Nocna Straż — Lootlog.pl",
    },
  ])(
    "resolves the Organization notification hierarchy for $pathname",
    ({ breadcrumbs, parentPath, pathname, routeId, title }) => {
      const navigation = resolveAppNavigation({
        matches: [
          createMatch({
            loaderData: { guild: { name: "Nocna Straż" } },
            params: { guildId: "guild-1" },
            pathname: "/guild-1",
            routeId: "/_authenticated/$guildId",
          }),
          createMatch({
            params: { guildId: "guild-1", ruleId: "rule-1" },
            pathname,
            routeId,
          }),
        ],
        accessPolicy: policy(Capability.ADMIN),
      });

      expect(navigation.breadcrumbs).toEqual([
        { label: "Nocna Straż", path: "/guild-1" },
        ...breadcrumbs,
      ]);
      expect(navigation.parentPath).toBe(parentPath);
      expect(navigation.documentTitle).toBe(title);
      expect(
        navigation.sidebarItems.find(
          ({ id }) => id === "organization-notifications",
        ),
      ).toMatchObject({ active: true, visible: true });
    },
  );

  it("resolves personal navigation through the same seam", () => {
    const navigation = resolveAppNavigation({
      matches: [
        createMatch({
          pathname: "/@me/battle-panel/statistics/h2h",
          routeId: "/_authenticated/@me/battle-panel/statistics_/h2h",
        }),
      ],
    });

    expect(navigation.scope).toBe("user");
    expect(navigation.breadcrumbs).toEqual([
      { label: "Panel walk", path: "/@me/battle-panel" },
      { label: "Statystyki", path: "/@me/battle-panel/statistics" },
      { label: "Bilans H2H", path: null },
    ]);
    expect(navigation.parentPath).toBe("/@me/battle-panel/statistics");
    expect(navigation.documentTitle).toBe(
      "Bilans H2H — Panel walk — Lootlog.pl",
    );
    expect(
      navigation.sidebarItems.find(({ id }) => id === "user-battles"),
    ).toMatchObject({ active: true, visible: true });
  });

  it("derives Organization sidebar visibility from Access policy permissions", () => {
    const navigation = resolveAppNavigation({
      matches: [
        createMatch({
          params: { guildId: "guild-1" },
          pathname: "/guild-1/timers",
          routeId: "/_authenticated/$guildId/timers",
        }),
      ],
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
});
