import { maxBy } from "es-toolkit";
import type { TOptions } from "i18next";
import { Capability, type AccessPolicy } from "@lootlog/domain/access-policy";
import i18n from "@/i18n/config";
import { ROUTES } from "@/config/routes";
import type { Battle } from "@/lib/api/battlelog-types";
import { canReadGuildDocs } from "@/features/guild/docs/docs-permissions";
import { canViewHeroSightings } from "@/features/guild/hero-sightings/hero-sightings-permissions";

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** What the route adds to the breadcrumbs of every page it matches. */
    navigation?: RouteNavigation;
  }
}

const ROOT_ROUTE_ID = "__root__";

const USER_ROUTE_PREFIX = "/_authenticated/@me";

const ORGANIZATION_ROUTE_PREFIX = "/_authenticated/$guildId";

export type AppNavigationMatch = {
  routeId: string;
  pathname: string;
  params?: Record<string, string | undefined>;
  search?: unknown;
  status?: string;
  globalNotFound?: boolean;
  loaderData?: unknown;
  staticData?: { navigation?: RouteNavigation };
};

/** Search params a breadcrumb's page needs, such as the character it shows. */
type BreadcrumbSearch = Record<string, string>;

export type Breadcrumb = {
  label: string;
  path: string;
  search?: BreadcrumbSearch;
};

export type RouteNavigationContext = {
  t: (key: string, options?: TOptions) => string;
  /** The match of the route that declares the navigation. */
  match: AppNavigationMatch;
  /** The pathname of the parent route's match, which sibling pages extend. */
  parentPath: string;
  matches: readonly AppNavigationMatch[];
  currentBattle?: Battle;
  /** The name of the entity the page shows, looked up by the top bar. */
  currentEntityLabel?: string;
  organizationName?: string;
};

/**
 * A route's place in the page hierarchy. Parent routes name the pages above
 * it; a route whose parent is not its breadcrumb parent, such as a detail page
 * beside a list, names the missing pages as ancestors.
 */
export type RouteNavigation = (context: RouteNavigationContext) => {
  /** Pages above the route that its parent routes do not name, outermost first. */
  ancestors?: Breadcrumb[];
  /** The route's own breadcrumb, linking to the route below a deeper page. */
  label?: string;
  /** A tab beside its siblings: the page is titled by its section and has no way back. */
  tab?: boolean;
  /** What the document title names after the page, such as the Organization. */
  documentContext?: string;
};

export type AppNavigationItemId =
  | "user-dashboard"
  | "user-statistics"
  | "user-battles"
  | "user-notifications"
  | "user-settings"
  | "organization-loots"
  | "organization-timers"
  | "organization-hero-sightings"
  | "organization-reservations"
  | "organization-docs"
  | "organization-events"
  | "organization-stats"
  | "organization-activity"
  | "organization-notifications"
  | "organization-settings";

export type AppNavigationSidebarItem = {
  id: AppNavigationItemId;
  active: boolean;
  href: string;
  label: string;
  /** The label where space is tight, such as a tab bar. */
  shortLabel: string;
  /** Heading of the sidebar group the item belongs to; the first group has none. */
  group?: string;
  visible: boolean;
};

export type AppNavigationHeading = {
  title: string;
  /** The pages above this one, from the section down; tabs of a section have none. */
  trail: Breadcrumb[];
  /** The sidebar item the page belongs to, whose icon leads the heading. */
  section: AppNavigationItemId | null;
};

export type AppNavigation = {
  /** What the top bar names: the page title and, on a child page, its parent. */
  heading: AppNavigationHeading;
  documentTitle: string;
  sidebarItems: AppNavigationSidebarItem[];
};

type ResolveAppNavigationOptions = {
  matches: readonly AppNavigationMatch[];
  currentBattle?: Battle;
  currentEntityLabel?: string;
  organizationName?: string;
  accessPolicy?: AccessPolicy;
};

type RegistryItem = {
  id: AppNavigationItemId;
  labelKey: string;
  shortLabelKey?: string;
  groupKey?: string;
  path: string;
  visible: (accessPolicy: AccessPolicy | undefined) => boolean;
};

