import { useTranslation } from "react-i18next";
import { useSession } from "@/hooks/auth/use-session";
import { BellRing, LayoutDashboard, Settings, Swords } from "lucide-react";
import { SidebarNav } from "./sidebar-nav/sidebar-nav";
import type { MenuItem } from "./sidebar-nav/types";
import { useThemeMeta } from "@/themes";
import { useMatches } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  resolveAppNavigation,
  type AppNavigationItemId,
} from "@/navigation/app-navigation";

const userNavigationIcons: Partial<Record<AppNavigationItemId, ReactNode>> = {
  "user-dashboard": <LayoutDashboard className="mr-1 h-4 w-4" />,
  "user-battles": <Swords className="mr-1 h-4 w-4" />,
  "user-notifications": <BellRing className="mr-1 h-4 w-4" />,
  "user-settings": <Settings className="mr-1 h-4 w-4" />,
};

export const UserSidebarNav = () => {
  const { data: session } = useSession();
  const { greetingSuffix } = useThemeMeta();
  const { t } = useTranslation();
  const matches = useMatches();
  const navigation = resolveAppNavigation({ matches });
  const menuItems: MenuItem[] = navigation.sidebarItems.map((item) => ({
    active: item.active,
    available: true,
    enabled: item.visible,
    icon: userNavigationIcons[item.id],
    label: item.label,
    path: item.href,
    divided: item.id === "user-notifications",
    badge:
      item.id === "user-battles"
        ? { content: "BETA", variant: "default" }
        : undefined,
  }));

  const userName = session?.user?.name;

  const header = (
    <span className="ml-3 text-sm font-semibold text-nowrap text-ellipsis overflow-hidden">
      {t("common.greeting", { name: userName })} {greetingSuffix}
    </span>
  );

  return <SidebarNav items={menuItems} header={header} />;
};
