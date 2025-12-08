import { Button } from "@lootlog/ui/components/button";
import { useSidebar } from "@lootlog/ui/components/sidebar";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  BarChart4,
  CalendarClock,
  ClipboardList,
  Clock,
  Logs,
  RefreshCcw,
  Settings,
  Trophy,
} from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useGuilds } from "@/hooks/api/guilds/use-guilds";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useGuildMember } from "@/hooks/api/members/use-guild-member";
import { REFRESH_PERMISSIONS_TTL } from "@/constants/refresh-permissions-ttl";
import { SidebarNav, type MenuItem } from "./sidebar-nav";
import { useMemberRefresh } from "@/hooks/api/members/use-member-refresh";
import { ROUTE_SEGMENTS } from "@/config/routes";
import { Permission } from "@lootlog/types";
import { useEvents } from "@/features/events/hooks/use-events";
import { ActiveEventsBanner } from "./active-events-banner";

export const GuildsSidebarNav: FC = () => {
  const guildId = useGuildId();
  const { data: guilds } = useGuilds();
  const { data: member } = useGuildMember();
  const { data: permissions } = useGuildPermissions();
  const { setOpenMobile } = useSidebar();
  const { mutate: refreshMember } = useMemberRefresh();

  // Check for active events
  const { data: activeEvents } = useEvents({
    guildId: guildId ?? "",
    activeOnly: true,
  });
  const hasActiveEvents = (activeEvents?.length ?? 0) > 0;
  const activeEventCount = activeEvents?.length ?? 0;

  const menuItems: MenuItem[] = [
    {
      label: "Lootlog",
      icon: <ClipboardList className="mr-1 h-4 w-4" />,
      path: "",
      available: true,
      enabled: Boolean(
        permissions?.includes(Permission.LOOTLOG_LOOTS_READ) ||
        permissions?.includes(Permission.OWNER),
      ),
    },
    {
      label: "Timery",
      icon: <Clock className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.guild.timers,
      available: true,
      enabled: Boolean(
        permissions?.includes(Permission.LOOTLOG_TIMERS_READ) ||
        permissions?.includes(Permission.OWNER),
      ),
    },
    {
      label: "Rezerwacje",
      icon: <CalendarClock className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.guild.reservations,
      available: true,
      enabled: Boolean(
        permissions?.includes(Permission.LOOTLOG_RESERVATIONS_READ) ||
        permissions?.includes(Permission.OWNER),
      ),
    },
    {
      label: "Eventy",
      icon: (
        <div className="relative mr-1">
          <Trophy
            className={`h-4 w-4 ${hasActiveEvents ? "text-yellow-500" : ""}`}
          />
          {hasActiveEvents && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
            </span>
          )}
        </div>
      ),
      path: ROUTE_SEGMENTS.guild.events,
      available: true,
      enabled: Boolean(
        permissions?.includes(Permission.LOOTLOG_ACCESS) ||
        permissions?.includes(Permission.OWNER),
      ),
      badge: hasActiveEvents
        ? { content: activeEventCount, variant: "default" as const }
        : undefined,
      highlight: hasActiveEvents,
    },
    {
      label: "Statystyki",
      icon: <BarChart4 className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.guild.stats,
      available: false,
      enabled: Boolean(
        permissions?.includes(Permission.LOOTLOG_LOOTS_READ) ||
        permissions?.includes(Permission.OWNER),
      ),
    },
    {
      divided: true,
      label: "Logi aktywności",
      icon: <Logs className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.guild.activityLogs,
      available: true,
      enabled: Boolean(
        permissions?.includes(Permission.ADMIN) ||
        permissions?.includes(Permission.OWNER),
      ),
    },
    {
      label: "Ustawienia",
      icon: <Settings className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.guild.settings,
      available: true,
      enabled: Boolean(
        permissions?.includes(Permission.ADMIN) ||
        permissions?.includes(Permission.OWNER),
      ),
    },
  ];

  const handleRefreshPermissions = () => {
    if (!guildId) return;

    refreshMember({ memberId: "@me" });
  };

  const handleItemClick = () => {
    setOpenMobile(false);
  };

  const guild = guilds?.find(
    (g) => g.id === guildId || g.vanityUrl === guildId,
  );
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const canTriggerRefresh =
    member?.updatedAt &&
    new Date(member.updatedAt).getTime() <
      currentTime - REFRESH_PERMISSIONS_TTL;

  const getCanTriggerRefreshText = () => {
    if (canTriggerRefresh) {
      return "Odśwież swoje uprawnienia";
    }

    if (member?.updatedAt) {
      const nextRefreshTime =
        new Date(member.updatedAt).getTime() + REFRESH_PERMISSIONS_TTL;
      const timeUntilRefresh = Math.ceil(
        (nextRefreshTime - currentTime) / (1000 * 60),
      );
      return `Spróbuj ponownie za ${timeUntilRefresh} min`;
    }

    return "Uprawnienia są aktualne";
  };

  const canTriggerRefreshText = getCanTriggerRefreshText();

  const header = (
    <>
      <span className="ml-3 max-w-44 text-nowrap text-ellipsis overflow-hidden">
        {guild?.name}
      </span>
      <span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshPermissions}
                disabled={!canTriggerRefresh}
              >
                <RefreshCcw />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="z-50 mt-4">
            {canTriggerRefreshText}
          </TooltipContent>
        </Tooltip>
      </span>
    </>
  );

  return (
    <SidebarNav
      items={menuItems}
      basePath={`/${guildId}`}
      header={header}
      beforeItems={
        <ActiveEventsBanner
          events={activeEvents ?? []}
          guildId={guildId ?? ""}
          onNavigate={handleItemClick}
        />
      }
      onItemClick={handleItemClick}
    />
  );
};
