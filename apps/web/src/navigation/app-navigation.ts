import i18n from "@/i18n/config";
import { ROUTES } from "@/config/routes";
import type { Battle } from "@/lib/api/battlelog-types";
import { getBattleRouteLabel } from "@/lib/battle/battle-route-label";
import { canReadGuildDocs } from "@/features/guild/docs/docs-permissions";

const ROOT_ROUTE_ID = "__root__";
const USER_ROUTE_PREFIX = "/_authenticated/@me";
const ORGANIZATION_ROUTE_PREFIX = "/_authenticated/$guildId";

export type AppNavigationMatch = {
  routeId: string;
  pathname: string;
  params?: Record<string, string | undefined>;
  status?: string;
  globalNotFound?: boolean;
  loaderData?: unknown;
};

export type AppNavigationItemId =
  | "user-dashboard"
  | "user-battles"
  | "user-notifications"
  | "user-settings"
  | "organization-loots"
  | "organization-timers"
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
  visible: boolean;
};

export type AppNavigation = {
  scope: "organization" | "public" | "user";
  breadcrumbs: Breadcrumb[];
  documentTitle: string;
  parentPath: string | null;
  sidebarItems: AppNavigationSidebarItem[];
};

type ResolveAppNavigationOptions = {
  matches: readonly AppNavigationMatch[];
  currentBattle?: Battle;
  currentEntityLabel?: string;
  organizationName?: string;
  permissions?: readonly string[];
};

type OrganizationRouteLoaderData = {
  guild?: { name?: string };
};

type EventRouteLoaderData = {
  event?: {
    name?: string;
    heroNpcs?: Array<{ id: number | string; npcName: string }>;
  };
  rankings?: Array<{ memberId: number; member?: { name?: string } }>;
};

type DocumentRouteLoaderData = {
  document?: { title?: string };
};

type RegistryItem = {
  id: AppNavigationItemId;
  labelKey: string;
  path: string;
  visible: (permissions: readonly string[] | undefined) => boolean;
};

const alwaysVisible = () => true;

function t(key: string, options?: Record<string, unknown>) {
  return i18n.t(key, options);
}

function getLastMatch(matches: readonly AppNavigationMatch[]) {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    if (match?.routeId !== ROOT_ROUTE_ID) return match;
  }
}

