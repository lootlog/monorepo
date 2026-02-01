import { GuildSidebar } from "@/components/layout/guild-sidebar";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@lootlog/ui/components/sidebar";
import { Toaster } from "@lootlog/ui/components/sonner";
import { GuildContextProvider } from "@/contexts/guild.context";
import type { FC } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@lootlog/ui/components/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useGuild } from "@/hooks/api/guilds/use-guild";
import { useEvent } from "@/features/events/hooks";
import { useNpcKillers } from "@/features/stats/hooks/use-npc-killers";
import { useMemberKills } from "@/features/stats/hooks/use-member-kills";
import { ROUTES } from "@/config/routes";
import { useTranslation } from "react-i18next";

export const GuildLayout: FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const { data: guild } = useGuild({ retry: false });
  const { guildId, eventId } = params;
  const { data: event } = useEvent({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });
  const { data: npcKillersData } = useNpcKillers(
    params.npcId ? Number.parseInt(params.npcId, 10) : undefined,
  );
  const { data: memberKillsData } = useMemberKills(
    params.memberId ? Number.parseInt(params.memberId, 10) : undefined,
  );

  const getNavigationInfo = () => {
    const path = location.pathname;
    const { guildId, reservationId, eventId, heroId, killId } = params;

    if (!guildId) {
      return {
        breadcrumbs: [
          { label: guild?.name || t("common.breadcrumbs.guild"), path: null },
        ],
        showBack: false,
      };
    }

    const guildBase = ROUTES.guild.base(guildId);
    const guildTimers = ROUTES.guild.timers(guildId);
    const guildReservations = ROUTES.guild.reservations.base(guildId);
    const guildStats = ROUTES.guild.stats(guildId);
    const guildSettings = ROUTES.guild.settings.base(guildId);
    const guildSettingsRoles = ROUTES.guild.settings.roles(guildId);
    const guildSettingsMembers = ROUTES.guild.settings.members(guildId);
    const guildSettingsNpcs = ROUTES.guild.settings.npcs(guildId);
    const guildActivityLogs = ROUTES.guild.activityLogs(guildId);
    const guildEvents = ROUTES.guild.events(guildId);

    if (path === guildBase) {
      return {
        breadcrumbs: [
          { label: guild?.name || t("common.breadcrumbs.guild"), path: null },
        ],
        showBack: false,
      };
    }

    if (path === guildTimers) {
      return {
        breadcrumbs: [
          {
            label: guild?.name || t("common.breadcrumbs.guild"),
            path: guildBase,
          },
          { label: t("common.breadcrumbs.timers"), path: null },
        ],
        showBack: true,
        backPath: guildBase,
      };
    }

    if (path === guildReservations) {
      return {
        breadcrumbs: [
          {
            label: guild?.name || t("common.breadcrumbs.guild"),
            path: guildBase,
          },
          { label: t("common.breadcrumbs.reservations"), path: null },
        ],
        showBack: true,
        backPath: guildBase,
      };
    }
    if (path.startsWith(guildReservations)) {
      return {
        breadcrumbs: [
          {
            label: guild?.name || t("common.breadcrumbs.guild"),
            path: guildBase,
          },
          {
            label: t("common.breadcrumbs.reservations"),
            path: guildReservations,
          },
          {
            label: reservationId
              ? reservationId.charAt(0).toUpperCase() + reservationId.slice(1)
              : reservationId,
            path: null,
          },
        ],
        showBack: true,
        backPath: guildReservations,
      };
    }

    if (path === guildActivityLogs) {
      return {
        breadcrumbs: [
          {
            label: guild?.name || t("common.breadcrumbs.guild"),
            path: guildBase,
          },
          { label: t("common.breadcrumbs.activityLogs"), path: null },
        ],
        showBack: true,
        backPath: guildBase,
      };
    }

    if (path === guildStats) {
      return {
        breadcrumbs: [
          {
            label: guild?.name || t("common.breadcrumbs.guild"),
            path: guildBase,
          },
          { label: t("common.breadcrumbs.stats"), path: null },
        ],
        showBack: true,
        backPath: guildBase,
      };
    }

    // Stats ranking: /$guildId/stats/ranking
    const guildStatsRanking = `${guildStats}/ranking`;
    if (path === guildStatsRanking) {
      return {
        breadcrumbs: [
          {
            label: guild?.name || t("common.breadcrumbs.guild"),
            path: guildBase,
          },
          { label: t("common.breadcrumbs.stats"), path: guildStats },
          { label: t("common.breadcrumbs.memberRanking"), path: null },
        ],
        showBack: true,
        backPath: guildStats,
      };
    }

    // Stats NPC list: /$guildId/stats/npcs
    const guildStatsNpcs = `${guildStats}/npcs`;
    if (path === guildStatsNpcs) {
      return {
        breadcrumbs: [
          {
            label: guild?.name || t("common.breadcrumbs.guild"),
            path: guildBase,
          },
          { label: t("common.breadcrumbs.stats"), path: guildStats },
          { label: t("common.breadcrumbs.npcs"), path: null },
        ],
        showBack: true,
        backPath: guildStats,
      };
    }

    // Stats NPC killers: /$guildId/stats/npcs/$npcId
    if (path.startsWith(`${guildStats}/npcs/`)) {
      return {
        breadcrumbs: [
          {
            label: guild?.name || t("common.breadcrumbs.guild"),
            path: guildBase,
          },
          { label: t("common.breadcrumbs.stats"), path: guildStats },
          { label: t("common.breadcrumbs.npcs"), path: guildStatsNpcs },
          {
            label:
              npcKillersData?.npc?.npcName ||
              t("common.breadcrumbs.npcFallback", { id: params.npcId }),
            path: null,
          },
        ],
        showBack: true,
        backPath: guildStatsNpcs,
      };
    }

    // Stats member kills: /$guildId/stats/members/$memberId
    if (path.startsWith(`${guildStats}/members/`)) {
      return {
        breadcrumbs: [
          {
            label: guild?.name || t("common.breadcrumbs.guild"),
            path: guildBase,
          },
          { label: t("common.breadcrumbs.stats"), path: guildStats },
          {
            label: t("common.breadcrumbs.memberRanking"),
            path: guildStatsRanking,
          },
          {
            label:
              memberKillsData?.member?.memberName ||
              t("common.breadcrumbs.memberFallback", { id: params.memberId }),
            path: null,
          },
        ],
        showBack: true,
        backPath: guildStatsRanking,
      };
    }

    // Events handling
    if (path === guildEvents) {
      return {
        breadcrumbs: [
          {
            label: guild?.name || t("common.breadcrumbs.guild"),
            path: guildBase,
          },
          { label: t("common.breadcrumbs.events"), path: null },
        ],
        showBack: true,
        backPath: guildBase,
      };
    }

    if (path === `${guildEvents}/create`) {
      return {
        breadcrumbs: [
          {
            label: guild?.name || t("common.breadcrumbs.guild"),
            path: guildBase,
          },
          { label: t("common.breadcrumbs.events"), path: guildEvents },
          { label: t("common.breadcrumbs.newEvent"), path: null },
        ],
        showBack: true,
        backPath: guildEvents,
      };
    }

    if (path.startsWith(guildEvents) && eventId) {
      const guildEventDetail = `${guildEvents}/${eventId}`;

      // Kill history: /events/$eventId/kills
      if (path === `${guildEventDetail}/kills`) {
        return {
          breadcrumbs: [
            {
              label: guild?.name || t("common.breadcrumbs.guild"),
              path: guildBase,
            },
            { label: t("common.breadcrumbs.events"), path: guildEvents },
            {
              label: event?.name || t("common.breadcrumbs.event"),
              path: guildEventDetail,
            },
            { label: t("common.breadcrumbs.killHistory"), path: null },
          ],
          showBack: true,
          backPath: guildEventDetail,
        };
      }

      // Hero kills history: /events/$eventId/heroes/$heroId/kills
      if (heroId && path === `${guildEventDetail}/heroes/${heroId}/kills`) {
        const heroPath = `${guildEventDetail}/heroes/${heroId}`;
        return {
          breadcrumbs: [
            {
              label: guild?.name || t("common.breadcrumbs.guild"),
              path: guildBase,
            },
            { label: t("common.breadcrumbs.events"), path: guildEvents },
            {
              label: event?.name || t("common.breadcrumbs.event"),
              path: guildEventDetail,
            },
            {
              label:
                event?.heroNpcs?.find((h) => h.id === heroId)?.npcName ||
                t("common.breadcrumbs.hero"),
              path: heroPath,
            },
            { label: t("common.breadcrumbs.killHistory"), path: null },
          ],
          showBack: true,
          backPath: heroPath,
        };
      }

      // Kill detail: /events/$eventId/heroes/$heroId/kills/$killId
      if (killId && path.includes("/kills/")) {
        const heroPath = `${guildEventDetail}/heroes/${heroId}`;
        return {
          breadcrumbs: [
            {
              label: guild?.name || t("common.breadcrumbs.guild"),
              path: guildBase,
            },
            { label: t("common.breadcrumbs.events"), path: guildEvents },
            {
              label: event?.name || t("common.breadcrumbs.event"),
              path: guildEventDetail,
            },
            {
              label:
                event?.heroNpcs?.find((h) => h.id === heroId)?.npcName ||
                t("common.breadcrumbs.hero"),
              path: heroPath,
            },
            { label: killId ?? "Kill", path: null },
          ],
          showBack: true,
          backPath: heroPath,
        };
      }

      // Hero detail: /events/$eventId/heroes/$heroId
      if (heroId && path.includes("/heroes/")) {
        return {
          breadcrumbs: [
            {
              label: guild?.name || t("common.breadcrumbs.guild"),
              path: guildBase,
            },
            { label: t("common.breadcrumbs.events"), path: guildEvents },
            {
              label: event?.name || t("common.breadcrumbs.event"),
              path: guildEventDetail,
            },
            {
              label:
                event?.heroNpcs?.find((h) => h.id === heroId)?.npcName ||
                t("common.breadcrumbs.hero"),
              path: null,
            },
          ],
          showBack: true,
          backPath: guildEventDetail,
        };
      }

      // Event ranking: /events/$eventId/ranking
      if (path === `${guildEventDetail}/ranking`) {
        return {
          breadcrumbs: [
            {
              label: guild?.name || t("common.breadcrumbs.guild"),
              path: guildBase,
            },
            { label: t("common.breadcrumbs.events"), path: guildEvents },
            {
              label: event?.name || t("common.breadcrumbs.event"),
              path: guildEventDetail,
            },
            { label: t("common.breadcrumbs.ranking"), path: null },
          ],
          showBack: true,
          backPath: guildEventDetail,
        };
      }

      // Event detail: /events/$eventId
      return {
        breadcrumbs: [
          {
            label: guild?.name || t("common.breadcrumbs.guild"),
            path: guildBase,
          },
          { label: t("common.breadcrumbs.events"), path: guildEvents },
          { label: event?.name || t("common.breadcrumbs.event"), path: null },
        ],
        showBack: true,
        backPath: guildEvents,
      };
    }

    if (path.startsWith(guildSettings)) {
      const breadcrumbs = [
        {
          label: guild?.name || t("common.breadcrumbs.guild"),
          path: guildBase,
        },
        { label: t("common.breadcrumbs.settings"), path: null },
      ];

      if (path === guildSettingsRoles) {
        breadcrumbs[1] = {
          label: t("common.breadcrumbs.settings"),
          path: guildSettings,
        };
        breadcrumbs.push({ label: t("common.breadcrumbs.roles"), path: null });
      } else if (path.startsWith(`${guildSettingsRoles}/`)) {
        const roleId = path.split("/").pop();
        breadcrumbs[1] = {
          label: t("common.breadcrumbs.settings"),
          path: guildSettings,
        };
        breadcrumbs.push({
          label: t("common.breadcrumbs.roles"),
          path: guildSettingsRoles,
        });
        breadcrumbs.push({
          label: t("common.breadcrumbs.roleFallback", { id: roleId }),
          path: null,
        });
      } else if (path === guildSettingsMembers) {
        breadcrumbs[1] = {
          label: t("common.breadcrumbs.settings"),
          path: guildSettings,
        };
        breadcrumbs.push({
          label: t("common.breadcrumbs.members"),
          path: null,
        });
      } else if (path === guildSettingsNpcs) {
        breadcrumbs[1] = {
          label: t("common.breadcrumbs.settings"),
          path: guildSettings,
        };
        breadcrumbs.push({ label: "NPCs", path: null });
      }

      return {
        breadcrumbs,
        showBack: true,
        backPath: path === guildSettings ? guildBase : guildSettings,
      };
    }

    return {
      breadcrumbs: [
        { label: guild?.name || t("common.breadcrumbs.guild"), path: null },
      ],
      showBack: false,
    };
  };

  const navInfo = getNavigationInfo();

  return (
    <GuildContextProvider>
      <div className="h-full max-h-full overflow-hidden flex flex-row">
        <SidebarProvider>
          <GuildSidebar />
          <div className="flex flex-row w-full h-full min-h-0">
            <div className="w-full h-full flex flex-col min-h-0">
              <PageHeader>
                <div className="flex flex-row gap-2 items-center justify-between w-full">
                  <div className="flex flex-row gap-2 items-center">
                    <SidebarTrigger />
                    {navInfo.showBack && navInfo.backPath && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate({ to: navInfo.backPath as string })
                        }
                        className="p-1 h-8 w-8"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-sm flex-1 min-w-0 justify-center overflow-hidden">
                    {navInfo.breadcrumbs.map((crumb, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 min-w-0 shrink-0 last:shrink"
                      >
                        {crumb.path ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate({ to: crumb.path as string })
                            }
                            className="text-sm h-auto p-1 font-semibold hover:bg-accent/50 whitespace-nowrap"
                          >
                            {crumb.label}
                          </Button>
                        ) : (
                          <span className="font-semibold px-1 truncate">
                            {crumb.label}
                          </span>
                        )}
                        {index < navInfo.breadcrumbs.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="w-8" />
                </div>
              </PageHeader>
              <div className="flex-1 min-h-0 flex flex-col gap-4 w-full max-w-full h-full overflow-hidden">
                <Outlet />
              </div>
            </div>
          </div>
        </SidebarProvider>
      </div>
      <Toaster />
    </GuildContextProvider>
  );
};
