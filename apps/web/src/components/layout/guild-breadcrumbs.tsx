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
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
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

  const isEventRoute = Boolean(eventId && guildId && path.includes("/events"));
  const isSettingsRoleRoute = Boolean(
    guildId && roleId && path.startsWith(`/${guildId}/settings/roles/`),
  );
  const isSettingsMemberRoute = Boolean(
    guildId && memberId && path.startsWith(`/${guildId}/settings/members/`),
  );
  const isSettingsNpcRoute = Boolean(
    guildId && npcId && path.startsWith(`/${guildId}/settings/npcs/`),
  );
  const isDocsDetailRoute = Boolean(
    guildId && docId && path.startsWith(`/${guildId}/docs/`),
  );
  const isEventMemberRoute = Boolean(
    params.memberId && path.includes("/members/") && isEventRoute,
  );
  const { data: settingsMembers } = useMembersControllerGetGuildMembers(
    { guildId: guildId ?? "" },
    { includeInactive: true },
    {
      query: {
        enabled: isSettingsMemberRoute,
        queryKey: getMembersControllerGetGuildMembersQueryKey(
          { guildId: guildId ?? "" },
          { includeInactive: true },
        ),
      },
    },
  );
  const { data: settingsRoles } = useRolesControllerGetGuildRoles(
    { guildId: guildId ?? "" },
    {
      query: {
        enabled: isSettingsRoleRoute,
        queryKey: getRolesControllerGetGuildRolesQueryKey({
          guildId: guildId ?? "",
        }),
      },
    },
  );
  const { data: settingsLootlogConfig } =
    useLootlogConfigControllerGetLootlogConfig(
      { guildId: guildId ?? "" },
      {
        query: {
          enabled: isSettingsNpcRoute,
          queryKey: getLootlogConfigControllerGetLootlogConfigQueryKey({
            guildId: guildId ?? "",
          }),
        },
      },
    );
  const { data: currentDocument } = useDocsControllerGetDocument(
    { guildId: guildId ?? "", docId: docId ?? "" },
    {
      query: {
        enabled: isDocsDetailRoute,
        queryKey: getDocsControllerGetDocumentQueryKey({
          guildId: guildId ?? "",
          docId: docId ?? "",
        }),
      },
    },
  );
  const event = isEventRoute ? eventRouteData?.event : undefined;
  const eventRankings = isEventMemberRoute
    ? (eventRouteData?.rankings ?? [])
    : [];
  const settingsMemberName = isSettingsMemberRoute
    ? settingsMembers?.find((member) => String(member.id) === memberId)?.name
    : undefined;
  const settingsRoleName = isSettingsRoleRoute
    ? settingsRoles?.find((role) => role.id === roleId)?.name
    : undefined;
  const settingsNpc = isSettingsNpcRoute
    ? settingsLootlogConfig?.npcs?.find((npc) => String(npc.id) === npcId)
    : undefined;
  const settingsNpcName = settingsNpc
    ? t(`npcType.${settingsNpc.npcType}`)
    : undefined;

  const navInfo = getNavigationInfo({
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
    docTitle: isDocsDetailRoute ? currentDocument?.title : undefined,
    guildName: guild?.name,
    eventName: event?.name,
    eventHeroNpcs: event?.heroNpcs,
    eventRankings,
    settingsMemberName,
    settingsNpcName,
    settingsRoleName,
    t,
  });

  return (
    <PageHeader>
      <div className="flex min-w-0 flex-row gap-2 items-center justify-between w-full overflow-hidden">
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

        <div className="flex flex-1 min-w-0 items-center overflow-hidden text-sm justify-center">
          <div className="min-w-0 max-w-full flex-1 overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-full min-w-0 items-center justify-center gap-1.5 pr-1 md:pr-0">
              <AnimatePresence mode="popLayout">
                {navInfo.breadcrumbs.map((crumb, index) => {
                  const isLast = index === navInfo.breadcrumbs.length - 1;
                  return (
                    <motion.div
                      key={`${crumb.label}-${crumb.path ?? "current"}`}
                      className="flex min-w-0 items-center gap-1.5"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {crumb.path ? (
                        <button
                          type="button"
                          onClick={() => navigate({ to: crumb.path as string })}
                          className="min-h-8 max-w-[6.5rem] truncate rounded px-1 text-xs text-muted-foreground/70 hover:text-foreground transition-colors duration-200 whitespace-nowrap cursor-pointer sm:max-w-40"
                        >
                          {crumb.label}
                        </button>
                      ) : (
                        <span className="block max-w-40 truncate text-sm font-bold text-foreground whitespace-nowrap sm:max-w-64">
                          {crumb.label}
                        </span>
                      )}
                      {!isLast && (
                        <span className="text-xs text-muted-foreground/30 select-none">
                          /
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="w-8" />
      </div>
    </PageHeader>
  );
};
