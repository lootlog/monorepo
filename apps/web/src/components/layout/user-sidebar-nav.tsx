import { useTranslation } from "react-i18next";
import { useSession } from "@/hooks/auth/use-session";
import { useTheme } from "@/hooks/context/use-theme";
import { BellRing, LayoutDashboard, Settings, Swords } from "lucide-react";
import { SidebarNav, type MenuItem } from "./sidebar-nav/index";
import { ROUTE_SEGMENTS } from "@/config/routes";

export const UserSidebarNav = () => {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const { t } = useTranslation();
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
      label: t("common.breadcrumbs.notifications"),
      icon: <BellRing className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.user.notifications,
      available: true,
      enabled: true,
      divided: true,
    },
    {
      label: t("common.breadcrumbs.settings"),
      icon: <Settings className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.user.settings,
      available: true,
      enabled: true,
      divided: false,
    },
  ];

  const isCatTheme = theme.startsWith("cat-");
  const greeting = isCatTheme ? "🐱" : "👋";

  const header = (
    <span className="ml-3 w-full text-nowrap text-ellipsis overflow-hidden">
      {t("common.greeting", { name: session?.user?.name })} {greeting}
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
