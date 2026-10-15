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
  getMembersControllerGetGuildMembersQueryKey,
  useMembersControllerGetGuildMembers,
  getRolesControllerGetGuildRolesQueryKey,
  useRolesControllerGetGuildRoles,
  getLootlogConfigControllerGetLootlogConfigQueryKey,
  useLootlogConfigControllerGetLootlogConfig,
  getDocsControllerGetDocumentQueryKey,
  useDocsControllerGetDocument,
  getListReservationSpotsQueryKey,
  useListReservationSpots,
} from "@lootlog/client/main";

const guildRouteApi = getRouteApi("/_authenticated/$guildId");

const getBreadcrumbRouteFlags = ({
  guildId,
  eventId,
  memberId,
  roleId,
  npcId,
  docId,
  reservationId,
  path,
}: {
  guildId?: string;
  eventId?: string;
  memberId?: string;
  roleId?: string;
  npcId?: string;
  docId?: string;
  reservationId?: string;
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
    isReservationSpotRoute: Boolean(
      guildId && reservationId && path.startsWith(`/${guildId}/reservations/`),
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

  const { data: reservationSpots } = useListReservationSpots(
    { guildId: queryGuildId },
    {
      query: {
        enabled: isReservationSpotRoute,
        queryKey: getListReservationSpotsQueryKey({ guildId: queryGuildId }),
        staleTime: 30_000,
      },
    },
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

  const { guildId, eventId, memberId, npcId, roleId, docId, reservationId } =
    params;

  const path = location.pathname;

  const routeFlags = getBreadcrumbRouteFlags({
    guildId,
    eventId,
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