function getMatchByRouteId(
  matches: readonly AppNavigationMatch[],
  routeId: string,
) {
  return matches.find((match) => match.routeId === routeId);
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

function getCurrentBreadcrumb(breadcrumbs: readonly Breadcrumb[]) {
  for (let index = breadcrumbs.length - 1; index >= 0; index -= 1) {
    const breadcrumb = breadcrumbs[index];
    if (breadcrumb && breadcrumb.path === null) return breadcrumb;
  }
  return breadcrumbs[breadcrumbs.length - 1];
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

function resolvePublicTitle(lastMatch: AppNavigationMatch) {
  if (lastMatch.routeId === "/signin") {
    return formatDocumentTitle(t("common.documentTitle.signin"));
  }
  if (lastMatch.routeId === "/init") {
    return formatDocumentTitle(t("common.documentTitle.init"));
  }
  if (lastMatch.routeId === "/battles/$id") {
    return formatDocumentTitle(
      t("common.documentTitle.publicBattle", { id: lastMatch.params?.id }),
    );
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
  permissions?: readonly string[],
): AppNavigationSidebarItem[] {
  const matchingItems = registry.filter((item) =>
    isPathActive(pathname, item.path),
  );
  const activeItem = matchingItems.sort(
    (left, right) => right.path.length - left.path.length,
  )[0];

  return registry.map((item) => ({
    id: item.id,
    active: item.id === activeItem?.id,
    href: item.path,
    label: t(item.labelKey),
    visible: item.visible(permissions),
  }));
}

function buildUserSidebarRegistry(): RegistryItem[] {
  return [
    {
      id: "user-dashboard",
      labelKey: "layout.navigation.dashboard",
      path: ROUTES.user.dashboard,
      visible: alwaysVisible,
    },
    {
      id: "user-battles",
      labelKey: "layout.navigation.battlePanel",
      path: ROUTES.user.battlePanel.base,
      visible: alwaysVisible,
    },
    {
      id: "user-notifications",
      labelKey: "layout.navigation.notifications",
      path: ROUTES.user.notifications.base,
      visible: alwaysVisible,
    },
    {
      id: "user-settings",
      labelKey: "layout.navigation.settings",
      path: ROUTES.user.settings.base,
      visible: alwaysVisible,
    },
  ];
}

function buildOrganizationSidebarRegistry(
  organizationId: string,
): RegistryItem[] {
  const has = (permissions: readonly string[] | undefined, value: string) =>
    Boolean(permissions?.includes(value) || permissions?.includes("OWNER"));
  const canViewEvents = (permissions: readonly string[] | undefined) =>
    has(permissions, "LOOTLOG_EVENTS_READ") ||
    has(permissions, "LOOTLOG_EVENTS_MANAGE");
  const canManage = (permissions: readonly string[] | undefined) =>
    Boolean(permissions?.includes("ADMIN") || permissions?.includes("OWNER"));

  return [
    {
      id: "organization-loots",
      labelKey: "common.breadcrumbs.lootsList",
      path: ROUTES.guild.base(organizationId),
      visible: (permissions) => has(permissions, "LOOTLOG_LOOTS_READ"),
    },
    {
      id: "organization-timers",
      labelKey: "layout.navigation.timers",
      path: ROUTES.guild.timers(organizationId),
      visible: (permissions) => has(permissions, "LOOTLOG_TIMERS_READ"),
    },
    {
      id: "organization-reservations",
      labelKey: "layout.navigation.reservations",
      path: ROUTES.guild.reservations.base(organizationId),
      visible: (permissions) => has(permissions, "LOOTLOG_RESERVATIONS_READ"),
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
      visible: (permissions) => has(permissions, "LOOTLOG_LOOTS_READ"),
    },
    {
      id: "organization-activity",
      labelKey: "layout.navigation.activityLogs",
      path: ROUTES.guild.activityLogs(organizationId),
      visible: canManage,
    },
    {
      id: "organization-notifications",
      labelKey: "layout.navigation.notifications",
      path: ROUTES.guild.notifications.base(organizationId),
      visible: canManage,
    },
    {
      id: "organization-settings",
      labelKey: "layout.navigation.settings",
      path: ROUTES.guild.settings.base(organizationId),
      visible: canManage,
    },
  ];
}

type Breadcrumb = {
  label: string;
  path: string | null;
};

type NavigationInfo = {
  breadcrumbs: Breadcrumb[];
  showBack: boolean;
  backPath?: string;
};

type NavigationParams = {
  guildId?: string;
  eventId?: string;
  heroId?: string;
  killId?: string;
  reservationId?: string;
  docId?: string;
  roleId?: string;
  memberId?: string;
  npcId?: string;
};

type GetNavigationInfoArgs = {
  path: string;
  params: NavigationParams;
  guildName?: string;
  eventName?: string;
  eventHeroNpcs?: Array<{ id: string; npcName: string }>;
  eventRankings: Array<{ memberId: number; member?: { name?: string } }>;
  settingsRoleName?: string;
  docTitle?: string;
  settingsMemberName?: string;
  settingsNpcName?: string;
  npcKillersData?: { npc?: { npcName?: string } | null };
  memberKillsData?: { member?: { memberName?: string } | null };
  t: (key: string, options?: Record<string, unknown>) => string;
};

function navigationInfo(
  breadcrumbs: Breadcrumb[],
  parentPath: string | null,
): NavigationInfo {
  return {
    breadcrumbs,
    showBack: parentPath !== null,
    ...(parentPath === null ? {} : { backPath: parentPath }),
  };
}

function resolveUserNavigationInfo(
  pathValue: string,
  battleLabel?: string,
): NavigationInfo {
  const path = normalizePath(pathValue);
  const battlePanel = {
    label: t("layout.navigation.battlePanel"),
    path: ROUTES.user.battlePanel.base,
  };

  if (path === ROUTES.user.dashboard) {
    return navigationInfo(
      [{ label: t("layout.navigation.dashboard"), path: null }],
      null,
    );
  }
  if (path === ROUTES.user.reservations) {
    return navigationInfo(
      [
        {
          label: t("layout.navigation.dashboard"),
          path: ROUTES.user.dashboard,
        },
        { label: t("layout.navigation.myReservations"), path: null },
      ],
      ROUTES.user.dashboard,
    );
  }
  if (path === ROUTES.user.battlePanel.base) {
    return navigationInfo([{ ...battlePanel, path: null }], null);
  }
  if (path === ROUTES.user.battlePanel.statistics) {
    return navigationInfo(
      [battlePanel, { label: t("layout.breadcrumbs.statistics"), path: null }],
      battlePanel.path,
    );
  }
  if (path === ROUTES.user.battlePanel.abyss) {
    return navigationInfo(
      [battlePanel, { label: t("layout.breadcrumbs.abyss"), path: null }],
      battlePanel.path,
    );
  }
  if (path === ROUTES.user.battlePanel.h2h) {
    return navigationInfo(
      [
        battlePanel,
        {
          label: t("layout.breadcrumbs.statistics"),
          path: ROUTES.user.battlePanel.statistics,
        },
        { label: t("layout.breadcrumbs.headToHead"), path: null },
      ],
      ROUTES.user.battlePanel.statistics,
    );
  }
  if (path === ROUTES.user.battlePanel.matchmakingH2h) {
    return navigationInfo(
      [
        battlePanel,
        {
          label: t("layout.breadcrumbs.abyss"),
          path: ROUTES.user.battlePanel.abyss,
        },
        { label: t("layout.breadcrumbs.abyssHeadToHead"), path: null },
      ],
      ROUTES.user.battlePanel.abyss,
    );
  }
  if (
    path.startsWith(`${ROUTES.user.battlePanel.statistics}/player-vs-player/`)
  ) {
    return navigationInfo(
      [
        battlePanel,
        {
          label: t("layout.breadcrumbs.statistics"),
          path: ROUTES.user.battlePanel.statistics,
        },
        { label: t("layout.breadcrumbs.playerVsPlayer"), path: null },
      ],
      ROUTES.user.battlePanel.statistics,
    );
  }

  const battleDetailsPath = `${ROUTES.user.battlePanel.base}/battles`;
  if (path.startsWith(`${battleDetailsPath}/`)) {
    const pathSegments = path.split("/");
    const battleId = pathSegments[pathSegments.length - 1];
    if (battleId) {
      return navigationInfo(
        [
          battlePanel,
          {
            label: t("layout.breadcrumbs.battles"),
            path: ROUTES.user.battlePanel.base,
          },
          {
            label:
              battleLabel ??
              t("battlePanel.navigation.battleFallback", { id: battleId }),
            path: null,
          },
        ],
        ROUTES.user.battlePanel.base,
      );
    }
  }

  const settingsRoutes = [
    [ROUTES.user.settings.account, "settings.account.title"],
    [ROUTES.user.settings.appearance, "settings.appearance.title"],
    [ROUTES.user.settings.servers, "settings.servers.title"],
  ] as const;
  const settingsRoute = settingsRoutes.find(
    ([routePath]) => path === routePath,
  );
  if (settingsRoute) {
    return navigationInfo(
      [
        {
          label: t("layout.navigation.settings"),
          path: ROUTES.user.settings.base,
        },
        { label: t(settingsRoute[1]), path: null },
      ],
      ROUTES.user.settings.base,
    );
  }
  if (path === ROUTES.user.settings.base) {
    return navigationInfo(
      [{ label: t("layout.navigation.settings"), path: null }],
      null,
    );
  }
  if (path.startsWith(`${ROUTES.user.settings.base}/`)) {
    return navigationInfo(
      [
        {
          label: t("layout.navigation.settings"),
          path: ROUTES.user.settings.base,
        },
        { label: t("common.breadcrumbs.page"), path: null },
      ],
      ROUTES.user.settings.base,
    );
  }
  if (path === ROUTES.user.notifications.base) {
    return navigationInfo(
      [{ label: t("layout.navigation.notifications"), path: null }],
      null,
    );
  }
  if (path.startsWith(`${ROUTES.user.notifications.base}/`)) {
    return navigationInfo(
      [
        {
          label: t("layout.navigation.notifications"),
          path: ROUTES.user.notifications.base,
        },
        { label: t("common.breadcrumbs.page"), path: null },
      ],
      ROUTES.user.notifications.base,
    );
  }
  if (path === "/@me/kills") {
    return navigationInfo(
      [
        {
          label: t("layout.navigation.dashboard"),
          path: ROUTES.user.dashboard,
        },
        { label: t("layout.breadcrumbs.npcRanking"), path: null },
      ],
      ROUTES.user.dashboard,
    );
  }

  return navigationInfo(
    [
      { label: t("layout.navigation.dashboard"), path: ROUTES.user.dashboard },
      { label: t("common.breadcrumbs.page"), path: null },
    ],
    ROUTES.user.dashboard,
  );
}

function resolveDocumentContext(
  navigationInfoValue: NavigationInfo,
  context?: string,
) {
  const title =
    getCurrentBreadcrumb(navigationInfoValue.breadcrumbs)?.label ??
    t("common.documentTitle.fallback");
  return formatDocumentTitle(title, context);
}

function createPublicNavigation(documentTitle: string): AppNavigation {
  return {
    scope: "public",
    breadcrumbs: [],
    documentTitle,
    parentPath: null,
    sidebarItems: [],
  };
}

function resolveUserAppNavigation(
  lastMatch: AppNavigationMatch,
  currentBattle?: Battle,
): AppNavigation {
  const userNavigation = resolveUserNavigationInfo(
    lastMatch.pathname,
    getBattleRouteLabel(lastMatch, t, { currentBattle }),
  );
  return {
    scope: "user",
    breadcrumbs: userNavigation.breadcrumbs,
    documentTitle: resolveDocumentContext(
      userNavigation,
      userNavigation.breadcrumbs[0]?.label,
    ),
    parentPath: userNavigation.backPath ?? null,
    sidebarItems: resolveSidebarItems(
      lastMatch.pathname,
      buildUserSidebarRegistry(),
    ),
  };
}

function createMissingOrganizationNavigation(): AppNavigation {
  const fallbackLabel = t("common.breadcrumbs.guild");
  return {
    scope: "organization",
    breadcrumbs: [{ label: fallbackLabel, path: null }],
    documentTitle: formatDocumentTitle(fallbackLabel),
    parentPath: null,
    sidebarItems: [],
  };
}

function getOrganizationLoaderContext(matches: readonly AppNavigationMatch[]) {
  const organization = getMatchByRouteId(matches, "/_authenticated/$guildId")
    ?.loaderData as OrganizationRouteLoaderData | undefined;
  const event = getMatchByRouteId(
    matches,
    "/_authenticated/$guildId/events_/$eventId_",
  )?.loaderData as EventRouteLoaderData | undefined;
  const document = getMatchByRouteId(
    matches,
    "/_authenticated/$guildId/docs/$docId",
  )?.loaderData as DocumentRouteLoaderData | undefined;

  return { organization, event, document };
}

function resolveCurrentDocumentTitle(options: {
  currentEntityLabel?: string;
  loaderTitle?: string;
  organizationId: string;
  pathname: string;
}) {
  if (options.loaderTitle) return options.loaderTitle;
  const documentsPath = `${ROUTES.guild.docs.base(options.organizationId)}/`;
  if (options.pathname.startsWith(documentsPath)) {
    return options.currentEntityLabel;
  }
}

function createCurrentEntityData(currentEntityLabel?: string) {
  if (!currentEntityLabel) return {};
  return {
    memberKillsData: { member: { memberName: currentEntityLabel } },
    npcKillersData: { npc: { npcName: currentEntityLabel } },
  };
}

function resolveOrganizationAppNavigation(
  options: ResolveAppNavigationOptions,
  lastMatch: AppNavigationMatch,
): AppNavigation {
  const { matches, currentEntityLabel, organizationName, permissions } =
    options;
  const params = lastMatch.params ?? {};
  const organizationId = params.guildId;
  if (!organizationId) {
    return createMissingOrganizationNavigation();
  }

  const loaderContext = getOrganizationLoaderContext(matches);
  const resolvedOrganizationName =
    organizationName ?? loaderContext.organization?.guild?.name;
  const eventHeroNpcs = loaderContext.event?.event?.heroNpcs?.map((hero) => ({
    id: String(hero.id),
    npcName: hero.npcName,
  }));
  const organizationNavigation = getNavigationInfo({
    path: lastMatch.pathname,
    params,
    guildName: resolvedOrganizationName,
    eventName: loaderContext.event?.event?.name,
    eventHeroNpcs,
    eventRankings: loaderContext.event?.rankings ?? [],
    docTitle: resolveCurrentDocumentTitle({
      currentEntityLabel,
      loaderTitle: loaderContext.document?.document?.title,
      organizationId,
      pathname: lastMatch.pathname,
    }),
    settingsMemberName: currentEntityLabel,
    settingsNpcName: currentEntityLabel,
    settingsRoleName: currentEntityLabel,
    ...createCurrentEntityData(currentEntityLabel),
    t,
  });
  const documentContext =
    loaderContext.event?.event?.name ?? resolvedOrganizationName;

  return {
    scope: "organization",
    breadcrumbs: organizationNavigation.breadcrumbs,
    documentTitle: resolveDocumentContext(
      organizationNavigation,
      documentContext,
    ),
    parentPath: organizationNavigation.backPath ?? null,
    sidebarItems: resolveSidebarItems(
      lastMatch.pathname,
      buildOrganizationSidebarRegistry(organizationId),
      permissions,
    ),
  };
}

export function resolveAppNavigation(
  options: ResolveAppNavigationOptions,
): AppNavigation {
  const { matches, currentBattle } = options;
  const statusTitle = resolveStatusTitle(matches);
  const lastMatch = getLastMatch(matches);

  if (!lastMatch) {
    return createPublicNavigation(
      statusTitle ?? t("common.documentTitle.appName"),
    );
  }
  const publicTitle = resolvePublicTitle(lastMatch);
  if (statusTitle || publicTitle) {
    return createPublicNavigation(statusTitle ?? publicTitle ?? "");
  }
  if (lastMatch.routeId.startsWith(USER_ROUTE_PREFIX)) {
    return resolveUserAppNavigation(lastMatch, currentBattle);
  }
  if (lastMatch.routeId.startsWith(ORGANIZATION_ROUTE_PREFIX)) {
    return resolveOrganizationAppNavigation(options, lastMatch);
  }
  return createPublicNavigation(
    formatDocumentTitle(t("common.documentTitle.fallback")),
  );
}

function getNavigationInfo(args: GetNavigationInfoArgs): NavigationInfo {
  const { params, guildName, t } = args;
  const path = normalizePath(args.path);
  const { guildId } = params;

  if (!guildId) {
    return {
      breadcrumbs: [
        { label: guildName ?? t("common.breadcrumbs.guild"), path: null },
      ],
      showBack: false,
    };
  }

  const routes = buildRoutes(guildId);
  const guildBreadcrumb: Breadcrumb = {
    label: guildName ?? t("common.breadcrumbs.guild"),
    path: routes.base,
  };

  return (
    resolveSimpleRoute(path, routes, guildBreadcrumb, t, args) ??
    resolveStatsRoute(path, routes, guildBreadcrumb, args) ??
    resolveEventRoutes(path, routes, guildBreadcrumb, args) ??
    resolveSettingsRoutes(path, routes, guildBreadcrumb, args) ??
    fallback(path, routes, guildBreadcrumb, t)
  );
}

function buildRoutes(guildId: string) {
  return {
    base: ROUTES.guild.base(guildId),
    timers: ROUTES.guild.timers(guildId),
    reservations: ROUTES.guild.reservations.base(guildId),
    docs: ROUTES.guild.docs.base(guildId),
    stats: ROUTES.guild.stats(guildId),
    statsKills: ROUTES.guild.statsKills(guildId),
    statsLoots: ROUTES.guild.statsLoots(guildId),
    statsRanking: `${ROUTES.guild.stats(guildId)}/ranking`,
    statsNpcs: `${ROUTES.guild.stats(guildId)}/npcs`,
    notifications: ROUTES.guild.notifications.base(guildId),
    settings: ROUTES.guild.settings.base(guildId),
    settingsRoles: ROUTES.guild.settings.roles(guildId),
    settingsMembers: ROUTES.guild.settings.members(guildId),
    settingsNpcs: ROUTES.guild.settings.npcs(guildId),
    settingsMapTemplates: ROUTES.guild.settings.mapTemplates(guildId),
    settingsReservations: ROUTES.guild.settings.reservationsSettings(guildId),
    activityLogs: ROUTES.guild.activityLogs(guildId),
    events: ROUTES.guild.events(guildId),
  };
}

type Routes = ReturnType<typeof buildRoutes>;

function normalizePath(path: string) {
  if (path.length <= 1) {
    return path;
  }

  return path.replace(/\/$/, "");
}

function resolveSimpleRoute(
  path: string,
  routes: Routes,
  guildBreadcrumb: Breadcrumb,
  t: GetNavigationInfoArgs["t"],
  args: GetNavigationInfoArgs,
): NavigationInfo | null {
  if (path === routes.base) {
    return {
      breadcrumbs: [{ label: t("common.breadcrumbs.lootsList"), path: null }],
      showBack: false,
    };
  }

  const simpleRoutes: Array<{
    path: string;
    label: string;
    backPath: string;
  }> = [
    {
      path: routes.timers,
      label: t("common.breadcrumbs.timers"),
      backPath: routes.base,
    },
    {
      path: routes.reservations,
      label: t("common.breadcrumbs.reservations"),
      backPath: routes.base,
    },
    {
      path: routes.docs,
      label: t("common.breadcrumbs.docs"),
      backPath: routes.base,
    },
    {
      path: routes.activityLogs,
      label: t("common.breadcrumbs.activityLogs"),
      backPath: routes.base,
    },
    {
      path: routes.stats,
      label: t("common.breadcrumbs.stats"),
      backPath: routes.base,
    },
    {
      path: routes.statsKills,
      label: t("common.stats.kills"),
      backPath: routes.stats,
    },
    {
      path: routes.statsLoots,
      label: t("common.stats.loots"),
      backPath: routes.stats,
    },
    {
      path: routes.events,
      label: t("common.breadcrumbs.events"),
      backPath: routes.base,
    },
    {
      path: routes.statsRanking,
      label: t("common.breadcrumbs.memberRanking"),
      backPath: routes.stats,
    },
    {
      path: routes.statsNpcs,
      label: t("common.breadcrumbs.npcs"),
      backPath: routes.stats,
    },
    {
      path: `${routes.events}/create`,
      label: t("common.breadcrumbs.newEvent"),
      backPath: routes.events,
    },
  ];

  for (const route of simpleRoutes) {
    if (path !== route.path) continue;

    const breadcrumbs: Breadcrumb[] = [guildBreadcrumb];

    if (route.backPath !== routes.base) {
      const parentRoute = simpleRoutes.find((r) => r.path === route.backPath);
      if (parentRoute) {
        breadcrumbs.push({
          label: parentRoute.label,
          path: parentRoute.path,
        });
      }
    }

    breadcrumbs.push({ label: route.label, path: null });

    return {
      breadcrumbs,
      showBack: true,
      backPath: route.backPath,
    };
  }

  if (path.startsWith(routes.reservations) && path !== routes.reservations) {
    const { reservationId } = args.params;
    return {
      breadcrumbs: [
        guildBreadcrumb,
        {
          label: t("common.breadcrumbs.reservations"),
          path: routes.reservations,
        },
        {
          label: reservationId
            ? reservationId.charAt(0).toUpperCase() + reservationId.slice(1)
            : (reservationId ?? ""),
          path: null,
        },
      ],
      showBack: true,
      backPath: routes.reservations,
    };
  }

  if (path.startsWith(routes.docs) && path !== routes.docs) {
    const { docId } = args.params;

    return {
      breadcrumbs: [
        guildBreadcrumb,
        {
          label: t("common.breadcrumbs.docs"),
          path: routes.docs,
        },
        {
          label:
            args.docTitle ?? t("common.breadcrumbs.docFallback", { id: docId }),
          path: null,
        },
      ],
      showBack: true,
      backPath: routes.docs,
    };
  }

  return null;
}

function resolveStatsRoute(
  path: string,
  routes: Routes,
  guildBreadcrumb: Breadcrumb,
  args: GetNavigationInfoArgs,
): NavigationInfo | null {
  const { params, npcKillersData, memberKillsData, t } = args;

  if (path.startsWith(`${routes.stats}/npcs/`)) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.stats"), path: routes.stats },
        { label: t("common.breadcrumbs.npcs"), path: routes.statsNpcs },
        {
          label:
            npcKillersData?.npc?.npcName ??
            t("common.breadcrumbs.npcFallback", { id: params.npcId }),
          path: null,
        },
      ],
      showBack: true,
      backPath: routes.statsNpcs,
    };
  }

  if (path.startsWith(`${routes.stats}/members/`)) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.stats"), path: routes.stats },
        {
          label: t("common.breadcrumbs.memberRanking"),
          path: routes.statsRanking,
        },
        {
          label:
            memberKillsData?.member?.memberName ??
            t("common.breadcrumbs.memberFallback", { id: params.memberId }),
          path: null,
        },
      ],
      showBack: true,
      backPath: routes.statsRanking,
    };
  }

  return null;
}

