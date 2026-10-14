import { Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageTabsLayout } from "@/components/layout/page-tabs-layout";
import { ROUTE_SEGMENTS } from "@/config/routes";

export const UserSettingsLayout: React.FC = () => {
  const { t } = useTranslation();

  const navElements = [
    {
      id: "account",
      label: t("settings.account.title"),
      href: `${ROUTE_SEGMENTS.user.settings}${ROUTE_SEGMENTS.user.account}`,
    },
    {
      id: "servers",
      label: t("settings.servers.navigation"),
      href: `${ROUTE_SEGMENTS.user.settings}${ROUTE_SEGMENTS.user.servers}`,
    },
    {
      id: "appearance",
      label: t("settings.appearance.title"),
      href: `${ROUTE_SEGMENTS.user.settings}${ROUTE_SEGMENTS.user.appearance}`,
    },
  ];

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <PageTabsLayout
        tabs={navElements}
        basePath={ROUTE_SEGMENTS.user.base}
        ariaLabel={t("settings.navigationLabel")}
      >
        <Outlet />
      </PageTabsLayout>
    </div>
  );
};
