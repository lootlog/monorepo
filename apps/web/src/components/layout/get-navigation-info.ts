import { ROUTES } from "@/config/routes";

export type Breadcrumb = {
  label: string;
  path: string | null;
};

export type NavigationInfo = {
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

export function getNavigationInfo(args: GetNavigationInfoArgs): NavigationInfo {
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
    fallback(guildName, t)
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
        { label: killId, path: null },
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
  const { params, settingsMemberName, settingsNpcName, settingsRoleName, t } =
    args;

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

  let backPath: string;
  if (path === routes.settings) {
    backPath = routes.base;
  } else if (path.startsWith(`${routes.notifications}/`)) {
    backPath = routes.notifications;
  } else if (path.startsWith(`${routes.settingsRoles}/`)) {
    backPath = routes.settingsRoles;
  } else if (path.startsWith(`${routes.settingsMembers}/`)) {
    backPath = routes.settingsMembers;
  } else if (path.startsWith(`${routes.settingsNpcs}/`)) {
    backPath = routes.settingsNpcs;
  } else if (path === routes.notifications) {
    backPath = routes.base;
  } else {
    backPath = routes.settings;
  }

  return { breadcrumbs, showBack: true, backPath };
}

function fallback(
  guildName: string | undefined,
  t: GetNavigationInfoArgs["t"],
): NavigationInfo {
  return {
    breadcrumbs: [
      { label: guildName ?? t("common.breadcrumbs.guild"), path: null },
    ],
    showBack: false,
  };
}