function resolveEventRoutes(
  path: string,
  routes: Routes,
  guildBreadcrumb: Breadcrumb,
  args: GetNavigationInfoArgs,
): NavigationInfo | null {
  const { params, eventName, eventHeroNpcs, eventRankings, t } = args;
  const { eventId, heroId, killId } = params;

  if (!eventId || !path.startsWith(routes.events)) return null;

  const eventDetail = `${routes.events}/${eventId}`;
  const eventRanking = `${eventDetail}/ranking`;
  const eventCoordination = `${eventDetail}/coordination`;
  const eventBreadcrumb: Breadcrumb = {
    label: eventName ?? t("common.breadcrumbs.event"),
    path: eventDetail,
  };

  const findHeroName = () =>
    eventHeroNpcs?.find((h) => h.id === heroId)?.npcName ??
    t("common.breadcrumbs.hero");

  if (path === `${eventDetail}/kills`) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.events"), path: routes.events },
        eventBreadcrumb,
        { label: t("common.breadcrumbs.killHistory"), path: null },
      ],
      showBack: true,
      backPath: eventDetail,
    };
  }

  if (params.memberId && path === `${eventDetail}/members/${params.memberId}`) {
    const selectedMemberRanking = eventRankings.find(
      (ranking) => String(ranking.memberId) === params.memberId,
    );
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.events"), path: routes.events },
        eventBreadcrumb,
        { label: t("common.breadcrumbs.ranking"), path: eventRanking },
        {
          label:
            selectedMemberRanking?.member?.name ??
            t("common.breadcrumbs.memberFallback", { id: params.memberId }),
          path: null,
        },
      ],
      showBack: true,
      backPath: eventRanking,
    };
  }

  if (heroId && path === `${eventDetail}/heroes/${heroId}/kills`) {
    const heroPath = `${eventDetail}/heroes/${heroId}`;
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.events"), path: routes.events },
        eventBreadcrumb,
        { label: findHeroName(), path: heroPath },
        { label: t("common.breadcrumbs.killHistory"), path: null },
      ],
      showBack: true,
      backPath: heroPath,
    };
  }

  if (killId && path.includes("/kills/")) {
    const heroPath = `${eventDetail}/heroes/${heroId}`;
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.events"), path: routes.events },
        eventBreadcrumb,
        { label: findHeroName(), path: heroPath },
        { label: t("events.killDetail.title"), path: null },
      ],
      showBack: true,
      backPath: heroPath,
    };
  }

  if (heroId && path.includes("/heroes/")) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.events"), path: routes.events },
        eventBreadcrumb,
        { label: findHeroName(), path: null },
      ],
      showBack: true,
      backPath: eventDetail,
    };
  }

  if (path === eventRanking) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.events"), path: routes.events },
        eventBreadcrumb,
        { label: t("common.breadcrumbs.ranking"), path: null },
      ],
      showBack: true,
      backPath: eventDetail,
    };
  }

  if (path === eventCoordination) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.events"), path: routes.events },
        eventBreadcrumb,
        { label: t("common.breadcrumbs.coordination"), path: null },
      ],
      showBack: true,
      backPath: eventDetail,
    };
  }

  return {
    breadcrumbs: [
      guildBreadcrumb,
      { label: t("common.breadcrumbs.events"), path: routes.events },
      {
        label: eventName ?? t("common.breadcrumbs.event"),
        path: null,
      },
    ],
    showBack: true,
    backPath: routes.events,
  };
}