const alwaysVisible = () => true;

function buildUserSidebarRegistry(): RegistryItem[] {
  return [
    {
      id: "user-dashboard",
      labelKey: "layout.navigation.dashboard",
      path: ROUTES.user.dashboard,
      visible: alwaysVisible,
    },
    {
      id: "user-statistics",
      labelKey: "statistics.title",
      path: ROUTES.user.statistics,
      visible: alwaysVisible,
    },
    {
      id: "user-battles",
      labelKey: "layout.navigation.battlePanel",
      shortLabelKey: "layout.navigation.short.battles",
      path: ROUTES.user.battlePanel.base,
      visible: alwaysVisible,
    },
    {
      id: "user-notifications",
      labelKey: "layout.navigation.notifications",
      shortLabelKey: "layout.navigation.short.notifications",
      groupKey: "layout.navigation.groups.account",
      path: ROUTES.user.notifications.base,
      visible: alwaysVisible,
    },
    {
      id: "user-settings",
      labelKey: "layout.navigation.settings",
      groupKey: "layout.navigation.groups.account",
      path: ROUTES.user.settings.base,
      visible: alwaysVisible,
    },
  ];
}

function buildOrganizationSidebarRegistry(
  organizationId: string,
): RegistryItem[] {
  const canViewEvents = (accessPolicy: AccessPolicy | undefined) =>
    accessPolicy?.allowsAny([
      Capability.LOOTLOG_EVENTS_READ,
      Capability.LOOTLOG_EVENTS_MANAGE,
    ]) ?? false;

  const canManage = (accessPolicy: AccessPolicy | undefined) =>
    accessPolicy?.allows(Capability.ADMIN) ?? false;

  return [
    {
      id: "organization-loots",
      labelKey: "common.breadcrumbs.lootsList",
      shortLabelKey: "layout.navigation.short.loots",
      path: ROUTES.guild.base(organizationId),
      visible: (accessPolicy) =>
        accessPolicy?.allows(Capability.LOOTLOG_LOOTS_READ) ?? false,
    },
    {
      id: "organization-timers",
      labelKey: "layout.navigation.timers",
      path: ROUTES.guild.timers(organizationId),
      visible: (accessPolicy) =>
        accessPolicy?.allows(Capability.LOOTLOG_TIMERS_READ) ?? false,
    },
    {
      id: "organization-hero-sightings",
      labelKey: "heroSightings.title",
      shortLabelKey: "layout.navigation.short.heroSightings",
      path: ROUTES.guild.heroSightings(organizationId),
      visible: canViewHeroSightings,
    },
    {
      id: "organization-reservations",
      labelKey: "layout.navigation.reservations",
      path: ROUTES.guild.reservations.base(organizationId),
      visible: (accessPolicy) =>
        accessPolicy?.allows(Capability.LOOTLOG_RESERVATIONS_READ) ?? false,
    },
    {
      id: "organization-docs",
      labelKey: "layout.navigation.docs",
      path: ROUTES.guild.docs.base(organizationId),
      visible: canReadGuildDocs,
    },
    {
      id: "organization-events",
      labelKey: "layout.navigation.events",
      path: ROUTES.guild.events(organizationId),
      visible: canViewEvents,
    },
    {
      id: "organization-stats",
      labelKey: "layout.navigation.stats",
      path: ROUTES.guild.stats(organizationId),
      visible: (accessPolicy) =>
        accessPolicy?.allows(Capability.LOOTLOG_LOOTS_READ) ?? false,
    },
    {
      id: "organization-activity",
      labelKey: "layout.navigation.activityLogs",
      groupKey: "layout.navigation.groups.management",
      path: ROUTES.guild.activityLogs(organizationId),
      visible: canManage,
    },
    {
      id: "organization-notifications",
      labelKey: "layout.navigation.notifications",
      groupKey: "layout.navigation.groups.management",
      path: ROUTES.guild.notifications.base(organizationId),
      visible: canManage,
    },
    {
      id: "organization-settings",
      labelKey: "layout.navigation.settings",
      groupKey: "layout.navigation.groups.management",
      path: ROUTES.guild.settings.base(organizationId),
      visible: canManage,
    },
  ];
}

