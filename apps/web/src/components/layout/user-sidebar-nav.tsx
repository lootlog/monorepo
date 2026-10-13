import { useTranslation } from "react-i18next";
import { useSession } from "@/hooks/auth/use-session";
import { SidebarNav } from "./sidebar-nav/sidebar-nav";
import type { MenuItem } from "./sidebar-nav/types";
import { useThemeMeta } from "@/themes";
import { useMatches } from "@tanstack/react-router";
import { resolveAppNavigation } from "@/navigation/app-navigation";
import { APP_NAVIGATION_ICONS } from "@/navigation/app-navigation-icons";

export const UserSidebarNav = () => {
  const { data: session } = useSession();
  const { greetingSuffix } = useThemeMeta();
  const { t } = useTranslation();
  const matches = useMatches();
  const navigation = resolveAppNavigation({ matches });

  const menuItems: MenuItem[] = navigation.sidebarItems.map((item) => {
    const Icon = APP_NAVIGATION_ICONS[item.id];

    return {
      active: item.active,
      available: true,
      enabled: item.visible,
      icon: <Icon className="mr-1 size-4" />,
      label: item.label,
      path: item.href,
      divided: item.id === "user-notifications",
      badge:
        item.id === "user-battles"
          ? { content: t("layout.navigation.beta"), variant: "default" }
          : undefined,
    };
  });

  const userName = session?.user?.name;

  const header = (
    <span className="ml-3 text-sm font-semibold text-nowrap text-ellipsis overflow-hidden">
      {t("common.greeting", { name: userName })} {greetingSuffix}
    </span>
  );

  return (
    <SidebarNav
      items={menuItems}
      header={header}
      ariaLabel={t("layout.navigation.userAriaLabel")}
    />
  );
};