function resolveSettingsRoutes(
  path: string,
  routes: Routes,
  guildBreadcrumb: Breadcrumb,
  args: GetNavigationInfoArgs,
): NavigationInfo | null {
  const { t } = args;

  if (!path.startsWith(routes.settings)) return null;

  const settingsBreadcrumb: Breadcrumb = {
    label: t("common.breadcrumbs.settings"),
    path: routes.settings,
  };

  const breadcrumbs: Breadcrumb[] = [guildBreadcrumb];

  if (path === routes.settings) {
    breadcrumbs.push({
      label: t("common.breadcrumbs.settings"),
      path: null,
    });
    return { breadcrumbs, showBack: true, backPath: routes.base };
  }

  breadcrumbs.push(settingsBreadcrumb);

  const breadcrumbsBeforeLeaf = breadcrumbs.length;
  appendSettingsRouteBreadcrumbs(path, routes, breadcrumbs, args);

  if (breadcrumbs.length === breadcrumbsBeforeLeaf) {
    breadcrumbs.push({ label: t("common.breadcrumbs.page"), path: null });
  }

  return {
    breadcrumbs,
    showBack: true,
    backPath: getSettingsBackPath(path, routes),
  };
}

function appendSettingsRouteBreadcrumbs(
  path: string,
  routes: Routes,
  breadcrumbs: Breadcrumb[],
  args: GetNavigationInfoArgs,
): void {
  const { params, settingsMemberName, settingsNpcName, settingsRoleName, t } =
    args;

  if (path === routes.settingsRoles) {
    breadcrumbs.push({ label: t("common.breadcrumbs.roles"), path: null });
  } else if (path.startsWith(`${routes.settingsRoles}/`)) {
    breadcrumbs.push({
      label: t("common.breadcrumbs.roles"),
      path: routes.settingsRoles,
    });
    breadcrumbs.push({
      label:
        settingsRoleName ??
        t("common.breadcrumbs.roleFallback", { id: params.roleId }),
      path: null,
    });
  } else if (path === routes.settingsMembers) {
    breadcrumbs.push({ label: t("common.breadcrumbs.members"), path: null });
  } else if (path.startsWith(`${routes.settingsMembers}/`)) {
    breadcrumbs.push({
      label: t("common.breadcrumbs.members"),
      path: routes.settingsMembers,
    });
    breadcrumbs.push({
      label:
        settingsMemberName ??
        t("common.breadcrumbs.memberFallback", { id: params.memberId }),
      path: null,
    });
  } else if (path === routes.settingsNpcs) {
    breadcrumbs.push({
      label: t("common.breadcrumbs.settingsNpcs"),
      path: null,
    });
  } else if (path.startsWith(`${routes.settingsNpcs}/`)) {
    breadcrumbs.push({
      label: t("common.breadcrumbs.settingsNpcs"),
      path: routes.settingsNpcs,
    });
    breadcrumbs.push({
      label:
        settingsNpcName ??
        t("common.breadcrumbs.npcFallback", { id: params.npcId }),
      path: null,
    });
  } else if (path === routes.settingsMapTemplates) {
    breadcrumbs.push({
      label: t("common.breadcrumbs.mapTemplates"),
      path: null,
    });
  } else if (path === routes.settingsReservations) {
    breadcrumbs.push({
      label: t("common.breadcrumbs.reservations"),
      path: null,
    });
  } else if (path === routes.notifications) {
    breadcrumbs.push({
      label: t("common.breadcrumbs.notifications"),
      path: null,
    });
  } else if (path === `${routes.notifications}/create`) {
    breadcrumbs.push({
      label: t("common.breadcrumbs.notifications"),
      path: routes.notifications,
    });
    breadcrumbs.push({
      label: t("common.breadcrumbs.notificationCreate"),
      path: null,
    });
  } else if (path === `${routes.notifications}/history`) {
    breadcrumbs.push({
      label: t("common.breadcrumbs.notifications"),
      path: routes.notifications,
    });
    breadcrumbs.push({
      label: t("common.breadcrumbs.notificationHistory"),
      path: null,
    });
  } else if (path.startsWith(`${routes.notifications}/`)) {
    breadcrumbs.push({
      label: t("common.breadcrumbs.notifications"),
      path: routes.notifications,
    });
    breadcrumbs.push({
      label: t("common.breadcrumbs.notificationEdit"),
      path: null,
    });
  } else if (path === `${routes.settings}/info`) {
    breadcrumbs.push({ label: t("common.breadcrumbs.info"), path: null });
  }
}