/**
 * The section an Organization opens on: the first sidebar entry the member
 * may see, so a member without loot access lands on reservations rather than
 * on a forbidden loot list. `null` when no section is visible.
 */
export function getOrganizationLandingItemId(
  organizationId: string,
  accessPolicy: AccessPolicy | undefined,
): AppNavigationItemId | null {
  const item = buildOrganizationSidebarRegistry(organizationId).find((entry) =>
    entry.visible(accessPolicy),
  );

  return item?.id ?? null;
}

/** How many sections a phone tab bar holds before "More". */
const TAB_BAR_TAB_COUNT = 4;

export type AppTabBarSections = {
  /** The first sections the member may see, in sidebar order. */
  tabs: AppNavigationSidebarItem[];
  /** Every other visible section, reached from "More". */
  overflow: AppNavigationSidebarItem[];
};

/**
 * Splits the visible sidebar sections between a phone tab bar and its "More"
 * entry, so the bar follows the sidebar's order and access policy.
 */
export function resolveTabBarSections(
  sidebarItems: readonly AppNavigationSidebarItem[],
): AppTabBarSections {
  const visible = sidebarItems.filter((item) => item.visible);

  return {
    tabs: visible.slice(0, TAB_BAR_TAB_COUNT),
    overflow: visible.slice(TAB_BAR_TAB_COUNT),
  };
}

/**
 * The sidebar sections behind a phone tab bar's "More": the sections that
 * already have a tab are hidden, so the sheet lists only what the bar lacks.
 */
export function hideTabBarSections(
  sidebarItems: readonly AppNavigationSidebarItem[],
): AppNavigationSidebarItem[] {
  const tabIds = new Set(
    resolveTabBarSections(sidebarItems).tabs.map((item) => item.id),
  );

  return sidebarItems.map((item) =>
    tabIds.has(item.id) ? { ...item, visible: false } : item,
  );
}

function t(key: string, options?: TOptions) {
  return i18n.t(key, options);
}

function getLastMatch(matches: readonly AppNavigationMatch[]) {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];

    if (match?.routeId !== ROOT_ROUTE_ID) return match;
  }
}

function normalizePath(path: string) {
  if (path.length <= 1) {
    return path;
  }

  return path.replace(/\/$/, "");
}

function formatDocumentTitle(title: string, context?: string) {
  const appName = t("common.documentTitle.appName");

  if (context && context !== title) {
    return t("common.documentTitle.contextTemplate", {
      appName,
      context,
      title,
    });
  }

  return t("common.documentTitle.template", { appName, title });
}

function resolveStatusTitle(matches: readonly AppNavigationMatch[]) {
  const lastMatch = getLastMatch(matches);

  if (lastMatch?.status === "notFound" || lastMatch?.globalNotFound) {
    return formatDocumentTitle(t("common.routeErrors.status.404.title"));
  }

  if (matches.some((match) => match.status === "error")) {
    return formatDocumentTitle(t("common.routeErrors.status.500.title"));
  }
}

function isPathActive(pathname: string, href: string) {
  const normalizedPathname = normalizePath(pathname);
  const normalizedHref = normalizePath(href);

  return (
    normalizedPathname === normalizedHref ||
    normalizedPathname.startsWith(`${normalizedHref}/`)
  );
}

function resolveSidebarItems(
  pathname: string,
  registry: readonly RegistryItem[],
  accessPolicy?: AccessPolicy,
): AppNavigationSidebarItem[] {
  const matchingItems = registry.filter((item) =>
    isPathActive(pathname, item.path),
  );

  const activeItem = maxBy(matchingItems, (item) => item.path.length);

  return registry.map((item) => ({
    id: item.id,
    active: item.id === activeItem?.id,
    href: item.path,
    label: t(item.labelKey),
    shortLabel: t(item.shortLabelKey ?? item.labelKey),
    group: item.groupKey && t(item.groupKey),
    visible: item.visible(accessPolicy),
  }));
}

