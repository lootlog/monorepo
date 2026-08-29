import type { FC } from "react";
import {
  getRouteApi,
  useLocation,
  useMatches,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@lootlog/ui/components/breadcrumb";
import { ArrowLeft, Ellipsis } from "lucide-react";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { AnimatePresence, motion } from "framer-motion";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { getNavigationInfo } from "./get-navigation-info";
import {
  getMembersControllerGetGuildMembersQueryKey,
  useMembersControllerGetGuildMembers,
} from "@lootlog/api-client/react-query/main/members";
import {
  getRolesControllerGetGuildRolesQueryKey,
  useRolesControllerGetGuildRoles,
} from "@lootlog/api-client/react-query/main/roles";
import {
  getLootlogConfigControllerGetLootlogConfigQueryKey,
  useLootlogConfigControllerGetLootlogConfig,
} from "@lootlog/api-client/react-query/main/lootlog-config";
import {
  getDocsControllerGetDocumentQueryKey,
  useDocsControllerGetDocument,
} from "@lootlog/api-client/react-query/main/docs";

const guildRouteApi = getRouteApi("/_authenticated/$guildId");

const getBreadcrumbRouteFlags = ({
  guildId,
  eventId,
  memberId,
  roleId,
  npcId,
  docId,
  path,
}: {
  guildId?: string;
  eventId?: string;
  memberId?: string;
  roleId?: string;
  npcId?: string;
  docId?: string;
  path: string;
}) => {
  const isEventRoute = Boolean(eventId && guildId && path.includes("/events"));
  return {
    isEventRoute,
    isSettingsRoleRoute: Boolean(
      guildId && roleId && path.startsWith(`/${guildId}/settings/roles/`),
    ),
    isSettingsMemberRoute: Boolean(
      guildId && memberId && path.startsWith(`/${guildId}/settings/members/`),
    ),
    isSettingsNpcRoute: Boolean(
      guildId && npcId && path.startsWith(`/${guildId}/settings/npcs/`),
    ),
    isDocsDetailRoute: Boolean(
      guildId && docId && path.startsWith(`/${guildId}/docs/`),
    ),
    isEventMemberRoute: Boolean(
      memberId && path.includes("/members/") && isEventRoute,
    ),
  };
};

const useBreadcrumbLookupData = ({
  guildId,
  docId,
  isSettingsMemberRoute,
  isSettingsRoleRoute,
  isSettingsNpcRoute,
  isDocsDetailRoute,
}: {
  guildId?: string;
  docId?: string;
  isSettingsMemberRoute: boolean;
  isSettingsRoleRoute: boolean;
  isSettingsNpcRoute: boolean;
  isDocsDetailRoute: boolean;
}) => {
  const queryGuildId = guildId ?? "";
  const queryDocId = docId ?? "";
  const { data: settingsMembers } = useMembersControllerGetGuildMembers(
    { guildId: queryGuildId },
    { includeInactive: true },
    {
      query: {
        enabled: isSettingsMemberRoute,
        queryKey: getMembersControllerGetGuildMembersQueryKey(
          { guildId: queryGuildId },
          { includeInactive: true },
        ),
      },
    },
  );
  const { data: settingsRoles } = useRolesControllerGetGuildRoles(
    { guildId: queryGuildId },
    {
      query: {
        enabled: isSettingsRoleRoute,
        queryKey: getRolesControllerGetGuildRolesQueryKey({
          guildId: queryGuildId,
        }),
      },
    },
  );
  const { data: settingsLootlogConfig } =
    useLootlogConfigControllerGetLootlogConfig(
      { guildId: queryGuildId },
      {
        query: {
          enabled: isSettingsNpcRoute,
          queryKey: getLootlogConfigControllerGetLootlogConfigQueryKey({
            guildId: queryGuildId,
          }),
        },
      },
    );
  const { data: currentDocument } = useDocsControllerGetDocument(
    { guildId: queryGuildId, docId: queryDocId },
    {
      query: {
        enabled: isDocsDetailRoute,
        queryKey: getDocsControllerGetDocumentQueryKey({
          guildId: queryGuildId,
          docId: queryDocId,
        }),
      },
    },
  );
  return {
    settingsMembers,
    settingsRoles,
    settingsLootlogConfig,
    currentDocument,
  };
};

const getBreadcrumbVisibilityClassName = (
  index: number,
  breadcrumbsCount: number,
) => {
  if (index === breadcrumbsCount - 1) {
    return "flex min-w-0";
  }
  if (index === breadcrumbsCount - 2) {
    return "hidden shrink-0 sm:flex";
  }
  if (index === breadcrumbsCount - 3) {
    return "hidden shrink-0 xl:flex";
  }
  return "hidden shrink-0 2xl:flex";
};

export const GuildBreadcrumbs: FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const guildRouteData = guildRouteApi.useLoaderData();
  const eventRouteData = useMatches({
    select: (matches) =>
      matches.find(
        (match) =>
          match.routeId === "/_authenticated/$guildId/events_/$eventId_",
      )?.loaderData as
        | {
            event?: {
              name?: string;
              heroNpcs?: Array<{ id: string; npcName: string }>;
            };
            rankings?: Array<{ memberId: number; member?: { name?: string } }>;
          }
        | undefined,
  });
  const guild = guildRouteData?.guild;

  const {
    guildId,
    eventId,
    heroId,
    killId,
    memberId,
    npcId,
    reservationId,
    roleId,
    docId,
  } = params;
  const path = location.pathname;
  const routeFlags = getBreadcrumbRouteFlags({
    guildId,
    eventId,
    memberId,
    roleId,
    npcId,
    docId,
    path,
  });
  const {
    settingsMembers,
    settingsRoles,
    settingsLootlogConfig,
    currentDocument,
  } = useBreadcrumbLookupData({
    guildId,
    docId,
    isSettingsMemberRoute: routeFlags.isSettingsMemberRoute,
    isSettingsRoleRoute: routeFlags.isSettingsRoleRoute,
    isSettingsNpcRoute: routeFlags.isSettingsNpcRoute,
    isDocsDetailRoute: routeFlags.isDocsDetailRoute,
  });
  const resolveSettingsNpcName = () => {
    if (!routeFlags.isSettingsNpcRoute) {
      return undefined;
    }
    const settingsNpc = settingsLootlogConfig?.npcs?.find(
      (npc) => String(npc.id) === npcId,
    );
    return settingsNpc ? t(`npcType.${settingsNpc.npcType}`) : undefined;
  };
  const resolveNavigationInfo = () => {
    const event = routeFlags.isEventRoute ? eventRouteData?.event : undefined;
    const eventRankings = routeFlags.isEventMemberRoute
      ? (eventRouteData?.rankings ?? [])
      : [];
    const settingsMemberName = routeFlags.isSettingsMemberRoute
      ? settingsMembers?.find((member) => String(member.id) === memberId)?.name
      : undefined;
    const settingsRoleName = routeFlags.isSettingsRoleRoute
      ? settingsRoles?.find((role) => role.id === roleId)?.name
      : undefined;
    const settingsNpcName = resolveSettingsNpcName();

    return getNavigationInfo({
      path,
      params: {
        guildId,
        eventId,
        heroId,
        killId,
        memberId,
        npcId,
        reservationId,
        roleId,
        docId,
      },
      docTitle: routeFlags.isDocsDetailRoute
        ? currentDocument?.title
        : undefined,
      guildName: guild?.name,
      eventName: event?.name,
      eventHeroNpcs: event?.heroNpcs,
      eventRankings,
      settingsMemberName,
      settingsNpcName,
      settingsRoleName,
      t,
    });
  };
  const navInfo = resolveNavigationInfo();

  return (
    <AppTopBar>
      <div className="flex w-full min-w-0 flex-row items-center justify-between gap-2 overflow-hidden">
        <div className="flex min-w-0 shrink-0 flex-row gap-2 items-center">
          <SidebarTrigger className="size-8!" />
          {navInfo.showBack && navInfo.backPath && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: navInfo.backPath as string })}
              className="p-1 h-8 w-8 rounded-full hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Breadcrumb
          aria-label={t("common.breadcrumbs.navigationLabel")}
          className="min-w-0 max-w-full flex-1 overflow-hidden"
        >
          <BreadcrumbList className="flex-nowrap justify-center overflow-hidden px-1">
            <AnimatePresence mode="popLayout">
              {navInfo.breadcrumbs.length > 2 && (
                <motion.li
                  key="collapsed-breadcrumbs"
                  className={`mr-1.5 hidden size-6 shrink-0 items-center justify-center text-muted-foreground/50 sm:flex 2xl:hidden ${navInfo.breadcrumbs.length === 3 ? "xl:hidden" : ""}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  aria-hidden="true"
                >
                  <Ellipsis className="size-4" />
                </motion.li>
              )}
              {navInfo.breadcrumbs.map((crumb, index) => {
                const isLast = index === navInfo.breadcrumbs.length - 1;
                const visibilityClassName = getBreadcrumbVisibilityClassName(
                  index,
                  navInfo.breadcrumbs.length,
                );

                return (
                  <motion.li
                    key={`${crumb.label}-${crumb.path ?? "current"}`}
                    className={`${visibilityClassName} items-center`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {index > 0 && (
                      <span
                        className={`mx-1.5 select-none text-xs text-muted-foreground/30 ${isLast ? "hidden sm:inline" : ""}`}
                      >
                        /
                      </span>
                    )}
                    {crumb.path ? (
                      <BreadcrumbLink
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate({ to: crumb.path as string })
                            }
                          />
                        }
                        className="min-h-8 max-w-48 cursor-pointer truncate whitespace-nowrap rounded px-1 text-xs text-muted-foreground/70 transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background 2xl:max-w-56"
                        title={crumb.label}
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage
                        className="block min-w-0 truncate whitespace-nowrap text-sm font-bold text-foreground"
                        title={crumb.label}
                      >
                        {crumb.label}
                      </BreadcrumbPage>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </BreadcrumbList>
        </Breadcrumb>
        <div
          className={
            navInfo.showBack && navInfo.backPath ? "w-[4.5rem]" : "w-8"
          }
        />
      </div>
    </AppTopBar>
  );
};
