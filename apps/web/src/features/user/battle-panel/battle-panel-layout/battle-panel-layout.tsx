import { PageTabsLayout } from "@/components/layout/page-tabs-layout";
import { ROUTES } from "@/config/routes";
import { Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const BattlePanelLayout = () => {
  const { t } = useTranslation();

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
    {
      id: "abyss",
      label: t("battlePanel.navigation.abyss"),
      href: ROUTES.user.battlePanel.abyss,
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageTabsLayout
        tabs={navigationItems}
        ariaLabel={t("battlePanel.navigation.title")}
      >
        <Outlet />
      </PageTabsLayout>
    </div>
  );
};
