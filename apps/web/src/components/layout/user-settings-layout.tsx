import { Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { HorizontalMenu } from "@/components/layout/horizontal-menu";
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
    <div className="w-full flex-1 flex flex-col min-h-0 min-w-0">
      <HorizontalMenu
        items={navElements}
        basePath={ROUTE_SEGMENTS.user.base}
        ariaLabel={t("settings.navigationLabel")}
        className="shrink-0 py-3"
      />
      <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};
