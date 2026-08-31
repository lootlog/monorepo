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
import { ArrowLeft } from "lucide-react";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { resolveAppNavigation } from "@/navigation/app-navigation";
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

export const GuildBreadcrumbs: FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const guildRouteData = guildRouteApi.useLoaderData();
  const matches = useMatches();
  const guild = guildRouteData?.guild;

  const { guildId, eventId, memberId, npcId, roleId, docId } = params;
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
    const settingsMemberName = routeFlags.isSettingsMemberRoute
      ? settingsMembers?.find((member) => String(member.id) === memberId)?.name
      : undefined;
    const settingsRoleName = routeFlags.isSettingsRoleRoute
      ? settingsRoles?.find((role) => role.id === roleId)?.name
      : undefined;
    const settingsNpcName = resolveSettingsNpcName();

    return resolveAppNavigation({
      matches,
      organizationName: guild?.name,
      currentEntityLabel:
        settingsMemberName ??
        settingsNpcName ??
        settingsRoleName ??
        (routeFlags.isDocsDetailRoute ? currentDocument?.title : undefined),
    });
  };
  const navInfo = resolveNavigationInfo();
  const parentPath = navInfo.parentPath;

  return (
    <AppTopBar>
      <div className="flex w-full min-w-0 flex-row items-center justify-between gap-2 overflow-hidden">
        <div className="flex min-w-0 shrink-0 flex-row gap-2 items-center">
          <SidebarTrigger className="size-8!" />
          {parentPath && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: parentPath })}
              className="p-1 h-8 w-8 rounded-full hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        <AppBreadcrumbs
          breadcrumbs={navInfo.breadcrumbs}
          onNavigate={(breadcrumbPath) => navigate({ to: breadcrumbPath })}
        />
        <div className={parentPath ? "w-[4.5rem]" : "w-8"} />
      </div>
    </AppTopBar>
  );
};
