import { Button } from "components/ui/button";
import { Separator } from "components/ui/separator";
import { useSidebar } from "components/ui/sidebar";
import {
  Permission,
  useGuildPermissions,
} from "hooks/api/use-guild-permissions";
import { useGuildId } from "hooks/use-guild-id";
import {
  BarChart4,
  CalendarClock,
  ClipboardList,
  Clock,
  Code2,
  Settings,
} from "lucide-react";
import { FC, Fragment, ReactElement, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "utils/cn";

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
  const { pathname } = useLocation();
  const { data: permissions } = useGuildPermissions();
  const { setOpenMobile } = useSidebar();

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        label: "Lootlog",
        icon: <ClipboardList className="mr-2 h-4 w-4" />,
        path: "",
        available: true,
        enabled: true,
      },
      {
        label: "Timery",
        icon: <Clock className="mr-2 h-4 w-4" />,
        path: "/timers",
        available: false,
        enabled: true,
      },
      {
        label: "Rezerwacje",
        icon: <CalendarClock className="mr-2 h-4 w-4" />,
        path: "/reservations",
        available: false,
        enabled: true,
      },
      {
        label: "Statystyki",
        icon: <BarChart4 className="mr-2 h-4 w-4" />,
        path: "/stats",
        available: false,
        enabled: true,
      },
      {
        label: "Instalacja",
        icon: <Code2 className="mr-2 h-4 w-4" />,
        divided: true,
        path: "/install",
        available: true,
        enabled: true,
      },
      {
        label: "Ustawienia",
        icon: <Settings className="mr-2 h-4 w-4" />,
        path: "/settings",
        available: true,
        enabled:
          permissions?.includes(Permission.ADMIN) ||
          permissions?.includes(Permission.OWNER),
      },
    ],
    [permissions]
  );

  return (
    <div className="flex flex-col w-full py-2 gap-1 flex-1">
      {menuItems.map(({ divided, icon, path, label, available, enabled }) => {
        const url = `/${guildId}${path}`;
        const isActive = pathname === url;

        return (
          enabled && (
            <Fragment key={path}>
              {divided && <Separator className="my-2" />}
              <div className="w-full px-2">
                <Link
                  to={url}
                  key={path}
                  onClick={(e) => {
                    !available && e.preventDefault();
                    setOpenMobile(false);
                  }}
                  className={cn({
                    "hover:cursor-not-allowed": !available,
                  })}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "justify-start w-full font-semibold transition",
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
