import { useTranslation } from "react-i18next";
import { useSession } from "@/hooks/auth/use-session";
import { BellRing, LayoutDashboard, Settings, Swords } from "lucide-react";
import { SidebarNav } from "./sidebar-nav/sidebar-nav";
import type { MenuItem } from "./sidebar-nav/types";
import { ROUTE_SEGMENTS } from "@/config/routes";
import { useThemeMeta } from "@/themes/use-theme-meta";

export const UserSidebarNav = () => {
  const { data: session } = useSession();
  const { greetingSuffix } = useThemeMeta();
  const { t } = useTranslation();
  const menuItems: MenuItem[] = [
    {
      label: t("layout.navigation.dashboard"),
      icon: <LayoutDashboard className="mr-1 h-4 w-4" />,
      path: "",
      available: true,
      enabled: true,
      divided: false,
      childPaths: ["/kills"],
    },
    {
      label: t("layout.navigation.battlePanel"),
      icon: <Swords className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.user.battlePanel,
      available: true,
      enabled: true,
      divided: false,
      badge: { content: "BETA", variant: "default" },
    },
    {
      label: t("layout.navigation.notifications"),
      icon: <BellRing className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.user.notifications,
      available: true,
      enabled: true,
      divided: true,
    },
    {
      label: t("layout.navigation.settings"),
      icon: <Settings className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.user.settings,
      available: true,
      enabled: true,
      divided: false,
    },
  ];

  const userName = session?.user?.name;

  const header = (
    <span className="ml-3 text-sm font-semibold text-nowrap text-ellipsis overflow-hidden">
      {t("common.greeting", { name: userName })} {greetingSuffix}
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
