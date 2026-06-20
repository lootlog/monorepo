import { HorizontalMenu } from "@/components/layout/horizontal-menu";
import { ROUTES } from "@/config/routes";
import { Outlet, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const BattlePanelLayout = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const normalizedPathname = pathname.replace(/\/$/, "");
  const showTopLevelNavigation =
    normalizedPathname === ROUTES.user.battlePanel.base ||
    normalizedPathname === ROUTES.user.battlePanel.statistics;

  const navigationItems = [
    {
      id: "battles",
      label: t("battlePanel.navigation.battles"),
      href: ROUTES.user.battlePanel.base,
    },
    {
      id: "analytics",
      label: t("battlePanel.navigation.analytics"),
      href: ROUTES.user.battlePanel.statistics,
    },
  ];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 min-w-0 w-full flex-col bg-background/50">
      {showTopLevelNavigation && (
        <HorizontalMenu
          items={navigationItems}
          ariaLabel={t("battlePanel.navigation.title")}
          className="shrink-0 pb-0"
        />
      )}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};
