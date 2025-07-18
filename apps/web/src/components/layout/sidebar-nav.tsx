import { Button } from "@lootlog/ui/components/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
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
import { FC, Fragment, ReactElement, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useGuilds } from "@/hooks/api/use-guilds";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGuildMember } from "@/hooks/api/use-guild-member";
import { REFRESH_PERMISSIONS_TTL } from "@/constants/refresh-permissions-ttl";
import { useMemberRefresh } from "@/hooks/api/use-member-refresh";

type MenuItem = {
  label: string;
  icon: ReactElement;
  path: string;
  available: boolean;
  enabled?: boolean;
  divided?: boolean;
};

export const SidebarNav: FC = () => {
  const guildId = useGuildId();
  const { data: guilds } = useGuilds();
  const { data: member } = useGuildMember();
  const { pathname } = useLocation();
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
        enabled:
          permissions?.includes(Permission.ADMIN) ||
          permissions?.includes(Permission.OWNER),
      },
    ],
    [permissions]
  );

  const handleRefreshPermissions = () => {
    if (!guildId) return;

    refreshMember({ memberId: "@me" });
  };

  const guild = guilds?.find(
    (g) => g.id === guildId || g.vanityUrl === guildId
  );

  console.log(member);
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

  return (
    <div className="flex flex-col w-full gap-1 flex-1">
      <div className="h-14 min-h-14 font-semibold flex flex-row items-center justify-between border-b mb-2 px-2">
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
      </div>
      {menuItems.map(({ divided, icon, path, label, available, enabled }) => {
        const url = `/${guildId}${path}`;
        const isActive =
          path === ""
            ? pathname === `/${guildId}`
            : pathname === url || pathname.startsWith(`${url}/`);

        return (
          enabled && (
            <Fragment key={path}>
              {divided && <Separator className="my-2" />}
              <div className="w-full px-2">
                <Link
                  to={url}
                  key={path}
                  onClick={(e) => {
                    if (!available) e.preventDefault();
                    setOpenMobile(false);
                  }}
                  className={cn({
                    "hover:cursor-not-allowed": !available,
                  })}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "justify-start w-full font-semibold transition px-2",
                      {
                        "bg-violet-900": isActive,
                        "hover:bg-violet-700": isActive,
                      }
                    )}
                    disabled={!available}
                  >
                    {icon}
                    {label}
                  </Button>
                </Link>
              </div>
            </Fragment>
          )
        );
      })}
    </div>
  );
};
