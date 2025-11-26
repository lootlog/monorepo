import { Button } from "@lootlog/ui/components/button";
import { useSidebar } from "@lootlog/ui/components/sidebar";
import {
  Permission,
  useGuildPermissions,
} from "@/hooks/api/guilds/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  BarChart4,
  CalendarClock,
  ClipboardList,
  Clock,
  RefreshCcw,
  Settings,
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

export const GuildsSidebarNav: FC = () => {
  const guildId = useGuildId();
  const { data: guilds } = useGuilds();
  const { data: member } = useGuildMember();
  const { data: permissions } = useGuildPermissions();
  const { setOpenMobile } = useSidebar();
  const { mutate: refreshMember } = useMemberRefresh();

  const menuItems: MenuItem[] = [
    {
      label: "Lootlog",
      icon: <ClipboardList className="mr-1 h-4 w-4" />,
      path: "",
      available: true,
      enabled: true,
    },
    {
      label: "Timery",
      icon: <Clock className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.guild.timers,
      available: false,
      enabled: true,
    },
    {
      label: "Rezerwacje",
      icon: <CalendarClock className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.guild.reservations,
      available: true,
      enabled: true,
    },
    {
      label: "Statystyki",
      icon: <BarChart4 className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.guild.stats,
      available: false,
      enabled: true,
    },
    {
      divided: true,
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
      onItemClick={handleItemClick}
    />
  );
};
