import { Button } from "@lootlog/ui/components/button";
import { useSidebar } from "@lootlog/ui/components/sidebar";
import {
  Permission,
  useGuildPermissions,
} from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/use-guild-id";
import {
  BarChart4,
  CalendarClock,
  ClipboardList,
  Clock,
  RefreshCcw,
  Settings,
} from "lucide-react";
import { FC, useMemo } from "react";
import { useGuilds } from "@/hooks/api/use-guilds";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useGuildMember } from "@/hooks/api/use-guild-member";
import { REFRESH_PERMISSIONS_TTL } from "@/constants/refresh-permissions-ttl";
import { useMemberRefresh } from "@/hooks/api/use-member-refresh";
import { SidebarNav, MenuItem } from "./sidebar-nav";

export const GuildsSidebarNav: FC = () => {
  const guildId = useGuildId();
  const { data: guilds } = useGuilds();
  const { data: member } = useGuildMember();
  const { data: permissions } = useGuildPermissions();
  const { setOpenMobile } = useSidebar();
  const { mutate: refreshMember } = useMemberRefresh();

  const menuItems: MenuItem[] = useMemo(
    () => [
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
        path: "/timers",
        available: false,
        enabled: true,
      },
      {
        label: "Rezerwacje",
        icon: <CalendarClock className="mr-1 h-4 w-4" />,
        path: "/reservations",
        available: false,
        enabled: true,
      },
      {
        label: "Statystyki",
        icon: <BarChart4 className="mr-1 h-4 w-4" />,
        path: "/stats",
        available: false,
        enabled: true,
      },
      {
        divided: true,
        label: "Ustawienia",
        icon: <Settings className="mr-1 h-4 w-4" />,
        path: "/settings",
        available: true,
        enabled: Boolean(
          permissions?.includes(Permission.ADMIN) ||
            permissions?.includes(Permission.OWNER)
        ),
      },
    ],
    [permissions]
  );

  const handleRefreshPermissions = () => {
    if (!guildId) return;

    refreshMember({ memberId: "@me" });
  };

  const handleItemClick = () => {
    setOpenMobile(false);
  };

  const guild = guilds?.find(
    (g) => g.id === guildId || g.vanityUrl === guildId
  );
  const canTriggerRefresh =
    member?.updatedAt &&
    new Date(member.updatedAt).getTime() < Date.now() - REFRESH_PERMISSIONS_TTL;
  const getRefreshText = () => {
    if (canTriggerRefresh) {
      return "Odśwież swoje uprawnienia";
    }

    if (member?.updatedAt) {
      const nextRefreshTime =
        new Date(member.updatedAt).getTime() + REFRESH_PERMISSIONS_TTL;
      const timeUntilRefresh = Math.ceil(
        (nextRefreshTime - Date.now()) / (1000 * 60)
      );
      return `Spróbuj ponownie za ${timeUntilRefresh} min`;
    }

    return "Uprawnienia są aktualne";
  };

  const canTriggerRefreshText = getRefreshText();

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
