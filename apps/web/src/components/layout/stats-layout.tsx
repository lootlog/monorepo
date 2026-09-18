import { useGuildId } from "@/hooks/context/use-guild-id";
import { Outlet, useLocation } from "@tanstack/react-router";
import { HorizontalMenu } from "@/components/layout/horizontal-menu";
import { ROUTE_SEGMENTS } from "@/config/routes";
import { useTranslation } from "react-i18next";

export const StatsLayout = () => {
  const guildId = useGuildId();
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const navigationItems = [
    {
      id: "kills",
      label: t("common.stats.navigation.kills"),
      href: `${ROUTE_SEGMENTS.guild.stats}/kills`,
    },
    {
      id: "loots",
      label: t("common.stats.navigation.loots"),
      href: `${ROUTE_SEGMENTS.guild.stats}/loots`,
    },
    {
      id: "ranking",
      label: t("common.stats.navigation.ranking"),
      href: `${ROUTE_SEGMENTS.guild.stats}/ranking`,
    },
    {
      id: "npcs",
      label: t("common.stats.navigation.npcs"),
      href: `${ROUTE_SEGMENTS.guild.stats}/npcs`,
    },
  ];

  const basePath = `/${guildId}`;
  const normalizedPathname = pathname.replace(/\/$/, "");

  // Member and monster pages are reached from a list, so they keep the back arrow instead.
  const showNavigation = navigationItems.some(
    (item) => `${basePath}${item.href}` === normalizedPathname,
  );

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      {showNavigation && (
        <HorizontalMenu
          items={navigationItems}
          basePath={basePath}
          ariaLabel={t("common.breadcrumbs.stats")}
          className="shrink-0"
        />
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};
