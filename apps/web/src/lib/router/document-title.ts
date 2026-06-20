import i18n from "@/i18n/config";
import { getNavigationInfo } from "@/components/layout/get-navigation-info";
import { getUserNavigationInfo } from "@/components/layout/get-user-navigation-info";
import type { Breadcrumb } from "@/components/layout/get-navigation-info";
import { getBattleRouteLabel } from "@/lib/battle/battle-route-label";

export type DocumentTitleMatch = {
  routeId: string;
  pathname: string;
  params?: Record<string, string | undefined>;
  status?: string;
  globalNotFound?: boolean;
  loaderData?: unknown;
};

type ResolveDocumentTitleOptions = {
  guildName?: string;
};

type GuildRouteLoaderData = {
  guild?: {
    name?: string;
  };
};

type EventRouteLoaderData = {
  event?: {
    name?: string;
    heroNpcs?: Array<{
      id: number | string;
      npcName: string;
    }>;
  };
  rankings?: Array<{
    memberId: number;
    member?: {
      name?: string;
    };
  }>;
};

const ROOT_ROUTE_ID = "__root__";
const GUILD_ROUTE_ID = "/_authenticated/$guildId";
const EVENT_ROUTE_ID = "/_authenticated/$guildId/events_/$eventId_";
const USER_ROUTE_PREFIX = "/_authenticated/@me";
const GUILD_ROUTE_PREFIX = "/_authenticated/$guildId";
const FALLBACK_ID_PATTERN = /#\S+/;

function t(key: string, options?: Record<string, unknown>) {
  return i18n.t(key, options);
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

  return t("common.documentTitle.template", {
    appName,
    title,
  });
}

function getLastMatch(matches: readonly DocumentTitleMatch[]) {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];

    if (!match) {
      continue;
    }

    if (match.routeId !== ROOT_ROUTE_ID) {
      return match;
    }
  }
}

function getMatchByRouteId(
  matches: readonly DocumentTitleMatch[],
  routeId: string,
) {
  return matches.find((match) => match.routeId === routeId);
}

function getPathname(match: DocumentTitleMatch | undefined) {
  return match?.pathname ?? "/";
}

function hasRouteStatus(
  matches: readonly DocumentTitleMatch[],
  status: string,
) {
  return matches.some((match) => match.status === status);
}

function getStatusTitle(matches: readonly DocumentTitleMatch[]) {
  const lastMatch = getLastMatch(matches);

  if (lastMatch?.status === "notFound" || lastMatch?.globalNotFound) {
    return formatDocumentTitle(t("common.routeErrors.status.404.title"));
  }

  if (hasRouteStatus(matches, "error")) {
    return formatDocumentTitle(t("common.routeErrors.status.500.title"));
  }
}

function getRouteParams(match: DocumentTitleMatch | undefined) {
  return match?.params ?? {};
}

function getPublicRouteTitle(lastMatch: DocumentTitleMatch) {
  const params = getRouteParams(lastMatch);

  if (lastMatch.routeId === "/signin") {
    return formatDocumentTitle(t("common.documentTitle.signin"));
  }

  if (lastMatch.routeId === "/init") {
    return formatDocumentTitle(t("common.documentTitle.init"));
  }

  if (lastMatch.routeId === "/battles/$id") {
    return formatDocumentTitle(
      t("common.documentTitle.publicBattle", { id: params.id }),
    );
  }
}

function getCurrentBreadcrumb(breadcrumbs: Breadcrumb[]) {
  for (let index = breadcrumbs.length - 1; index >= 0; index -= 1) {
    const breadcrumb = breadcrumbs[index];

    if (!breadcrumb) {
      continue;
    }

    if (!breadcrumb.path) {
      return breadcrumb;
    }
  }

  return breadcrumbs[breadcrumbs.length - 1];
}