/** The page's breadcrumbs, collected from the navigation of every matched route. */
function resolvePage(options: ResolveAppNavigationOptions) {
  const breadcrumbs: Breadcrumb[] = [];
  let tab = false;
  let documentContext: string | undefined;

  for (const [index, match] of options.matches.entries()) {
    const navigation = match.staticData?.navigation?.({
      ...options,
      t,
      match,
      parentPath: normalizePath(options.matches[index - 1]?.pathname ?? "/"),
    });

    if (!navigation) continue;

    const { ancestors = [], label } = navigation;

    breadcrumbs.push(...ancestors);

    if (label !== undefined) {
      breadcrumbs.push({ label, path: normalizePath(match.pathname) });
    }

    if (ancestors.length > 0 || label !== undefined) {
      tab = navigation.tab ?? false;
    }

    documentContext = navigation.documentContext ?? documentContext;
  }

  return { breadcrumbs, tab, documentContext };
}

/**
 * A section and its tabs share the section's title; a child page carries its
 * own title and returns to the page above it.
 */
function resolveHeading(
  { breadcrumbs, tab }: ReturnType<typeof resolvePage>,
  sidebarItems: readonly AppNavigationSidebarItem[],
): AppNavigationHeading {
  const section = sidebarItems.find((item) => item.active)?.id ?? null;
  const current = breadcrumbs[breadcrumbs.length - 1];

  if (tab || breadcrumbs.length < 2) {
    return { title: breadcrumbs[0]?.label ?? "", trail: [], section };
  }

  return {
    title: current?.label ?? "",
    trail: breadcrumbs.slice(0, -1),
    section,
  };
}

function createPublicNavigation(documentTitle: string): AppNavigation {
  return {
    heading: { title: documentTitle, trail: [], section: null },
    documentTitle,
    sidebarItems: [],
  };
}

function resolveScopedNavigation(
  page: ReturnType<typeof resolvePage>,
  documentContext: string | undefined,
  sidebarItems: AppNavigationSidebarItem[],
): AppNavigation {
  const current = page.breadcrumbs[page.breadcrumbs.length - 1];

  return {
    heading: resolveHeading(page, sidebarItems),
    documentTitle: formatDocumentTitle(
      current?.label ?? t("common.documentTitle.fallback"),
      documentContext,
    ),
    sidebarItems,
  };
}

function resolvePageNavigation(
  options: ResolveAppNavigationOptions,
  lastMatch: AppNavigationMatch,
): AppNavigation {
  const page = resolvePage(options);

  // A personal page is named after its section.
  if (lastMatch.routeId.startsWith(USER_ROUTE_PREFIX)) {
    return resolveScopedNavigation(
      page,
      page.breadcrumbs[0]?.label,
      resolveSidebarItems(lastMatch.pathname, buildUserSidebarRegistry()),
    );
  }

  const organizationId = lastMatch.params?.guildId;

  if (lastMatch.routeId.startsWith(ORGANIZATION_ROUTE_PREFIX)) {
    return resolveScopedNavigation(
      page,
      page.documentContext,
      organizationId
        ? resolveSidebarItems(
            lastMatch.pathname,
            buildOrganizationSidebarRegistry(organizationId),
            options.accessPolicy,
          )
        : [],
    );
  }

  const current = page.breadcrumbs[page.breadcrumbs.length - 1];

  return createPublicNavigation(
    formatDocumentTitle(current?.label ?? t("common.documentTitle.fallback")),
  );
}

export function resolveAppNavigation(
  options: ResolveAppNavigationOptions,
): AppNavigation {
  const statusTitle = resolveStatusTitle(options.matches);
  const lastMatch = getLastMatch(options.matches);

  if (!lastMatch) {
    return createPublicNavigation(
      statusTitle ?? t("common.documentTitle.appName"),
    );
  }

  const navigation = resolvePageNavigation(options, lastMatch);

  return statusTitle
    ? { ...navigation, documentTitle: statusTitle }
    : navigation;
}