function getSettingsBackPath(path: string, routes: Routes): string {
  if (path === routes.settings) return routes.base;
  if (path.startsWith(`${routes.notifications}/`)) return routes.notifications;
  if (path.startsWith(`${routes.settingsRoles}/`)) return routes.settingsRoles;
  if (path.startsWith(`${routes.settingsMembers}/`)) {
    return routes.settingsMembers;
  }
  if (path.startsWith(`${routes.settingsNpcs}/`)) return routes.settingsNpcs;
  if (path === routes.notifications) return routes.base;
  return routes.settings;
}

function fallback(
  path: string,
  routes: Routes,
  guildBreadcrumb: Breadcrumb,
  t: GetNavigationInfoArgs["t"],
): NavigationInfo {
  const nearestParent = [
    { label: t("common.breadcrumbs.stats"), path: routes.stats },
    { label: t("common.breadcrumbs.events"), path: routes.events },
    { label: t("common.breadcrumbs.docs"), path: routes.docs },
    { label: t("common.breadcrumbs.reservations"), path: routes.reservations },
    { label: t("common.breadcrumbs.settings"), path: routes.settings },
  ]
    .filter((candidate) => path.startsWith(`${candidate.path}/`))
    .sort((left, right) => right.path.length - left.path.length)[0];

  if (nearestParent) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        nearestParent,
        { label: t("common.breadcrumbs.page"), path: null },
      ],
      showBack: true,
      backPath: nearestParent.path,
    };
  }

  return {
    breadcrumbs: [
      guildBreadcrumb,
      { label: t("common.breadcrumbs.page"), path: null },
    ],
    showBack: true,
    backPath: routes.base,
  };
}