function getUserRouteTitle(lastMatch: DocumentTitleMatch) {
  const navigationInfo = getUserNavigationInfo({
    battleLabel: getBattleRouteLabel(lastMatch, t),
    path: getPathname(lastMatch),
    t,
  });
  const currentBreadcrumb = getCurrentBreadcrumb(navigationInfo.breadcrumbs);
  const sectionBreadcrumb = navigationInfo.breadcrumbs[0];

  if (!currentBreadcrumb) {
    return formatDocumentTitle(t("layout.navigation.dashboard"));
  }

  if (
    sectionBreadcrumb &&
    sectionBreadcrumb.label !== currentBreadcrumb.label
  ) {
    return formatDocumentTitle(
      currentBreadcrumb.label,
      sectionBreadcrumb.label,
    );
  }

  return formatDocumentTitle(currentBreadcrumb.label);
}

function getGuildName(
  matches: readonly DocumentTitleMatch[],
  options: ResolveDocumentTitleOptions,
) {
  if (options.guildName) {
    return options.guildName;
  }

  const guildLoaderData = getMatchByRouteId(matches, GUILD_ROUTE_ID)
    ?.loaderData as GuildRouteLoaderData | undefined;

  return guildLoaderData?.guild?.name;
}

function getEventRouteData(matches: readonly DocumentTitleMatch[]) {
  const eventLoaderData = getMatchByRouteId(matches, EVENT_ROUTE_ID)
    ?.loaderData as EventRouteLoaderData | undefined;
  const eventHeroNpcs = eventLoaderData?.event?.heroNpcs?.map((hero) => ({
    id: String(hero.id),
    npcName: hero.npcName,
  }));

  return {
    eventHeroNpcs,
    eventName: eventLoaderData?.event?.name,
    eventRankings: eventLoaderData?.rankings ?? [],
  };
}

function shouldUseGuildContext(title: string, guildName?: string) {
  if (!guildName || title === guildName) {
    return false;
  }

  return !FALLBACK_ID_PATTERN.test(title);
}

function getGuildRouteTitle(
  matches: readonly DocumentTitleMatch[],
  lastMatch: DocumentTitleMatch,
  options: ResolveDocumentTitleOptions,
) {
  const params = getRouteParams(lastMatch);
  const guildName = getGuildName(matches, options);
  const eventData = getEventRouteData(matches);
  const navigationInfo = getNavigationInfo({
    path: getPathname(lastMatch),
    params: {
      eventId: params.eventId,
      guildId: params.guildId,
      heroId: params.heroId,
      killId: params.killId,
      memberId: params.memberId,
      npcId: params.npcId,
      reservationId: params.reservationId,
      roleId: params.roleId,
    },
    eventHeroNpcs: eventData.eventHeroNpcs,
    eventName: eventData.eventName,
    eventRankings: eventData.eventRankings,
    guildName,
    t,
  });
  const currentBreadcrumb = getCurrentBreadcrumb(navigationInfo.breadcrumbs);
  const title =
    currentBreadcrumb?.label ?? guildName ?? t("common.breadcrumbs.guild");

  if (eventData.eventName) {
    if (title === eventData.eventName) {
      return formatDocumentTitle(title);
    }

    return formatDocumentTitle(title, eventData.eventName);
  }

  if (shouldUseGuildContext(title, guildName)) {
    return formatDocumentTitle(title, guildName);
  }

  return formatDocumentTitle(title);
}

export function resolveDocumentTitle(
  matches: readonly DocumentTitleMatch[],
  options: ResolveDocumentTitleOptions = {},
): string {
  const statusTitle = getStatusTitle(matches);

  if (statusTitle) {
    return statusTitle;
  }

  const lastMatch = getLastMatch(matches);

  if (!lastMatch) {
    return t("common.documentTitle.appName");
  }

  const publicRouteTitle = getPublicRouteTitle(lastMatch);

  if (publicRouteTitle) {
    return publicRouteTitle;
  }

  if (lastMatch.routeId.startsWith(USER_ROUTE_PREFIX)) {
    return getUserRouteTitle(lastMatch);
  }

  if (lastMatch.routeId.startsWith(GUILD_ROUTE_PREFIX)) {
    return getGuildRouteTitle(matches, lastMatch, options);
  }

  return formatDocumentTitle(t("common.documentTitle.fallback"));
}
