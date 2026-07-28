import { useGuildId } from "@/hooks/context/use-guild-id";
import { Outlet, useLocation } from "@tanstack/react-router";
import { HorizontalMenu } from "@/components/layout/horizontal-menu";
import { ROUTE_SEGMENTS } from "@/config/routes";
import { useTranslation } from "react-i18next";

export const StatsLayout: React.FC = () => {
  const guildId = useGuildId();
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const NAV_ELEMENTS = [
    {
      id: "kills",
      label: t("common.stats.kills"),
      href: `${ROUTE_SEGMENTS.guild.stats}/kills`,
    },
    {
      id: "loots",
      label: t("common.stats.loots"),
      href: `${ROUTE_SEGMENTS.guild.stats}/loots`,
    },
  ];

  const basePath = `/${guildId}`;
  const topLevelPaths = NAV_ELEMENTS.map((el) => `${basePath}${el.href}`);
  const showMenu = topLevelPaths.includes(pathname);

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-background">
      {showMenu && (
        <HorizontalMenu
          items={NAV_ELEMENTS}
          basePath={basePath}
          ariaLabel={t("common.breadcrumbs.stats")}
          className="shrink-0 pb-3"
        />
      )}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};
