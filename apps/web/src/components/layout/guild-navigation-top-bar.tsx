import { useContext, type FC, type Ref } from "react";
import {
  getRouteApi,
  useLocation,
  useMatches,
  useParams,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { GuildSearchContext } from "@/contexts/guild-search-context";
import { AppNavigationTopBar } from "./app-navigation-top-bar";
import { GuildSearchButton } from "./guild-search-button";
import { resolveAppNavigation } from "@/navigation/app-navigation";
import {
  useMembersControllerGetGuildMembers,
  useRolesControllerGetGuildRoles,
  useLootlogConfigControllerGetLootlogConfig,
  useDocsControllerGetDocument,
  useListReservationSpots,
} from "@lootlog/client/main";

const guildRouteApi = getRouteApi("/_authenticated/$guildId");

const getBreadcrumbRouteFlags = ({
  guildId,
  memberId,
  roleId,
  npcId,
  docId,
  reservationId,
  path,
}: {
  guildId?: string;
  memberId?: string;
  roleId?: string;
  npcId?: string;
  docId?: string;
  reservationId?: string;
  path: string;
}) => {
  return {
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
    isReservationSpotRoute: Boolean(
      guildId && reservationId && path.startsWith(`/${guildId}/reservations/`),
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
  isReservationSpotRoute,
}: {
  guildId?: string;
  docId?: string;
  isSettingsMemberRoute: boolean;
  isSettingsRoleRoute: boolean;
  isSettingsNpcRoute: boolean;
  isDocsDetailRoute: boolean;
  isReservationSpotRoute: boolean;
}) => {
  const queryGuildId = guildId ?? "";
  const queryDocId = docId ?? "";

  const { data: settingsMembers } = useMembersControllerGetGuildMembers(
    { guildId: queryGuildId },
    { includeInactive: true },
    { query: { enabled: isSettingsMemberRoute } },
  );

  const { data: settingsRoles } = useRolesControllerGetGuildRoles(
    { guildId: queryGuildId },
    { query: { enabled: isSettingsRoleRoute } },
  );

  const { data: settingsLootlogConfig } =
    useLootlogConfigControllerGetLootlogConfig(
      { guildId: queryGuildId },
      { query: { enabled: isSettingsNpcRoute } },
    );

  const { data: currentDocument } = useDocsControllerGetDocument(
    { guildId: queryGuildId, docId: queryDocId },
    { query: { enabled: isDocsDetailRoute } },
  );

  const { data: reservationSpots } = useListReservationSpots(
    { guildId: queryGuildId },
    { query: { enabled: isReservationSpotRoute, staleTime: 30_000 } },
  );

  return {
    settingsMembers,
    settingsRoles,
    settingsLootlogConfig,
    currentDocument,
    reservationSpots,
  };
};

type GuildNavigationTopBarProps = {
  titleRef: Ref<HTMLDivElement>;
  actionsRef: Ref<HTMLDivElement>;
  contextRef: Ref<HTMLDivElement>;
};

export const GuildNavigationTopBar: FC<GuildNavigationTopBarProps> = ({
  titleRef,
  actionsRef,
  contextRef,
}) => {
  const { t } = useTranslation();
  const { setIsOpen: setIsSearchOpen } = useContext(GuildSearchContext);
  const location = useLocation();
  const params = useParams({ strict: false });
  const guildRouteData = guildRouteApi.useLoaderData();
  const matches = useMatches();
  const guild = guildRouteData?.guild;

  const { guildId, memberId, npcId, roleId, docId, reservationId } = params;

  const path = location.pathname;

  const routeFlags = getBreadcrumbRouteFlags({
    guildId,
    memberId,
    roleId,
    npcId,
    docId,
    reservationId,
    path,
  });

  const {
    settingsMembers,
    settingsRoles,
    settingsLootlogConfig,
    currentDocument,
    reservationSpots,
  } = useBreadcrumbLookupData({
    guildId,
    docId,
    isSettingsMemberRoute: routeFlags.isSettingsMemberRoute,
    isSettingsRoleRoute: routeFlags.isSettingsRoleRoute,
    isSettingsNpcRoute: routeFlags.isSettingsNpcRoute,
    isDocsDetailRoute: routeFlags.isDocsDetailRoute,
    isReservationSpotRoute: routeFlags.isReservationSpotRoute,
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

    const reservationSpotName = routeFlags.isReservationSpotRoute
      ? reservationSpots?.find((spot) => spot.id === reservationId)?.name
      : undefined;

    return resolveAppNavigation({
      matches,
      organizationName: guild?.name,
      currentEntityLabel:
        settingsMemberName ??
        settingsNpcName ??
        settingsRoleName ??
        reservationSpotName ??
        (routeFlags.isDocsDetailRoute ? currentDocument?.title : undefined),
    });
  };

  return (
    <AppNavigationTopBar
      heading={resolveNavigationInfo().heading}
      titleRef={titleRef}
      actionsRef={actionsRef}
      contextRef={contextRef}
      search={<GuildSearchButton onClick={() => setIsSearchOpen(true)} />}
    />
  );
};
