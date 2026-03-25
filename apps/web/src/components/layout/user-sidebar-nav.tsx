import { useTranslation } from "react-i18next";
import { useSession } from "@/hooks/auth/use-session";
import { useTheme } from "@/hooks/context/use-theme";
import { LayoutDashboard, Settings, Swords } from "lucide-react";
import { SidebarNav, type MenuItem } from "./sidebar-nav/index";
import { ROUTE_SEGMENTS } from "@/config/routes";

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
    label: "Ustawienia",
    icon: <Settings className="mr-1 h-4 w-4" />,
    path: ROUTE_SEGMENTS.user.settings,
    available: true,
    enabled: true,
    divided: true,
  },
];

export const UserSidebarNav = () => {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const { t } = useTranslation();

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
