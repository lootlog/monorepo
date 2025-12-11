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
import { ROUTES } from "@/config/routes";

export const GuildLayout: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const { data: guild } = useGuild({ retry: false });
  const { guildId, eventId } = params;
  const { data: event } = useEvent({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });

  const getNavigationInfo = () => {
    const path = location.pathname;
    const { guildId, reservationId, eventId, heroId, killId } = params;

    if (!guildId) {
      return {
        breadcrumbs: [{ label: guild?.name || "Gildia", path: null }],
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
        breadcrumbs: [{ label: guild?.name || "Gildia", path: null }],
        showBack: false,
      };
    }

    if (path === guildTimers) {
      return {
        breadcrumbs: [
          { label: guild?.name || "Gildia", path: guildBase },
          { label: "Timery", path: null },
        ],
        showBack: true,
        backPath: guildBase,
      };
    }

    if (path === guildReservations) {
      return {
        breadcrumbs: [
          { label: guild?.name || "Gildia", path: guildBase },
          { label: "Rezerwacje", path: null },
        ],
        showBack: true,
        backPath: guildBase,
      };
    }
    if (path.startsWith(guildReservations)) {
      return {
        breadcrumbs: [
          { label: guild?.name || "Gildia", path: guildBase },
          { label: "Rezerwacje", path: guildReservations },
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
          { label: guild?.name || "Gildia", path: guildBase },
          { label: "Logi aktywności", path: null },
        ],
        showBack: true,
        backPath: guildBase,
      };
    }

    if (path === guildStats) {
      return {
        breadcrumbs: [
          { label: guild?.name || "Gildia", path: guildBase },
          { label: "Statystyki", path: null },
        ],
        showBack: true,
        backPath: guildBase,
      };
    }

    // Events handling
    if (path === guildEvents) {
      return {
        breadcrumbs: [
          { label: guild?.name || "Gildia", path: guildBase },
          { label: "Eventy", path: null },
        ],
        showBack: true,
        backPath: guildBase,
      };
    }

    if (path === `${guildEvents}/create`) {
      return {
        breadcrumbs: [
          { label: guild?.name || "Gildia", path: guildBase },
          { label: "Eventy", path: guildEvents },
          { label: "Nowy event", path: null },
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
            { label: guild?.name || "Gildia", path: guildBase },
            { label: "Eventy", path: guildEvents },
            { label: event?.name || "Event", path: guildEventDetail },
            { label: "Historia bić", path: null },
          ],
          showBack: true,
          backPath: guildEventDetail,
        };
      }

      // Kill detail: /events/$eventId/heroes/$heroId/kills/$killId
      if (killId && path.includes("/kills/")) {
        const heroPath = `${guildEventDetail}/heroes/${heroId}`;
        return {
          breadcrumbs: [
            { label: guild?.name || "Gildia", path: guildBase },
            { label: "Eventy", path: guildEvents },
            { label: event?.name || "Event", path: guildEventDetail },
            {
              label:
                event?.heroNpcs?.find((h) => h.id === heroId)?.npcName ||
                "Heros",
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
            { label: guild?.name || "Gildia", path: guildBase },
            { label: "Eventy", path: guildEvents },
            { label: event?.name || "Event", path: guildEventDetail },
            {
              label:
                event?.heroNpcs?.find((h) => h.id === heroId)?.npcName ||
                "Heros",
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
            { label: guild?.name || "Gildia", path: guildBase },
            { label: "Eventy", path: guildEvents },
            { label: event?.name || "Event", path: guildEventDetail },
            { label: "Ranking", path: null },
          ],
          showBack: true,
          backPath: guildEventDetail,
        };
      }

      // Event detail: /events/$eventId
      return {
        breadcrumbs: [
          { label: guild?.name || "Gildia", path: guildBase },
          { label: "Eventy", path: guildEvents },
          { label: event?.name || "Event", path: null },
        ],
        showBack: true,
        backPath: guildEvents,
      };
    }

    if (path.startsWith(guildSettings)) {
      const breadcrumbs = [
        { label: guild?.name || "Gildia", path: guildBase },
        { label: "Ustawienia", path: null },
      ];

      if (path === guildSettingsRoles) {
        breadcrumbs[1] = { label: "Ustawienia", path: guildSettings };
        breadcrumbs.push({ label: "Role", path: null });
      } else if (path.startsWith(`${guildSettingsRoles}/`)) {
        const roleId = path.split("/").pop();
        breadcrumbs[1] = { label: "Ustawienia", path: guildSettings };
        breadcrumbs.push({ label: "Role", path: guildSettingsRoles });
        breadcrumbs.push({ label: `Rola #${roleId}`, path: null });
      } else if (path === guildSettingsMembers) {
        breadcrumbs[1] = { label: "Ustawienia", path: guildSettings };
        breadcrumbs.push({ label: "Członkowie", path: null });
      } else if (path === guildSettingsNpcs) {
        breadcrumbs[1] = { label: "Ustawienia", path: guildSettings };
        breadcrumbs.push({ label: "NPCs", path: null });
      }

      return {
        breadcrumbs,
        showBack: true,
        backPath: path === guildSettings ? guildBase : guildSettings,
      };
    }

    return {
      breadcrumbs: [{ label: guild?.name || "Gildia", path: null }],
      showBack: false,
    };
  };

  const navInfo = getNavigationInfo();

  return (
    <GuildContextProvider>
      <div className="h-dvh max-h-dvh overflow-hidden flex flex-row">
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
