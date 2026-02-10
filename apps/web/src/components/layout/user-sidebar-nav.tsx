import { useSession } from "@/hooks/auth/use-session";
import { LayoutDashboard, Package, Settings, Swords } from "lucide-react";
import { SidebarNav, type MenuItem } from "./sidebar-nav";
import { ROUTE_SEGMENTS } from "@/config/routes";
import { isDevMode } from "@/lib/utils/is-dev-mode";

export const UserSidebarNav = () => {
  const { data: session } = useSession();

  const menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard className="mr-1 h-4 w-4" />,
      path: "",
      available: true,
      enabled: true,
      divided: false,
      childPaths: ["/kills"],
    },
    {
      label: "Panel walk",
      icon: <Swords className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.user.battlePanel,
      available: true,
      enabled: true,
      divided: false,
      badge: { content: "BETA", variant: "default" },
    },
    {
      label: "Dodatki",
      icon: <Package className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.user.addons,
      available: isDevMode,
      enabled: isDevMode,
      divided: false,
      badge: { content: "DEV", variant: "outline" },
    },
    {
      label: "Ustawienia",
      icon: <Settings className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.user.settings,
      available: true,
      enabled: true,
      divided: true,
    },
  ];

  const header = (
    <span className="ml-3 w-full text-nowrap text-ellipsis overflow-hidden">
      Cześć, {session?.user?.name}! 👋
    </span>
  );

  return (
    <SidebarNav
      items={menuItems}
      basePath={ROUTE_SEGMENTS.user.base}
      header={header}
    />
  );
};
