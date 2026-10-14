import { useGuildId } from "@/hooks/context/use-guild-id";
import { Outlet } from "@tanstack/react-router";
import { PageTabsLayout } from "@/components/layout/page-tabs-layout";
import { GuildWorldHeaderSwitcher } from "@/components/layout/guild-world-header-switcher";
import { ROUTE_SEGMENTS } from "@/config/routes";
import { useTranslation } from "react-i18next";

export const StatsLayout = () => {
  const guildId = useGuildId();
  const { t } = useTranslation();

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

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <GuildWorldHeaderSwitcher />
      <PageTabsLayout
        tabs={navigationItems}
        basePath={`/${guildId}`}
        ariaLabel={t("common.breadcrumbs.stats")}
      >
        <Outlet />
      </PageTabsLayout>
    </div>
  );
};
